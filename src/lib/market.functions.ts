import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_URL = "https://api.twelvedata.com";

const SYMBOL_MAP: Record<string, string> = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  GBPJPY: "GBP/JPY",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  NAS100: "NDX",
  US30: "DJI",
  SPX500: "SPX",
  GOLD: "XAU/USD",
  SILVER: "XAG/USD",
  OIL: "WTI/USD",
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
};

const FOREX_SUFFIXES = ["USD", "JPY", "EUR", "GBP", "AUD", "CAD", "CHF", "NZD"];
function looksLikeForex(display: string): boolean {
  if (display.length !== 6) return false;
  const quote = display.slice(3);
  return FOREX_SUFFIXES.includes(quote);
}
function toTd(display: string): string {
  if (SYMBOL_MAP[display]) return SYMBOL_MAP[display];
  if (looksLikeForex(display)) return `${display.slice(0, 3)}/${display.slice(3)}`;
  return display;
}

export type TrendPoint = { tf: string; dir: "Bullish" | "Bearish" | "Neutral"; strength: number };
export type Pivot = { label: string; price: number; type: "R" | "S" | "PP" };

export type LiveQuote = {
  symbol: string; // display symbol
  tdSymbol: string;
  price: number;
  change: number; // percent
  decimals: number;
  trend: TrendPoint[];
  pivots: Pivot[];
  updatedAt: string;
  error?: string;
};

// ---------- math ----------
function calculateEMA(prices: number[], period: number): number[] {
  if (!prices.length) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function trendFromCloses(closes: number[]): { dir: TrendPoint["dir"]; strength: number } {
  if (closes.length < 20) return { dir: "Neutral", strength: 50 };
  const ema10 = calculateEMA(closes, 10);
  const ema20 = calculateEMA(closes, 20);
  const a = ema10[ema10.length - 1];
  const b = ema20[ema20.length - 1];
  if (!b) return { dir: "Neutral", strength: 50 };
  const diff = ((a - b) / b) * 100;
  if (diff > 0.1) return { dir: "Bullish", strength: Math.min(95, Math.round(50 + diff * 10)) };
  if (diff < -0.1) return { dir: "Bearish", strength: Math.min(95, Math.round(50 + Math.abs(diff) * 10)) };
  return { dir: "Neutral", strength: 50 };
}

function classicPivots(high: number, low: number, close: number, decimals: number): Pivot[] {
  const pp = (high + low + close) / 3;
  const r1 = 2 * pp - low;
  const s1 = 2 * pp - high;
  const r2 = pp + (high - low);
  const s2 = pp - (high - low);
  const r3 = high + 2 * (pp - low);
  const s3 = low - 2 * (high - pp);
  const r = (n: number) => Number(n.toFixed(decimals));
  return [
    { label: "R3", price: r(r3), type: "R" },
    { label: "R2", price: r(r2), type: "R" },
    { label: "R1", price: r(r1), type: "R" },
    { label: "PP", price: r(pp), type: "PP" },
    { label: "S1", price: r(s1), type: "S" },
    { label: "S2", price: r(s2), type: "S" },
    { label: "S3", price: r(s3), type: "S" },
  ];
}

function decimalsFor(display: string, price: number): number {
  if (looksLikeForex(display)) return display.endsWith("JPY") ? 3 : 4;
  if (display === "BTCUSD" || display === "ETHUSD") return 2;
  if (price < 10) return 4;
  return 2;
}

// ---------- in-memory cache (per worker instance) ----------
type CacheEntry = { at: number; quote: LiveQuote };
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

// ---------- TwelveData fetchers ----------
type Series = { values?: { datetime: string; high: string; low: string; close: string }[]; status?: string; message?: string };

async function fetchSeries(tdSymbol: string, interval: string, outputsize: number, apiKey: string): Promise<Series> {
  const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;
  const res = await fetch(url);
  return (await res.json()) as Series;
}

async function buildQuote(
  display: string,
  quoteJson: Record<string, unknown>,
  apiKey: string,
): Promise<LiveQuote> {
  const tdSymbol = toTd(display);
  const updatedAt = new Date().toISOString();

  // Quote-level error
  if (!quoteJson || (quoteJson as { status?: string }).status === "error" || (quoteJson as { code?: number }).code) {
    return {
      symbol: display,
      tdSymbol,
      price: 0,
      change: 0,
      decimals: decimalsFor(display, 1),
      trend: [],
      pivots: [],
      updatedAt,
      error: (quoteJson as { message?: string })?.message || "Quote unavailable",
    };
  }

  const price = Number(quoteJson.close);
  const change = Number(quoteJson.percent_change);
  const decimals = decimalsFor(display, price);

  // Pull series in parallel
  const [h1, h4, d1] = await Promise.all([
    fetchSeries(tdSymbol, "1h", 50, apiKey),
    fetchSeries(tdSymbol, "4h", 50, apiKey),
    fetchSeries(tdSymbol, "1day", 2, apiKey),
  ]);

  // Trends — TwelveData returns newest-first; reverse so EMA reads chronologically
  const closes = (vals: Series["values"]) =>
    (vals || []).slice().reverse().map((v) => Number(v.close)).filter((n) => Number.isFinite(n));
  const t1 = trendFromCloses(closes(h1.values));
  const t4 = trendFromCloses(closes(h4.values));
  const tD = trendFromCloses(closes(d1.values));

  // Pivots from YESTERDAY's daily candle (index 1 = previous day, since 0 is today/forming)
  let pivots: Pivot[] = [];
  if (d1.values && d1.values.length >= 2) {
    const y = d1.values[1];
    const h = Number(y.high);
    const l = Number(y.low);
    const c = Number(y.close);
    if ([h, l, c].every(Number.isFinite)) pivots = classicPivots(h, l, c, decimals);
  } else if (d1.values && d1.values.length === 1) {
    const y = d1.values[0];
    pivots = classicPivots(Number(y.high), Number(y.low), Number(y.close), decimals);
  } else {
    // Fall back to today's quote H/L if series unavailable
    const h = Number(quoteJson.high);
    const l = Number(quoteJson.low);
    const c = Number(quoteJson.previous_close ?? price);
    if ([h, l, c].every(Number.isFinite)) pivots = classicPivots(h, l, c, decimals);
  }

  return {
    symbol: display,
    tdSymbol,
    price,
    change,
    decimals,
    trend: [
      { tf: "1H", dir: t1.dir, strength: t1.strength },
      { tf: "4H", dir: t4.dir, strength: t4.strength },
      { tf: "D1", dir: tD.dir, strength: tD.strength },
    ],
    pivots,
    updatedAt,
  };
}

// ---------- exported server function ----------
export const getLiveQuotes = createServerFn({ method: "GET" })
  .inputValidator((data: { symbols: string[] }) => ({
    symbols: (data.symbols || []).map((s) => s.toUpperCase().trim()).filter(Boolean).slice(0, 10),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) {
      return { quotes: [] as LiveQuote[], error: "TwelveData API key not configured" as string | null };
    }
    const now = Date.now();

    // 1. Serve from cache where fresh
    const result: Record<string, LiveQuote> = {};
    const toFetch: string[] = [];
    for (const sym of data.symbols) {
      const hit = cache.get(sym);
      if (hit && now - hit.at < CACHE_TTL_MS) {
        result[sym] = hit.quote;
      } else {
        toFetch.push(sym);
      }
    }

    // 2. Batched /quote for symbols we need
    if (toFetch.length) {
      try {
        const tdSymbols = toFetch.map(toTd).join(",");
        const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(tdSymbols)}&apikey=${apiKey}`;
        const res = await fetch(url);
        const json = (await res.json()) as Record<string, unknown>;

        // Single-symbol responses are flat; multi-symbol responses are keyed by td symbol
        const perSymbol: Record<string, Record<string, unknown>> = {};
        if (toFetch.length === 1) {
          perSymbol[toTd(toFetch[0])] = json;
        } else {
          for (const sym of toFetch) {
            const key = toTd(sym);
            const entry = (json as Record<string, unknown>)[key];
            if (entry && typeof entry === "object") {
              perSymbol[key] = entry as Record<string, unknown>;
            } else {
              perSymbol[key] = { status: "error", message: "Symbol not returned" };
            }
          }
        }

        // 3. Build full quote (with trend + pivots) per symbol in parallel
        const built = await Promise.all(
          toFetch.map((sym) => buildQuote(sym, perSymbol[toTd(sym)] || {}, apiKey)),
        );
        for (const q of built) {
          result[q.symbol] = q;
          if (!q.error) cache.set(q.symbol, { at: now, quote: q });
        }
      } catch (e) {
        // Mark all requested but missing as errored
        for (const sym of toFetch) {
          if (!result[sym]) {
            result[sym] = {
              symbol: sym,
              tdSymbol: toTd(sym),
              price: 0,
              change: 0,
              decimals: decimalsFor(sym, 1),
              trend: [],
              pivots: [],
              updatedAt: new Date().toISOString(),
              error: (e as Error).message || "Network error",
            };
          }
        }
      }
    }

    const quotes = data.symbols.map((s) => result[s]).filter(Boolean);
    return { quotes, error: null as string | null };
  });
