import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  callClaude,
  parseJsonish,
  buildTraderContext,
  pctOfAccount,
  ACE_SYSTEM_MESSAGE,
  ACE_SYSTEM_JOURNAL,
  ACE_SYSTEM_WEEKLY,
} from "./ace.server";

const today = () => new Date().toISOString().slice(0, 10);

export const aceMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: trades }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .eq("trade_date", today())
        .order("created_at", { ascending: false }),
    ]);
    const ctx = buildTraderContext(profile, trades ?? []);
    const userMsg = `${ctx.summary}\n\nWrite one coaching message for me right now. Reference my exact numbers.`;
    const text = await callClaude({
      system: ACE_SYSTEM_MESSAGE,
      user: userMsg,
      maxTokens: 150,
    });
    return { message: text };
  });

export const aceJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tradeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: trade }, { data: profile }] = await Promise.all([
      supabase.from("trades").select("*").eq("id", data.tradeId).eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    if (!trade) throw new Error("Trade not found");
    const riskDollars = pctOfAccount(profile?.risk_per_trade, profile?.account_size);
    const userMsg = [
      `Instrument: ${trade.instrument}`,
      `Direction: ${trade.direction}`,
      `Entry: ${trade.entry_price ?? "n/a"}`,
      `Exit: ${trade.exit_price ?? "n/a"}`,
      `Result: €${Number(trade.result_dollars ?? 0).toFixed(2)}`,
      `Risk allowed: €${riskDollars} (${profile?.risk_per_trade ?? "?"}% of €${profile?.account_size ?? "?"})`,
      `Session: ${trade.session ?? "?"}`,
      `Emotion: ${trade.emotion ?? "?"}`,
      `Notes: ${trade.notes ?? "(none)"}`,
    ].join("\n");
    const raw = await callClaude({
      system: ACE_SYSTEM_JOURNAL,
      user: userMsg,
      maxTokens: 300,
    });
    const parsed = parseJsonish<{ journal_entry: string; ace_note: string }>(raw);
    if (!parsed) throw new Error("ACE returned invalid JSON");
    const { error } = await supabase
      .from("trades")
      .update({ journal_entry: parsed.journal_entry, ace_note: parsed.ace_note })
      .eq("id", data.tradeId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return parsed;
  });

export const aceWeeklyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const wkStart = monday.toISOString().slice(0, 10);
    const wkEnd = sunday.toISOString().slice(0, 10);

    const [{ data: trades }, { data: profile }] = await Promise.all([
      supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .gte("trade_date", wkStart)
        .lte("trade_date", wkEnd),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    const all = trades ?? [];
    const wins = all.filter((t) => Number(t.result_dollars) > 0);
    const losses = all.filter((t) => Number(t.result_dollars) < 0);
    const net = all.reduce((s, t) => s + Number(t.result_dollars || 0), 0);
    const winRate = all.length ? Math.round((wins.length / all.length) * 100) : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.result_dollars), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + Number(t.result_dollars), 0) / losses.length) : 0;
    const avgRR = avgLoss ? Number((avgWin / avgLoss).toFixed(2)) : 0;
    const instruments = Array.from(new Set(all.map((t) => t.instrument).filter(Boolean))).join(", ") || "n/a";
    const byDay = new Map<string, number>();
    for (const t of all) {
      byDay.set(t.trade_date, (byDay.get(t.trade_date) || 0) + Number(t.result_dollars || 0));
    }
    const sorted = [...byDay.entries()].sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const maxTrades = Number(profile?.max_trades ?? 3);
    const daysOverLimit = [...byDay.keys()].filter((d) => all.filter((t) => t.trade_date === d).length > maxTrades).length;
    const emotionCounts: Record<string, number> = {};
    for (const t of all) if (t.emotion) emotionCounts[t.emotion] = (emotionCounts[t.emotion] || 0) + 1;

    const userMsg = [
      `Week: ${wkStart} → ${wkEnd}`,
      `Total trades: ${all.length} (${wins.length}W / ${losses.length}L)`,
      `Win rate: ${winRate}%`,
      `Avg R:R: ${avgRR}`,
      `Net P&L: €${net.toFixed(2)}`,
      `Instruments: ${instruments}`,
      `Emotions: ${JSON.stringify(emotionCounts)}`,
      `Best day: ${best ? `${best[0]} (€${best[1].toFixed(2)})` : "n/a"}`,
      `Worst day: ${worst ? `${worst[0]} (€${worst[1].toFixed(2)})` : "n/a"}`,
      `Days over trade limit (${maxTrades}): ${daysOverLimit}`,
    ].join("\n");

    const raw = await callClaude({
      system: ACE_SYSTEM_WEEKLY,
      user: userMsg,
      maxTokens: 500,
    });
    const parsed = parseJsonish<{
      what_went_well: string;
      what_needs_work: string;
      focus_next_week: string;
      encouragement: string;
    }>(raw);
    if (!parsed) throw new Error("ACE returned invalid JSON");

    const { data: inserted, error } = await supabase
      .from("journal_reviews")
      .insert({
        user_id: userId,
        week_start: wkStart,
        week_end: wkEnd,
        total_trades: all.length,
        wins: wins.length,
        losses: losses.length,
        win_rate: winRate,
        avg_rr: avgRR,
        net_pnl: net,
        focus_next_week: parsed.focus_next_week,
        ace_review: JSON.stringify(parsed),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { review: parsed, row: inserted };
  });

export const getLatestWeeklyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const wkStart = monday.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("journal_reviews")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", wkStart)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.ace_review) return null;
    const parsed = parseJsonish<{
      what_went_well: string;
      what_needs_work: string;
      focus_next_week: string;
      encouragement: string;
    }>(data.ace_review);
    return parsed ? { review: parsed, row: data } : null;
  });
