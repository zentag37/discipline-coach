import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NewsArticle = {
  headline: string;
  source: string;
  publishedAt: string; // ISO
  timeAgo: string;
  url: string;
  instrument: string;
};

const NEWSAPI_QUERY: Record<string, string> = {
  EURUSD: "EUR USD forex",
  GBPUSD: "GBP USD pound",
  USDJPY: "USD JPY yen forex",
  GBPJPY: "GBP JPY forex",
  AUDUSD: "AUD USD aussie",
  USDCAD: "USD CAD loonie",
  GOLD: "gold XAU commodities",
  XAUUSD: "gold XAU commodities",
  NAS100: "nasdaq technology stocks",
  US30: "dow jones stocks",
  SPX500: "s&p 500 stocks",
  BTCUSD: "bitcoin crypto",
  ETHUSD: "ethereum crypto",
  OIL: "crude oil WTI",
};

const YAHOO_SYMBOL: Record<string, string> = {
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "JPY=X",
  GBPJPY: "GBPJPY=X",
  AUDUSD: "AUDUSD=X",
  USDCAD: "CAD=X",
  GOLD: "GC=F",
  XAUUSD: "GC=F",
  NAS100: "^NDX",
  US30: "^DJI",
  SPX500: "^GSPC",
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  OIL: "CL=F",
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function truncate(s: string, n = 80) {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

// Simple in-memory cache (5 min)
type CacheEntry = { at: number; articles: NewsArticle[] };
const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000;

async function fetchFromNewsAPI(symbol: string, apiKey: string): Promise<NewsArticle[]> {
  const q = NEWSAPI_QUERY[symbol] ?? symbol;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=3&apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
  const json = (await res.json()) as { articles?: Array<{ title: string; source?: { name?: string }; publishedAt: string; url: string }> };
  return (json.articles ?? []).slice(0, 3).map((a) => ({
    headline: truncate(a.title || "", 80),
    source: a.source?.name || "News",
    publishedAt: a.publishedAt,
    timeAgo: timeAgo(a.publishedAt),
    url: a.url,
    instrument: symbol,
  }));
}

function decodeEntities(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractTag(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decodeEntities(m[1]).trim() : "";
}

async function fetchFromYahoo(symbol: string): Promise<NewsArticle[]> {
  const ySym = YAHOO_SYMBOL[symbol] ?? symbol;
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ySym)}&region=US&lang=en-US`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const xml = await res.text();
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, 3).map((item) => {
    const title = extractTag(item, "title");
    const link = extractTag(item, "link");
    const pubDate = extractTag(item, "pubDate");
    const iso = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    return {
      headline: truncate(title, 80),
      source: "Yahoo Finance",
      publishedAt: iso,
      timeAgo: timeAgo(iso),
      url: link,
      instrument: symbol,
    };
  });
}

async function fetchForSymbol(symbol: string): Promise<NewsArticle[]> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.at < TTL) return cached.articles;
  const apiKey = process.env.NEWSAPI_KEY;
  let articles: NewsArticle[] = [];
  try {
    articles = apiKey ? await fetchFromNewsAPI(symbol, apiKey) : await fetchFromYahoo(symbol);
  } catch {
    try {
      articles = await fetchFromYahoo(symbol);
    } catch {
      articles = [];
    }
  }
  cache.set(symbol, { at: Date.now(), articles });
  return articles;
}

export const getMarketNews = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ symbols: z.array(z.string().min(1).max(20)).min(1).max(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.symbols.map(async (s) => ({ symbol: s.toUpperCase(), articles: await fetchForSymbol(s.toUpperCase()) })),
    );
    return { results };
  });
