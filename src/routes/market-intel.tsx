import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, CalendarDays, BookOpen, Globe, Download, Settings, Bell, Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { hasAceAccess } from "@/lib/plan";
import { getLiveQuotes, type LiveQuote } from "@/lib/market.functions";
import { getMarketNews } from "@/lib/news.functions";
import { SidebarUserMenu } from "@/components/SidebarUserMenu";
import { AvatarMenu } from "@/components/AvatarMenu";
import { NotificationsBell } from "@/components/NotificationsBell";

export const Route = createFileRoute("/market-intel")({
  head: () => ({ meta: [{ title: "Market Intel — TradeWithAce" }] }),
  component: MarketIntelPage,
});

const TEAL = "#00d4a0";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const GREEN = "#22c55e";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_SANS = "Inter, sans-serif";

type InstrumentMeta = {
  symbol: string;
  fullName: string;
  assetClass: string;
  intel: string;
  events: { label: string; impact: "high" | "med" | "low" }[];
};

type Instrument = InstrumentMeta & {
  price: number;
  change: number;
  decimals: number;
  trend: { tf: string; dir: "Bullish" | "Bearish" | "Neutral"; strength: number }[];
  pivots: { label: string; price: number; type: "R" | "S" | "PP" }[];
  live: boolean;
  error?: string;
};

const INSTRUMENT_META: InstrumentMeta[] = [
  {
    symbol: "EURUSD", fullName: "Euro / US Dollar", assetClass: "FOREX",
    intel: "Watch the daily pivot for bias. Wait for a pullback to S1 for cleaner long entries. Avoid trading 30 minutes before high-impact USD events.",
    events: [
      { label: "📅 EUR CPI · 10:00 UTC", impact: "med" },
      { label: "📅 USD NFP Tomorrow", impact: "high" },
    ],
  },
  {
    symbol: "NAS100", fullName: "Nasdaq 100", assetClass: "INDEX",
    intel: "Reclaim of R1 with volume confirms continuation. Below PP, expect a test of S1. Respect the daily trend on pullbacks.",
    events: [{ label: "📅 USD NFP Tomorrow", impact: "high" }],
  },
  {
    symbol: "GOLD", fullName: "Spot Gold (XAUUSD)", assetClass: "COMMODITY",
    intel: "Pullbacks to PP or S1 are the highest-probability long entries when daily trend is bullish. Don't chase extensions above R2.",
    events: [{ label: "📅 USD NFP Tomorrow", impact: "high" }],
  },
];

function mergeInstrument(meta: InstrumentMeta, quote: LiveQuote | undefined): Instrument {
  return {
    ...meta,
    price: quote?.price ?? 0,
    change: quote?.change ?? 0,
    decimals: quote?.decimals ?? 2,
    trend: quote?.trend?.length
      ? quote.trend
      : [
          { tf: "1H", dir: "Neutral", strength: 50 },
          { tf: "4H", dir: "Neutral", strength: 50 },
          { tf: "D1", dir: "Neutral", strength: 50 },
        ],
    pivots: quote?.pivots ?? [],
    live: !!quote && !quote.error && quote.price > 0,
    error: quote?.error,
  };
}

function fmt(n: number, decimals: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function InstrumentSkeleton({ symbol }: { symbol: string }) {
  return (
    <div className="p-5 rounded-[12px] relative animate-pulse"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="absolute top-3 right-3 text-[9px] tracking-widest px-1.5 py-0.5 rounded"
        style={{ background: "rgba(156,163,175,0.12)", color: "#9ca3af", border: "1px solid rgba(156,163,175,0.3)" }}>
        LOADING…
      </span>
      <div className="flex items-center gap-4">
        <div className="text-2xl tracking-tight">{symbol}</div>
        <div className="md:ml-auto h-6 w-28 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-2 w-16 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="h-2 w-full rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
            <div className="h-2 w-3/4 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
            <div className="h-2 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketIntelPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>({});
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/login" }); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(data || { full_name: user.email?.split("@")[0] });
    })();
  }, [navigate]);

  const firstName = (profile.full_name || "Trader").split(" ")[0];
  const initials = (profile.full_name || "T R").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const plan = (profile.plan || "PRO").toUpperCase();
  const unlocked = hasAceAccess(profile.plan);

  // Derive watchlist from user profile.instruments, fall back to defaults.
  const userSymbols = useMemo<string[]>(() => {
    const raw = profile.instruments;
    const list: string[] = Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw.length
        ? raw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : ["EURUSD", "NAS100", "GOLD"];
    return list.map((s) => s.toUpperCase());
  }, [profile.instruments]);

  const visibleMeta = useMemo<InstrumentMeta[]>(() => {
    const metaFor = (sym: string): InstrumentMeta => {
      const found = INSTRUMENT_META.find((m) => m.symbol === sym);
      if (found) return found;
      return {
        symbol: sym,
        fullName: sym,
        assetClass: "MARKET",
        intel: "Watching live price action. Respect the daily trend on pullbacks; wait for a clean reaction at PP or S1/R1 before entering.",
        events: [],
      };
    };
    const list = userSymbols.map(metaFor);
    return unlocked ? list : list.slice(0, 1);
  }, [userSymbols, unlocked]);

  const symbols = useMemo(() => visibleMeta.map((m) => m.symbol), [visibleMeta]);

  const fetchQuotes = useServerFn(getLiveQuotes);
  const { data: quotesData, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["live-quotes", symbols],
    queryFn: () => fetchQuotes({ data: { symbols } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: symbols.length > 0,
  });
  const quotesBySymbol = useMemo(() => {
    const map = new Map<string, LiveQuote>();
    quotesData?.quotes?.forEach((q) => map.set(q.symbol, q));
    return map;
  }, [quotesData]);
  const visibleInstruments: Instrument[] = visibleMeta.map((m) =>
    mergeInstrument(m, quotesBySymbol.get(m.symbol)),
  );
  const secondsSinceUpdate = dataUpdatedAt ? Math.max(0, Math.floor((now.getTime() - dataUpdatedAt) / 1000)) : null;

  const session = getSessionStatus(now);
  const nyIn = timeUntilUTC(now, 13);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0d0f12", color: "#e6e8eb", fontFamily: FONT_MONO }}>
      <Sidebar plan={plan} initials={initials} firstName={firstName} onSignOut={signOut} active="Market Intel" />

      <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
        <header className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{ background: "#141820", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 className="text-sm font-medium" style={{ fontFamily: FONT_SANS }}>Market Intel</h1>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: session.open ? GREEN : RED }} />
              <span style={{ color: session.open ? GREEN : RED }}>{session.label}</span>
              <span style={{ color: "#9ca3af" }}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </span>
            <span className="hidden md:inline" style={{ color: "#6b7280" }}>Next: New York opens in {nyIn}</span>
            <button className="p-1.5 rounded hover:bg-white/5" style={{ color: "#9ca3af" }}><Bell size={16} /></button>
            <AvatarMenu initials={initials} />
          </div>
        </header>

        <main className="p-7 space-y-5 max-w-[1400px] w-full">
          {/* Sessions strip */}
          <DemoCard title="" pad>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
              <SessionBlock flag="🌏" name="Asian" hours="00:00 – 09:00 UTC" status="Closed" color="#6b7280" instruments="USDJPY · AUDUSD · NIKKEI" />
              <SessionBlock flag="🌍" name="London" hours="08:00 – 17:00 UTC" status="Open" color={TEAL} instruments="EURUSD · GBPUSD · Gold" />
              <SessionBlock flag="🗽" name="New York" hours="13:00 – 22:00 UTC" status={`Opens in ${nyIn}`} color={AMBER} instruments="NAS100 · SPX500 · USD pairs" />
              <SessionBlock flag="🔄" name="Overlap" hours="13:00 – 17:00 UTC" status={`In ${nyIn}`} color="#9ca3af" instruments="Highest liquidity window" />
            </div>
          </DemoCard>

          {/* Status row */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
            <span>
              {isError ? (
                <span style={{ color: AMBER }}>Price data unavailable — retrying…</span>
              ) : isLoading && !quotesData ? (
                <span>Loading live market data…</span>
              ) : secondsSinceUpdate !== null ? (
                <>Updated {secondsSinceUpdate}s ago · refreshes every 60s</>
              ) : null}
            </span>
            <span>Data: TwelveData</span>
          </div>

          {/* Instrument cards */}
          {isLoading && !quotesData
            ? visibleMeta.map((m) => <InstrumentSkeleton key={m.symbol} symbol={m.symbol} />)
            : visibleInstruments.map((ins) => (
                <InstrumentCard key={ins.symbol} ins={ins} />
              ))}
          {!unlocked && (
            <div className="p-6 rounded-[12px] flex flex-col items-center justify-center gap-3 text-center"
              style={{ background: "#141820", border: `1px dashed ${TEAL}60` }}>
              <Lock size={22} style={{ color: TEAL }} />
              <div className="text-sm" style={{ fontFamily: FONT_SANS }}>
                Solo plan tracks 1 instrument. Upgrade to Pro for the full watchlist + ACE intel.
              </div>
              <Link to="/pricing" className="text-xs px-4 py-1.5 rounded font-medium"
                style={{ background: TEAL, color: "#0d0f12" }}>
                Upgrade to Pro →
              </Link>
            </div>
          )}

          {/* Economic calendar */}
          <DemoCard title="ECONOMIC CALENDAR" subtitle="Events affecting your instruments today and tomorrow">
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs" style={{ fontFamily: FONT_MONO }}>
                <thead>
                  <tr style={{ color: "#6b7280" }}>
                    {["Time (UTC)", "Event", "Currency", "Impact", "Forecast", "Previous"].map((h) => (
                      <th key={h} className="text-left py-2 font-normal text-[10px] tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CalRow time="10:00" event="EUR CPI (YoY)" ccy="EUR" impact="high" forecast="2.2%" prev="2.3%" upcoming />
                  <CalRow time="13:30" event="USD Jobless Claims" ccy="USD" impact="med" forecast="215K" prev="210K" />
                  <tr>
                    <td colSpan={6} className="py-2 text-[10px] tracking-widest" style={{ color: "#6b7280" }}>
                      TOMORROW
                    </td>
                  </tr>
                  <CalRow time="13:30" event="USD NFP" ccy="USD" impact="high" forecast="180K" prev="177K" />
                  <CalRow time="15:00" event="USD ISM Services" ccy="USD" impact="med" forecast="51.2" prev="50.8" />
                </tbody>
              </table>
            </div>
            <p className="text-[11px] mt-3" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
              Economic data is placeholder. Live calendar connects after backend setup.
            </p>
          </DemoCard>

          {/* Bottom 2 cols */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DemoCard title="MARKET SENTIMENT">
              <div className="space-y-4 mt-4">
                {[
                  { sym: "EURUSD", long: 73 },
                  { sym: "NAS100", long: 45 },
                  { sym: "GOLD", long: 61 },
                ].map((s) => (
                  <div key={s.sym}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>{s.sym}</span>
                      <span style={{ color: "#9ca3af" }}>
                        <span style={{ color: GREEN }}>Long {s.long}%</span> · <span style={{ color: RED }}>Short {100 - s.long}%</span>
                      </span>
                    </div>
                    <div className="flex h-2 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div style={{ width: `${s.long}%`, background: GREEN }} />
                      <div style={{ width: `${100 - s.long}%`, background: RED }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="italic text-[11px] mt-5" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
                Retail sentiment is contrarian — when 70%+ are long, smart money often goes short. Use as one input, not a signal.
              </p>
            </DemoCard>

            <DemoCard title="LATEST NEWS">
              <NewsList symbols={symbols} />
            </DemoCard>

          </div>
        </main>
      </div>
    </div>
  );
}

function InstrumentCard({ ins }: { ins: Instrument }) {
  const up = ins.change >= 0;
  const dirColor = (d: string) => d === "Bullish" ? GREEN : d === "Bearish" ? RED : AMBER;
  return (
    <div className="p-5 rounded-[12px] animate-fade-in relative"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
      <LivePill live={ins.live} error={ins.error} />
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 pr-24">
        <div>
          <div className="text-2xl tracking-tight">{ins.symbol}</div>
          <div className="text-[11px]" style={{ color: "#6b7280" }}>{ins.fullName}</div>
        </div>
        <div className="md:ml-auto flex items-center gap-3">
          <div className="text-2xl" style={{ color: TEAL }}>
            {ins.price > 0 ? fmt(ins.price, ins.decimals) : "—"}
          </div>
          {ins.price > 0 && (
            <span className="text-xs px-2 py-1 rounded"
              style={{ background: up ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: up ? GREEN : RED }}>
              {up ? "▲" : "▼"} {up ? "+" : ""}{ins.change.toFixed(2)}%
            </span>
          )}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>{ins.assetClass}</span>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Trend */}
        <div>
          <div className="text-[10px] tracking-widest mb-3" style={{ color: "#9ca3af" }}>TREND</div>
          <div className="space-y-3">
            {ins.trend.map((t) => (
              <div key={t.tf} className="grid grid-cols-[28px_70px_1fr_40px] items-center gap-2 text-[11px]">
                <span style={{ color: "#9ca3af" }}>{t.tf}</span>
                <span style={{ color: dirColor(t.dir) }}>
                  {t.dir === "Bullish" ? "▲" : t.dir === "Bearish" ? "▼" : "→"} {t.dir}
                </span>
                <div className="h-1.5 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full" style={{ width: `${t.strength}%`, background: dirColor(t.dir) }} />
                </div>
                <span className="text-right" style={{ color: "#6b7280" }}>{t.strength}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pivots */}
        <div>
          <div className="text-[10px] tracking-widest mb-3" style={{ color: "#9ca3af" }}>PIVOT POINTS</div>
          <div className="space-y-0.5">
            {ins.pivots.map((p) => {
              const isPP = p.type === "PP";
              const color = p.type === "R" ? "rgba(34,197,94,0.85)" : p.type === "S" ? "rgba(239,68,68,0.85)" : TEAL;
              return (
                <div key={p.label}
                  className="flex items-center justify-between px-2 py-1 rounded text-[11px]"
                  style={{ background: isPP ? "rgba(0,212,160,0.1)" : "transparent" }}>
                  <span style={{ color, width: 28 }}>{p.label}</span>
                  <span style={{ color: isPP ? TEAL : "#d1d5db" }}>{fmt(p.price, ins.decimals)}</span>
                  <span className="text-[10px]" style={{ color: "#6b7280" }}>
                    {isPP ? "── current" : "░░░░░░░░"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACE */}
        <div>
          <div className="text-[10px] tracking-widest mb-3" style={{ color: TEAL }}>ACE SAYS</div>
          <p className="text-xs leading-relaxed" style={{ color: "#d1d5db", fontFamily: FONT_SANS }}>
            {ins.intel}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {ins.events.map((e) => (
              <span key={e.label} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: e.impact === "high" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                  color: e.impact === "high" ? RED : AMBER,
                  border: `1px solid ${e.impact === "high" ? RED + "40" : AMBER + "40"}`,
                }}>
                {e.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionBlock({ flag, name, hours, status, color, instruments }: {
  flag: string; name: string; hours: string; status: string; color: string; instruments: string;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{flag}</span>
        <span className="text-sm" style={{ fontFamily: FONT_SANS }}>{name}</span>
      </div>
      <div className="text-[10px] mb-2" style={{ color: "#6b7280" }}>{hours}</div>
      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full"
        style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}>
        {status}
      </span>
      <div className="text-[10px] mt-2" style={{ color: "#9ca3af" }}>{instruments}</div>
    </div>
  );
}

function CalRow({ time, event, ccy, impact, forecast, prev, upcoming }: {
  time: string; event: string; ccy: string; impact: "high" | "med" | "low"; forecast: string; prev: string; upcoming?: boolean;
}) {
  const cfg = impact === "high" ? { dot: "🔴", color: RED, label: "High" }
    : impact === "med" ? { dot: "🟡", color: AMBER, label: "Medium" }
    : { dot: "🟢", color: GREEN, label: "Low" };
  return (
    <tr style={{
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderLeft: upcoming ? `2px solid ${AMBER}` : "none",
    }}>
      <td className="py-2 pl-2">{time}</td>
      <td style={{ fontFamily: FONT_SANS }}>{event}</td>
      <td style={{ color: "#9ca3af" }}>{ccy}</td>
      <td>
        <span className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: `${cfg.color}22`, color: cfg.color }}>
          {cfg.dot} {cfg.label}
        </span>
      </td>
      <td>{forecast}</td>
      <td style={{ color: "#6b7280" }}>{prev}</td>
    </tr>
  );
}

function DemoCard({ title, subtitle, pad, children }: { title: string; subtitle?: string; pad?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] relative animate-fade-in"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)", padding: pad ? 0 : 20 }}>
      <DemoPill />
      {title && (
        <div className={pad ? "px-5 pt-4" : ""}>
          <div className="text-[10px] tracking-widest" style={{ color: "#9ca3af" }}>{title}</div>
          {subtitle && (
            <div className="text-[11px] mt-1" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>{subtitle}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function DemoPill() {
  return (
    <span className="absolute top-3 right-3 text-[9px] tracking-widest px-1.5 py-0.5 rounded z-10"
      style={{ background: "rgba(245,158,11,0.12)", color: AMBER, border: "1px solid rgba(245,158,11,0.3)" }}>
      DEMO DATA
    </span>
  );
}

function LivePill({ live, error }: { live: boolean; error?: string }) {
  if (error) {
    return (
      <span className="absolute top-3 right-3 text-[9px] tracking-widest px-1.5 py-0.5 rounded z-10"
        title={error}
        style={{ background: "rgba(239,68,68,0.12)", color: RED, border: "1px solid rgba(239,68,68,0.3)" }}>
        OFFLINE
      </span>
    );
  }
  if (!live) {
    return (
      <span className="absolute top-3 right-3 text-[9px] tracking-widest px-1.5 py-0.5 rounded z-10"
        style={{ background: "rgba(156,163,175,0.12)", color: "#9ca3af", border: "1px solid rgba(156,163,175,0.3)" }}>
        LOADING…
      </span>
    );
  }
  return (
    <span className="absolute top-3 right-3 text-[9px] tracking-widest px-1.5 py-0.5 rounded z-10 flex items-center gap-1"
      style={{ background: "rgba(34,197,94,0.12)", color: GREEN, border: "1px solid rgba(34,197,94,0.3)" }}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: GREEN }} />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: GREEN }} />
      </span>
      LIVE
    </span>
  );
}

function getSessionStatus(now: Date) {
  const h = now.getUTCHours();
  if (h >= 7 && h < 16) return { label: "London Session Open", open: true };
  if (h >= 12 && h < 21) return { label: "New York Session Open", open: true };
  if (h >= 23 || h < 8) return { label: "Asia Session Open", open: true };
  return { label: "Pre-Market", open: false };
}

function timeUntilUTC(now: Date, targetHourUTC: number) {
  const next = new Date(now);
  next.setUTCHours(targetHourUTC, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const diff = next.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function Sidebar({ plan, initials, firstName, onSignOut, active }: {
  plan: string; initials: string; firstName: string; onSignOut: () => void; active: string;
}) {
  const items = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: CalendarDays, label: "Today's Session", to: "/session" },
    { icon: BookOpen, label: "Journal", to: "/journal" },
    { icon: Globe, label: "Market Intel", to: "/market-intel" },
    { icon: Radio, label: "Signals", to: "/signals" },
    { icon: Download, label: "Download App", to: "/download" },
    { icon: Settings, label: "Settings", to: "/settings" },
  ];
  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[220px] z-20"
      style={{ background: "#141820", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded" style={{ background: TEAL }} />
          <span className="font-semibold tracking-tight" style={{ color: TEAL }}>TradeWithAce</span>
        </div>
        <span className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(0,212,160,0.12)", color: TEAL, border: `1px solid ${TEAL}40` }}>
          {plan}
        </span>
      </div>
      <nav className="flex-1 px-2 space-y-0.5">
        {items.map((it) => {
          const isActive = it.label === active;
          return (
            <a key={it.label} href={it.to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors"
              style={{
                background: isActive ? "rgba(0,212,160,0.08)" : "transparent",
                color: isActive ? TEAL : "#9ca3af",
              }}>
              <it.icon size={16} style={{ color: isActive ? TEAL : "#6b7280" }} />
              <span style={{ fontFamily: FONT_SANS }}>{it.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: GREEN }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: GREEN }} />
          </span>
          <span style={{ color: "#9ca3af" }}>ACE is ready</span>
        </div>
        <SidebarUserMenu initials={initials} firstName={firstName} />
      </div>
    </aside>
  );
}

function NewsList({ symbols }: { symbols: string[] }) {
  const fetchNews = useServerFn(getMarketNews);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market-news", symbols],
    queryFn: () => fetchNews({ data: { symbols } }),
    refetchInterval: 5 * 60_000,
    staleTime: 5 * 60_000,
    enabled: symbols.length > 0,
  });

  if (isLoading && !data) {
    return (
      <div className="space-y-3 mt-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="py-2 animate-pulse" style={{ borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-14 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 w-12 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
            <div className="h-3 w-5/6 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-xs mt-3" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
        News feed unavailable — retrying shortly.
      </p>
    );
  }

  return (
    <div className="space-y-1 mt-3">
      {(data?.results ?? []).map((group) => (
        <div key={group.symbol} className="pb-2">
          {group.articles.length === 0 ? (
            <div className="flex items-center gap-2 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ border: `1px solid ${TEAL}50`, color: TEAL }}>
                {group.symbol}
              </span>
              <span className="text-xs" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
                No recent news for this instrument
              </span>
            </div>
          ) : (
            group.articles.map((n, i) => (
              <div key={`${group.symbol}-${i}`} className="flex items-start gap-2 py-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
                      {n.source}
                    </span>
                    <span className="text-[10px]" style={{ color: "#6b7280", fontFamily: FONT_MONO }}>{n.timeAgo}</span>
                  </div>
                  <a href={n.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs hover:underline block truncate"
                    style={{ color: "#d1d5db", fontFamily: FONT_SANS }}>
                    {n.headline}
                  </a>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ border: `1px solid ${TEAL}50`, color: TEAL }}>
                  {group.symbol}
                </span>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
