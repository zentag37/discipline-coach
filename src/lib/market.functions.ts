import { createServerFn } from "@tanstack/react-start";

// Map our display symbols to TwelveData symbols.
// QQQ used as Nasdaq-100 proxy (NDX requires paid tier).
const SYMBOL_MAP: Record<string, string> = {
  EURUSD: "EUR/USD",
  GOLD: "XAU/USD",
  NAS100: "QQQ",
};

export type LiveQuote = {
  symbol: string;
  price: number;
  change: number; // percent
  pivots: { label: string; price: number; type: "R" | "S" | "PP" }[];
  trend: { tf: string; dir: "Bullish" | "Bearish" | "Neutral"; strength: number }[];
  updatedAt: string;
  error?: string;
};

function classicPivots(high: number, low: number, close: number) {
  const pp = (high + low + close) / 3;
  const r1 = 2 * pp - low;
  const s1 = 2 * pp - high;
  const r2 = pp + (high - low);
  const s2 = pp - (high - low);
  const r3 = high + 2 * (pp - low);
  const s3 = low - 2 * (high - pp);
  const round = (n: number) => Number(n.toFixed(n < 10 ? 4 : 2));
  return [
    { label: "R3", price: round(r3), type: "R" as const },
    { label: "R2", price: round(r2), type: "R" as const },
    { label: "R1", price: round(r1), type: "R" as const },
    { label: "PP", price: round(pp), type: "PP" as const },
    { label: "S1", price: round(s1), type: "S" as const },
    { label: "S2", price: round(s2), type: "S" as const },
    { label: "S3", price: round(s3), type: "S" as const },
  ];
}

function trendFromSeries(values: { close: string }[]) {
  // values arrive newest-first from TwelveData
  if (values.length < 6) {
    return [
      { tf: "1H", dir: "Neutral" as const, strength: 50 },
      { tf: "4H", dir: "Neutral" as const, strength: 50 },
      { tf: "D1", dir: "Neutral" as const, strength: 50 },
    ];
  }
  const closes = values.map((v) => Number(v.close));
  const score = (lookback: number) => {
    const now = closes[0];
    const past = closes[Math.min(lookback, closes.length - 1)];
    const pct = ((now - past) / past) * 100;
    const dir = pct > 0.1 ? "Bullish" : pct < -0.1 ? "Bearish" : "Neutral";
    const strength = Math.min(95, Math.max(35, Math.round(50 + Math.abs(pct) * 8)));
    return { dir: dir as "Bullish" | "Bearish" | "Neutral", strength };
  };
  const a = score(1);
  const b = score(4);
  const c = score(20);
  return [
    { tf: "1H", dir: a.dir, strength: a.strength },
    { tf: "4H", dir: b.dir, strength: b.strength },
    { tf: "D1", dir: c.dir, strength: c.strength },
  ];
}

async function fetchSymbol(displaySymbol: string, apiKey: string): Promise<LiveQuote> {
  const td = SYMBOL_MAP[displaySymbol] ?? displaySymbol;
  const empty: LiveQuote = {
    symbol: displaySymbol,
    price: 0,
    change: 0,
    pivots: [],
    trend: [],
    updatedAt: new Date().toISOString(),
  };
  try {
    const [quoteRes, seriesRes] = await Promise.all([
      fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(td)}&apikey=${apiKey}`),
      fetch(
        `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(td)}&interval=1h&outputsize=24&apikey=${apiKey}`,
      ),
    ]);
    const quote = await quoteRes.json();
    const series = await seriesRes.json();

    if (quote.status === "error" || quote.code) {
      return { ...empty, error: quote.message || "Quote unavailable" };
    }

    const price = Number(quote.close);
    const change = Number(quote.percent_change);
    const prevHigh = Number(quote.fifty_two_week?.high ?? quote.high);
    // TwelveData /quote.high / .low are today's; previous_close is yesterday's close.
    // For pivots prefer previous day OHLC via /time_series interval=1day if available; fall back to today's H/L.
    const high = Number(quote.high);
    const low = Number(quote.low);
    const prevClose = Number(quote.previous_close);
    const pivots = classicPivots(high || price, low || price, prevClose || price);

    const trend = Array.isArray(series.values) ? trendFromSeries(series.values) : empty.trend;

    return {
      symbol: displaySymbol,
      price,
      change,
      pivots,
      trend: trend.length
        ? trend
        : [
            { tf: "1H", dir: "Neutral", strength: 50 },
            { tf: "4H", dir: "Neutral", strength: 50 },
            { tf: "D1", dir: "Neutral", strength: 50 },
          ],
      updatedAt: new Date().toISOString(),
    };
    // unused to silence ts
    void prevHigh;
  } catch (e) {
    return { ...empty, error: (e as Error).message };
  }
}

export const getLiveQuotes = createServerFn({ method: "GET" })
  .inputValidator((data: { symbols: string[] }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) {
      return { quotes: [] as LiveQuote[], error: "TwelveData API key not configured" };
    }
    const quotes = await Promise.all(data.symbols.map((s) => fetchSymbol(s, apiKey)));
    return { quotes, error: null as string | null };
  });
