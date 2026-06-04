import { useEffect, useState } from "react";

type Category = "all" | "forex" | "crypto" | "stocks";

type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  content?: string;
  thumbnail?: string;
  enclosure?: { link?: string };
  author?: string;
};

type Rss2JsonResp = {
  status: string;
  feed?: { title?: string; link?: string };
  items?: RssItem[];
  message?: string;
};

const TEAL = "#00d4a0";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_SANS = "Inter, sans-serif";

const FEEDS: Record<Category, { url: string; source: string }[]> = {
  all: [
    { url: "https://www.forexlive.com/feed/news", source: "ForexLive" },
    { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
    { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC", source: "Yahoo Finance" },
  ],
  forex: [{ url: "https://www.forexlive.com/feed/news", source: "ForexLive" }],
  crypto: [{ url: "https://cointelegraph.com/rss", source: "Cointelegraph" }],
  stocks: [{ url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC", source: "Yahoo Finance" }],
};

const TABS: { label: string; value: Category }[] = [
  { label: "All", value: "all" },
  { label: "Forex", value: "forex" },
  { label: "Crypto", value: "crypto" },
  { label: "Stocks", value: "stocks" },
];

type NewsItem = {
  id: string;
  title: string;
  source: string;
  link: string;
  pubDateMs: number;
  description: string;
  thumbnail?: string;
};

function timeAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item: RssItem): string | undefined {
  if (item.thumbnail) return item.thumbnail;
  if (item.enclosure?.link) return item.enclosure.link;
  const html = item.content || item.description || "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

async function loadFeed(url: string, source: string): Promise<NewsItem[]> {
  const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
  const res = await fetch(api);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: Rss2JsonResp = await res.json();
  if (data.status !== "ok" || !data.items) throw new Error(data.message || "Feed error");
  return data.items.map((it, idx) => ({
    id: `${source}-${idx}-${it.link}`,
    title: stripHtml(it.title || ""),
    source,
    link: it.link,
    pubDateMs: it.pubDate ? new Date(it.pubDate).getTime() || Date.now() : Date.now(),
    description: stripHtml(it.description || it.content || ""),
    thumbnail: extractImage(it),
  }));
}

export function FinnhubNewsFeed() {
  const [tabIdx, setTabIdx] = useState(0);
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const category = TABS[tabIdx].value;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const feeds = FEEDS[category];
        const results = await Promise.allSettled(feeds.map((f) => loadFeed(f.url, f.source)));
        const merged = results
          .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
          .flatMap((r) => r.value)
          .sort((a, b) => b.pubDateMs - a.pubDateMs)
          .slice(0, 20);
        if (cancelled) return;
        if (merged.length === 0) throw new Error("No items returned");
        setItems(merged);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message || "Failed to load news");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [category]);

  return (
    <div
      className="p-5 rounded-[12px]"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-widest" style={{ color: TEAL }}>
            MARKET NEWS
          </div>
          <div className="text-[11px]" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
            Live feed · refreshes every 5 min
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          {TABS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTabIdx(i)}
              className="px-3 py-1 text-[11px] rounded transition-colors"
              style={{
                background: tabIdx === i ? TEAL : "transparent",
                color: tabIdx === i ? "#0d0f12" : "#9ca3af",
                fontFamily: FONT_SANS,
                fontWeight: tabIdx === i ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !items && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded animate-pulse"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-20 h-20 rounded shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                <div className="h-2 w-full rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="h-2 w-1/2 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div
          className="p-4 rounded text-[12px]"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            fontFamily: FONT_SANS,
          }}
        >
          Failed to load market news: {error}
        </div>
      )}

      {!loading && !error && items && items.length === 0 && (
        <div className="p-4 rounded text-[12px] text-center" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
          No news available right now.
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {items.map((n) => (
            <li key={n.id}>
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-3 rounded hover:bg-white/5 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.04)" }}
              >
                {n.thumbnail ? (
                  <img
                    src={n.thumbnail}
                    alt=""
                    loading="lazy"
                    className="w-20 h-20 rounded object-cover shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className="text-[13px] font-semibold text-white leading-snug line-clamp-2"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      {n.title}
                    </h4>
                    <span
                      className="text-[10px] shrink-0 mt-0.5"
                      style={{ color: "#6b7280", fontFamily: FONT_MONO }}
                    >
                      {timeAgo(n.pubDateMs)}
                    </span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
                    {n.source}
                  </div>
                  {n.description && (
                    <p
                      className="text-[11px] mt-1.5 line-clamp-2"
                      style={{ color: "#9ca3af", fontFamily: FONT_SANS }}
                    >
                      {n.description}
                    </p>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
