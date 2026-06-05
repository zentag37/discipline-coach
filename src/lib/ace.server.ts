const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const CLAUDE_MODEL = "claude-sonnet-4-6";

export async function callClaude({
  system,
  user,
  maxTokens,
}: {
  system: string;
  user: string;
  maxTokens: number;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { content: Array<{ type: string; text: string }> };
  return json.content?.find((b) => b.type === "text")?.text?.trim() ?? "";
}

export function parseJsonish<T>(raw: string): T | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export function pctOfAccount(pct: number | string | null | undefined, account: number | string | null | undefined) {
  const p = Number(pct ?? 0);
  const a = Number(account ?? 0);
  if (!p || !a) return 0;
  return Math.round((p / 100) * a);
}

export function buildTraderContext(profile: any, todayTrades: any[]) {
  const name = (profile?.full_name || "Trader").split(" ")[0];
  const acct = Number(profile?.account_size ?? 0);
  const riskPct = Number(profile?.risk_per_trade ?? 1);
  const maxTrades = Number(profile?.max_trades ?? 3);
  const session = profile?.session || "unspecified session";
  const instruments = profile?.instruments || "their instruments";
  const todayPL = todayTrades.reduce((s, t) => s + Number(t.result_dollars || 0), 0);
  const lastEmotion = todayTrades[0]?.emotion || null;
  return {
    name,
    acct,
    riskPct,
    maxTrades,
    session,
    instruments,
    tradesToday: todayTrades.length,
    todayPL,
    lastEmotion,
    summary: `Trader: ${name}. Session: ${session}. Instruments: ${instruments}. Account: €${acct}. Risk/trade: ${riskPct}%. Trades today: ${todayTrades.length}/${maxTrades}. Today P&L: €${todayPL.toFixed(2)}.${lastEmotion ? ` Last emotion: ${lastEmotion}.` : ""}`,
  };
}

export const ACE_SYSTEM_MESSAGE =
  "You are ACE, a professional AI trading mentor. You know this trader personally. Calm, firm, emotionally intelligent, direct. Maximum 4 sentences. Never generic. Always reference their specific numbers and instruments. Combat loneliness. Build consistency.";

export const ACE_SYSTEM_JOURNAL =
  "You are ACE, a trading journal analyst. Write a first-person journal entry as if the trader wrote it. Then add a short ACE coaching note. Respond ONLY as valid JSON: {\"journal_entry\": \"...\", \"ace_note\": \"...\"}. Max 3 sentences journal, max 2 sentences ace_note. Specific to numbers and emotion.";

export const ACE_SYSTEM_WEEKLY =
  "You are ACE, a trading performance analyst. Write a weekly review. Respond ONLY as valid JSON: {\"what_went_well\": \"...\", \"what_needs_work\": \"...\", \"focus_next_week\": \"...\", \"encouragement\": \"...\"}. Max 2 sentences each. Reference actual numbers.";

export const ACE_SYSTEM_CHAT = (ctx: string) =>
  `You are ACE, a professional AI trading mentor. Calm, firm, emotionally intelligent, direct. You know this trader personally. Always reference their specific numbers and instruments. Combat loneliness. Build consistency. Keep responses concise (2-5 sentences typically).\n\nTrader context:\n${ctx}`;
