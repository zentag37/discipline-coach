import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_URL = "https://api.twelvedata.com";

const SYMBOL_MAP: Record<string, string> = {
  EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY", GBPJPY: "GBP/JPY",
  AUDUSD: "AUD/USD", USDCAD: "USD/CAD", NAS100: "NDX", US30: "DJI", SPX500: "SPX",
  GOLD: "XAU/USD", SILVER: "XAG/USD", OIL: "WTI/USD", BTCUSD: "BTC/USD", ETHUSD: "ETH/USD",
};
const FX_SUFFIXES = ["USD", "JPY", "EUR", "GBP", "AUD", "CAD", "CHF", "NZD"];
function toTd(display: string): string {
  if (SYMBOL_MAP[display]) return SYMBOL_MAP[display];
  if (display.length === 6 && FX_SUFFIXES.includes(display.slice(3))) {
    return `${display.slice(0, 3)}/${display.slice(3)}`;
  }
  return display;
}
function decimalsFor(display: string, price: number): number {
  if (display.length === 6 && FX_SUFFIXES.includes(display.slice(3))) {
    return display.endsWith("JPY") ? 3 : 4;
  }
  if (display === "BTCUSD" || display === "ETHUSD") return 2;
  if (price < 10) return 4;
  return 2;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses += Math.abs(d);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? Math.abs(d) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
function calcEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
  return ema;
}
function calcMACD(closes: number[]): number {
  return calcEMA(closes, 12) - calcEMA(closes, 26);
}
function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ));
  }
  const slice = trs.slice(-period);
  if (!slice.length) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export type AceSignal = {
  id?: string;
  instrument: string;
  direction: "BUY" | "SELL";
  confidence: number;
  reasons: string[];
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  rr: string;
  rsi: string;
  timeframe: string;
  decimals: number;
  generatedAt: string;
};

type Candle = { datetime: string; high: string; low: string; close: string };

function generateSignal(instrument: string, candles: Candle[]): AceSignal | null {
  if (!candles || candles.length < 30) return null;
  // TwelveData returns newest first → reverse to chronological
  const c = candles.slice().reverse();
  const closes = c.map((x) => parseFloat(x.close)).filter(Number.isFinite);
  const highs = c.map((x) => parseFloat(x.high));
  const lows = c.map((x) => parseFloat(x.low));
  if (closes.length < 30) return null;

  const rsi = calcRSI(closes);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const macd = calcMACD(closes);
  const price = closes[closes.length - 1];
  const atr = calcATR(highs, lows, closes, 14);
  if (!atr || !Number.isFinite(atr)) return null;

  let signal: "BUY" | "SELL" | null = null;
  let confidence = 0;
  const reasons: string[] = [];

  if (rsi < 45 && ema20 > ema50 && macd > 0 && price > ema20) {
    signal = "BUY";
    if (rsi < 40) { confidence += 30; reasons.push("RSI oversold"); }
    if (ema20 > ema50) { confidence += 30; reasons.push("EMA bullish cross"); }
    if (macd > 0) { confidence += 20; reasons.push("MACD positive"); }
    if (price > ema20) { confidence += 20; reasons.push("Price above EMA20"); }
  } else if (rsi > 55 && ema20 < ema50 && macd < 0 && price < ema20) {
    signal = "SELL";
    if (rsi > 60) { confidence += 30; reasons.push("RSI overbought"); }
    if (ema20 < ema50) { confidence += 30; reasons.push("EMA bearish cross"); }
    if (macd < 0) { confidence += 20; reasons.push("MACD negative"); }
    if (price < ema20) { confidence += 20; reasons.push("Price below EMA20"); }
  }
  if (!signal) return null;

  const stopDist = atr * 1.5;
  const t1Dist = atr * 2;
  const t2Dist = atr * 3.5;
  const decimals = decimalsFor(instrument, price);
  const r = (n: number) => Number(n.toFixed(decimals));

  return {
    instrument,
    direction: signal,
    confidence,
    reasons,
    entry: r(price),
    stopLoss: r(signal === "BUY" ? price - stopDist : price + stopDist),
    target1: r(signal === "BUY" ? price + t1Dist : price - t1Dist),
    target2: r(signal === "BUY" ? price + t2Dist : price - t2Dist),
    rr: (t1Dist / stopDist).toFixed(1),
    rsi: rsi.toFixed(1),
    timeframe: "1H",
    decimals,
    generatedAt: new Date().toISOString(),
  };
}

async function fetchCandles(tdSymbol: string, apiKey: string): Promise<Candle[]> {
  const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=1h&outputsize=100&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as { values?: Candle[]; status?: string };
    if (json.status === "error" || !json.values) return [];
    return json.values;
  } catch {
    return [];
  }
}

export const getAceSignals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { symbols: string[] }) => ({
    symbols: (data.symbols || []).map((s) => String(s).toUpperCase().trim()).filter(Boolean).slice(0, 10),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) return { signals: [] as AceSignal[], history: [] as any[], error: "API key not configured" };

    // Fetch existing active signals (last 15 minutes) to dedupe.
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentActive } = await supabase
      .from("signals")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("created_at", fifteenMinAgo);

    const recentBySym = new Map<string, any>();
    (recentActive || []).forEach((r: any) => recentBySym.set(`${r.instrument}-${r.direction}`, r));

    const fresh: AceSignal[] = [];
    await Promise.all(
      data.symbols.map(async (sym) => {
        const candles = await fetchCandles(toTd(sym), apiKey);
        const sig = generateSignal(sym, candles);
        if (sig && sig.confidence >= 60) fresh.push(sig);
      }),
    );

    // Insert new signals (skip if already an active one in last 15 min for same instrument+direction)
    const toInsert = fresh.filter((s) => !recentBySym.has(`${s.instrument}-${s.direction}`));
    if (toInsert.length) {
      const rows = toInsert.map((s) => ({
        user_id: userId,
        instrument: s.instrument,
        direction: s.direction,
        entry_price: s.entry,
        stop_loss: s.stopLoss,
        target1: s.target1,
        target2: s.target2,
        confidence: s.confidence,
        reasons: s.reasons,
        timeframe: s.timeframe,
        rr: Number(s.rr),
        rsi: Number(s.rsi),
        status: "active",
      }));
      await supabase.from("signals").insert(rows);
    }

    // Re-read active signals after insert
    const { data: activeRows } = await supabase
      .from("signals")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const activeSignals: AceSignal[] = (activeRows || []).map((r: any) => ({
      id: r.id,
      instrument: r.instrument,
      direction: r.direction,
      confidence: r.confidence,
      reasons: r.reasons || [],
      entry: Number(r.entry_price),
      stopLoss: Number(r.stop_loss),
      target1: Number(r.target1),
      target2: Number(r.target2),
      rr: String(r.rr ?? ""),
      rsi: String(r.rsi ?? ""),
      timeframe: r.timeframe || "1H",
      decimals: decimalsFor(r.instrument, Number(r.entry_price)),
      generatedAt: r.created_at,
    }));

    // History — last 20 of all statuses
    const { data: historyRows } = await supabase
      .from("signals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return { signals: activeSignals, history: historyRows || [], error: null as string | null };
  });

export const updateSignalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; followed?: boolean; status?: string; outcome?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: { followed?: boolean; status?: string; outcome?: string } = {};
    if (data.followed !== undefined) patch.followed = data.followed;
    if (data.status) patch.status = data.status;
    if (data.outcome) patch.outcome = data.outcome;
    const { error } = await supabase.from("signals").update(patch).eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
