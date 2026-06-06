import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CredsSchema = z.object({
  apiKey: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, "Invalid API key format"),
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
  accountType: z.enum(["demo", "live"]),
});

export const connectIGAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CredsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { igLogin, encrypt, getToken } = await import("./ig.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate credentials by logging in.
    const tok = await igLogin(data);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        ig_api_key_enc: encrypt(data.apiKey) as any,
        ig_username_enc: encrypt(data.username) as any,
        ig_password_enc: encrypt(data.password) as any,
        ig_account_type: data.accountType,
        ig_account_id: tok.accountId,
        ig_connected: true,
        ig_last_connected_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    // Prime cache so dashboard calls don't re-login.
    void getToken;
    return { connected: true, accountId: tok.accountId, accountType: data.accountType };
  });

export const saveIgCredentials = connectIGAccount;

export const getIgStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("ig_connected, ig_account_type, ig_account_id, ig_last_connected_at")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      connected: !!data?.ig_connected,
      accountType: (data?.ig_account_type as "demo" | "live" | null) ?? null,
      accountId: data?.ig_account_id ?? null,
      lastConnectedAt: data?.ig_last_connected_at ?? null,
    };
  });

export const disconnectIg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { clearToken } = await import("./ig.server");
    clearToken(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        ig_api_key_enc: null,
        ig_username_enc: null,
        ig_password_enc: null,
        ig_account_id: null,
        ig_connected: false,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { connected: false };
  });

async function loadCreds(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { decrypt } = await import("./ig.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("ig_api_key_enc, ig_username_enc, ig_password_enc, ig_account_type, ig_connected")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.ig_connected || !data.ig_api_key_enc || !data.ig_username_enc || !data.ig_password_enc) {
    return null;
  }
  return {
    apiKey: decrypt(Buffer.from(data.ig_api_key_enc as any)),
    username: decrypt(Buffer.from(data.ig_username_enc as any)),
    password: decrypt(Buffer.from(data.ig_password_enc as any)),
    accountType: (data.ig_account_type as "demo" | "live") || "demo",
  } as const;
}

export const getIgAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const creds = await loadCreds(context.userId);
    if (!creds) return { connected: false as const };
    try {
      const { igFetch } = await import("./ig.server");
      const data = (await igFetch(context.userId, creds, "/accounts", "1")) as {
        accounts?: Array<{
          accountId: string;
          accountName: string;
          balance: { balance: number; deposit: number; profitLoss: number; available: number };
          currency: string;
          preferred?: boolean;
        }>;
      };
      const primary = data.accounts?.find((a) => a.preferred) ?? data.accounts?.[0];
      if (!primary) return { connected: true as const, error: "No accounts" };
      return {
        connected: true as const,
        accountId: primary.accountId,
        accountName: primary.accountName,
        currency: primary.currency,
        balance: primary.balance.balance,
        available: primary.balance.available,
        deposit: primary.balance.deposit,
        profitLoss: primary.balance.profitLoss,
        usedMargin: primary.balance.deposit - primary.balance.available,
      };
    } catch (e: any) {
      return { connected: true as const, error: e?.message || "IG request failed" };
    }
  });

export const getIgPositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const creds = await loadCreds(context.userId);
    if (!creds) return { connected: false as const, positions: [] };
    try {
      const { igFetch } = await import("./ig.server");
      const data = (await igFetch(context.userId, creds, "/positions", "2")) as {
        positions?: Array<{
          position: { dealId: string; direction: string; size: number; level: number };
          market: { instrumentName: string; epic: string; bid: number; offer: number };
        }>;
      };
      const positions = (data.positions ?? []).map((p) => ({
        dealId: p.position.dealId,
        instrument: p.market.instrumentName,
        epic: p.market.epic,
        direction: p.position.direction,
        size: p.position.size,
        openLevel: p.position.level,
        currentLevel: p.position.direction === "BUY" ? p.market.bid : p.market.offer,
      }));
      return { connected: true as const, positions };
    } catch (e: any) {
      return { connected: true as const, positions: [], error: e?.message || "IG request failed" };
    }
  });
