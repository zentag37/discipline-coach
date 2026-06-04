import { useEffect, useMemo, useState } from "react";

type Category = "general" | "forex" | "crypto" | "merger";

type FinnhubNews = {
  id: number;
  headline: string;
  source: string;
  summary: string;
  url: string;
  image: string;
  datetime: number; // unix seconds
  category: string;
};

const TEAL = "#00d4a0";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_SANS = "Inter, sans-serif";

const FINNHUB_TOKEN = "d1ib5i9r01qhqvp8ueu0d1ib5i9r01qhqvp8ueug";

const TABS: { label: string; value: Category }[] = [
  { label: "All", value: "general" },
  { label: "Forex", value: "forex" },
  { label: "Crypto", value: "crypto" },
  { label: "Stocks", value: "merger" },
];

function timeAgo(unixSec: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unixSec));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function FinnhubNewsFeed() {
  const [tabIdx, setTabIdx] = useState(0);
  const [items, setItems] = useState<FinnhubNews[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const category = TABS[tabIdx].value;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_TOKEN}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: FinnhubNews[] = await res.json();
        if (cancelled) return;
        setItems(Array.isArray(data) ? data.slice(0, 20) : []);
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

  const filtered = useMemo(() => {
    if (!items) return [];
    // "Stocks" tab uses 'general' but we filter out forex/crypto entries
    if (TABS[tabIdx].label === "Stocks") {
      return items.filter((i) => {
        const c = (i.category || "").toLowerCase();
        return c !== "forex" && c !== "crypto";
      });
    }
    return items;
  }, [items, tabIdx]);

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

      {!loading && !error && filtered.length === 0 && (
        <div
          className="p-4 rounded text-[12px] text-center"
          style={{ color: "#6b7280", fontFamily: FONT_SANS }}
        >
          No news available right now.
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map((n) => (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-3 rounded hover:bg-white/5 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.04)" }}
              >
                {n.image ? (
                  <img
                    src={n.image}
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
                      {n.headline}
                    </h4>
                    <span
                      className="text-[10px] shrink-0 mt-0.5"
                      style={{ color: "#6b7280", fontFamily: FONT_MONO }}
                    >
                      {timeAgo(n.datetime)}
                    </span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
                    {n.source}
                  </div>
                  {n.summary && (
                    <p
                      className="text-[11px] mt-1.5 line-clamp-2"
                      style={{ color: "#9ca3af", fontFamily: FONT_SANS }}
                    >
                      {n.summary}
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
