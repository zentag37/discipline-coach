import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const PLAN_PRICE: Record<string, number> = { solo: 0, pro: 29, elite: 99 };

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { userId } = context as { userId: string };
    const { data, error } = await supabaseAdmin
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw new Error("Forbidden: admin only");
    return next({ context: { adminId: userId } });
  });

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const { data } = await supabaseAdmin
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data, userId };
  });

export const getOverviewStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartIso = monthStart.toISOString();

    const [
      { count: totalUsers },
      { data: activeToday },
      { data: profiles },
      { data: tradesToday },
      { count: churnCount },
      { data: signups30 },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("sessions").select("user_id").eq("session_date", today),
      supabaseAdmin.from("profiles").select("plan, subscription_status"),
      supabaseAdmin.from("trades").select("id", { count: "exact" }).eq("trade_date", today),
      supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "cancelled")
        .gte("updated_at", monthStartIso),
      supabaseAdmin
        .from("profiles")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
    ]);

    const planCounts: Record<string, number> = { solo: 0, pro: 0, elite: 0 };
    let mrr = 0;
    (profiles || []).forEach((p: any) => {
      const plan = (p.plan || "solo").toLowerCase();
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      if (p.subscription_status === "active") mrr += PLAN_PRICE[plan] || 0;
    });

    // build last 30 days signup buckets
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      buckets[d] = 0;
    }
    (signups30 || []).forEach((s: any) => {
      const d = (s.created_at as string).slice(0, 10);
      if (d in buckets) buckets[d]++;
    });

    return {
      totalUsers: totalUsers ?? 0,
      activeToday: new Set((activeToday || []).map((s: any) => s.user_id)).size,
      monthlyRevenue: mrr,
      churnThisMonth: churnCount ?? 0,
      planCounts,
      tradesToday: tradesToday?.length ?? 0,
      signupsByDay: Object.entries(buckets).map(([date, count]) => ({ date: date.slice(5), count })),
    };
  });

export const getRecentSignups = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, plan, subscription_status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    const ids = (data || []).map((p) => p.id);
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const emailMap = new Map<string, string>();
    users?.users?.forEach((u) => emailMap.set(u.id, u.email ?? ""));
    return (data || []).map((p) => ({ ...p, email: emailMap.get(p.id) ?? "" }));
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const [{ data: profiles }, { data: users }, { data: trades }, { data: sessions }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 500 }),
      supabaseAdmin.from("trades").select("user_id"),
      supabaseAdmin.from("sessions").select("user_id, session_date"),
    ]);
    const emails = new Map(users?.users?.map((u) => [u.id, u.email ?? ""]) ?? []);
    const tradeCount = new Map<string, number>();
    (trades || []).forEach((t: any) => tradeCount.set(t.user_id, (tradeCount.get(t.user_id) || 0) + 1));
    const lastActive = new Map<string, string>();
    (sessions || []).forEach((s: any) => {
      const cur = lastActive.get(s.user_id);
      if (!cur || s.session_date > cur) lastActive.set(s.user_id, s.session_date);
    });
    return (profiles || []).map((p) => ({
      ...p,
      email: emails.get(p.id) ?? "",
      trade_count: tradeCount.get(p.id) ?? 0,
      last_active: lastActive.get(p.id) ?? null,
    }));
  });

export const getUserDetail = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const [{ data: profile }, { data: trades }, { data: sessions }, { data: user }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabaseAdmin.from("trades").select("*").eq("user_id", data.userId).order("trade_date", { ascending: false }).limit(5),
      supabaseAdmin.from("sessions").select("*").eq("user_id", data.userId),
      supabaseAdmin.auth.admin.getUserById(data.userId),
    ]);
    const allTrades = trades || [];
    const wins = allTrades.filter((t: any) => Number(t.result_dollars) > 0).length;
    const winRate = allTrades.length ? Math.round((wins / allTrades.length) * 100) : 0;
    return {
      profile,
      email: user?.user?.email ?? "",
      recentTrades: allTrades,
      stats: {
        totalTrades: allTrades.length,
        winRate,
        daysActive: new Set((sessions || []).map((s: any) => s.session_date)).size,
      },
    };
  });

export const updateUserPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; plan: string }) =>
    z.object({ userId: z.string().uuid(), plan: z.enum(["solo", "pro", "elite"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("profiles").update({ plan: data.plan }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_logs" as any).insert({
      admin_id: (context as any).adminId,
      action: "change_plan",
      target_user_id: data.userId,
      details: { plan: data.plan },
    });
    return { ok: true };
  });

export const getSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    const [{ data: profiles }, { data: users }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, plan, subscription_status, stripe_subscription_id, created_at, updated_at"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 500 }),
    ]);
    const emails = new Map(users?.users?.map((u) => [u.id, u.email ?? ""]) ?? []);
    const rows = (profiles || []).map((p) => ({
      ...p,
      email: emails.get(p.id) ?? "",
      amount: PLAN_PRICE[(p.plan || "solo").toLowerCase()] || 0,
    }));
    const active = rows.filter((r) => r.subscription_status === "active");
    const mrr = active.reduce((s, r) => s + r.amount, 0);
    const cancelledThisMonth = rows.filter(
      (r) => r.subscription_status === "cancelled" && new Date(r.updated_at) >= monthStart,
    ).length;
    return {
      rows,
      summary: {
        mrr,
        arr: mrr * 12,
        activeCount: active.length,
        cancelledThisMonth,
        failedPayments: rows.filter((r) => r.subscription_status === "past_due").length,
      },
    };
  });

export const getActivity = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: trades }, { data: sessions }, { count: totalTrades }, { data: tradesToday }] = await Promise.all([
      supabaseAdmin
        .from("trades")
        .select("id, user_id, instrument, direction, result_dollars, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("sessions")
        .select("id, user_id, limit_hit, opened_at, closed_at, trades_taken")
        .order("opened_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("trades").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("trades").select("user_id, instrument").eq("trade_date", today),
    ]);

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name");
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || "User"]));
    const initials = (n: string) =>
      n.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "U";

    const feed: { id: string; text: string; time: string }[] = [];
    (trades || []).forEach((t: any) => {
      feed.push({
        id: `t-${t.id}`,
        text: `${initials(nameMap.get(t.user_id) || "U")} logged a ${t.instrument || "trade"} ${t.direction || ""} ${
          t.result_dollars != null ? (Number(t.result_dollars) >= 0 ? "+" : "") + "$" + Number(t.result_dollars).toFixed(0) : ""
        }`.trim(),
        time: t.created_at,
      });
    });
    (sessions || []).forEach((s: any) => {
      if (s.limit_hit)
        feed.push({
          id: `s-${s.id}`,
          text: `${initials(nameMap.get(s.user_id) || "U")} hit daily loss limit — session ended`,
          time: s.opened_at,
        });
    });
    feed.sort((a, b) => (a.time < b.time ? 1 : -1));

    // most active user / instrument today
    const userToday: Record<string, number> = {};
    const instrToday: Record<string, number> = {};
    (tradesToday || []).forEach((t: any) => {
      userToday[t.user_id] = (userToday[t.user_id] || 0) + 1;
      if (t.instrument) instrToday[t.instrument] = (instrToday[t.instrument] || 0) + 1;
    });
    const topUserId = Object.entries(userToday).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topInstr = Object.entries(instrToday).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      totalTrades: totalTrades ?? 0,
      tradesToday: (tradesToday || []).length,
      mostActiveUser: topUserId ? nameMap.get(topUserId) || "—" : "—",
      mostTradedInstrument: topInstr || "—",
      feed: feed.slice(0, 50),
    };
  });

export const getAceUsage = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    const [{ data: journals, count: journalCount }, { count: reviewCount }, { data: voiceProfiles }, { data: tradesMonth }] =
      await Promise.all([
        supabaseAdmin
          .from("trades")
          .select("user_id", { count: "exact" })
          .not("journal_entry", "is", null),
        supabaseAdmin.from("journal_reviews").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("profiles").select("id, full_name, voice_enabled"),
        supabaseAdmin
          .from("trades")
          .select("id")
          .gte("created_at", monthStart.toISOString())
          .not("journal_entry", "is", null),
      ]);

    const perUser: Record<string, number> = {};
    (journals || []).forEach((j: any) => (perUser[j.user_id] = (perUser[j.user_id] || 0) + 1));

    const { data: reviewsByUser } = await supabaseAdmin.from("journal_reviews").select("user_id");
    const revPerUser: Record<string, number> = {};
    (reviewsByUser || []).forEach((r: any) => (revPerUser[r.user_id] = (revPerUser[r.user_id] || 0) + 1));

    const nameMap = new Map((voiceProfiles || []).map((p: any) => [p.id, p]));
    const top = Object.entries(perUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([uid, count]) => ({
        user_id: uid,
        name: (nameMap.get(uid) as any)?.full_name || "User",
        journals: count,
        reviews: revPerUser[uid] || 0,
        voice_enabled: !!(nameMap.get(uid) as any)?.voice_enabled,
      }));

    return {
      totalMessages: journalCount ?? 0,
      totalReviews: reviewCount ?? 0,
      voiceUsers: (voiceProfiles || []).filter((p: any) => p.voice_enabled).length,
      apiCostEstimate: ((tradesMonth || []).length * 0.003).toFixed(2),
      topUsers: top,
    };
  });

export const getAppSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("app_settings" as any).select("*").eq("id", 1).maybeSingle();
    return data;
  });

export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: any) =>
    z
      .object({
        maintenance_mode: z.boolean().optional(),
        announcement_enabled: z.boolean().optional(),
        announcement_text: z.string().max(500).optional(),
        default_plan: z.enum(["solo", "pro", "elite"]).optional(),
        feature_pdf_reports: z.boolean().optional(),
        feature_prop_team: z.boolean().optional(),
        feature_api_access: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("app_settings" as any)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_logs" as any).insert({
      admin_id: (context as any).adminId,
      action: "update_settings",
      details: data,
    });
    return { ok: true };
  });
