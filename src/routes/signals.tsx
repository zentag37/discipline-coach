import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, CalendarDays, BookOpen, Globe, Download, Settings, Bell, Radio, Lock, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAceSignals, updateSignalStatus, type AceSignal } from "@/lib/signals.functions";
import { hasAceAccess } from "@/lib/plan";
import { speakAsACE } from "@/lib/ace-voice";
import { SidebarUserMenu } from "@/components/SidebarUserMenu";
import { AvatarMenu } from "@/components/AvatarMenu";

export const Route = createFileRoute("/signals")({
  head: () => ({ meta: [{ title: "ACE Signals — TradeWithAce" }] }),
  component: SignalsPage,
});

const TEAL = "#00d4a0";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_SANS = "Inter, sans-serif";

function fmt(n: number, decimals: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pipDistance(a: number, b: number, instrument: string): string {
  const diff = Math.abs(a - b);
  if (instrument.length === 6) {
    const mult = instrument.endsWith("JPY") ? 100 : 10000;
    return `${Math.round(diff * mult)} pips`;
  }
  return `${diff.toFixed(2)} pts`;
}

function SignalsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>({});
  const [userId, setUserId] = useState<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/login" }); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(data || { full_name: user.email?.split("@")[0] });
    })();
  }, [navigate]);

  const firstName = (profile.full_name || "Trader").split(" ")[0];
  const initials = (profile.full_name || "T R").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const plan = (profile.plan || "PRO").toUpperCase();
  const unlocked = hasAceAccess(profile.plan);

  const acct = Number(profile.account_size) || 25000;
  const riskPct = Number(profile.risk_per_trade) || 1;
  const riskDollars = Math.round((acct * riskPct) / 100);

  const symbols = useMemo<string[]>(() => {
    const raw = profile.instruments;
    const list: string[] = Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw.length
        ? raw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : ["EURUSD", "NAS100", "GOLD"];
    return list.map((s) => s.toUpperCase());
  }, [profile.instruments]);

  const fetchSignals = useServerFn(getAceSignals);
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["ace-signals", symbols],
    queryFn: () => fetchSignals({ data: { symbols } }),
    refetchInterval: 15 * 60 * 1000,
    staleTime: 60_000,
    enabled: !!userId && symbols.length > 0 && unlocked,
  });

  const signals = data?.signals || [];
  const history = data?.history || [];

  // Voice notification for new signals
  useEffect(() => {
    if (!profile.voice_enabled || !signals.length) return;
    for (const s of signals) {
      if (!s.id || seenIdsRef.current.has(s.id)) continue;
      seenIdsRef.current.add(s.id);
      // Only announce signals generated in the last 2 minutes (newly fired)
      const age = Date.now() - new Date(s.generatedAt).getTime();
      if (age > 2 * 60 * 1000) continue;
      const msg = `New signal, ${firstName}. ${s.direction} on ${s.instrument}. Entry at ${s.entry}, stop at ${s.stopLoss}, target at ${s.target1}. Risk is $${riskDollars} at your ${riskPct}% rule. Check the signals page for full details.`;
      speakAsACE(msg, profile.voice_style || "marcus").catch(() => {});
      break; // only one at a time
    }
  }, [signals, profile.voice_enabled, profile.voice_style, firstName, riskDollars, riskPct]);

  const updateFn = useServerFn(updateSignalStatus);

  async function follow(s: AceSignal) {
    if (!s.id) return;
    await updateFn({ data: { id: s.id, followed: true } });
    // Pre-fill journal with signal details via URL params
    const params = new URLSearchParams({
      instrument: s.instrument,
      direction: s.direction,
      entry: String(s.entry),
      stop: String(s.stopLoss),
      target: String(s.target1),
    });
    navigate({ to: "/journal", search: Object.fromEntries(params) as any });
  }

  async function dismiss(s: AceSignal) {
    if (!s.id) return;
    await updateFn({ data: { id: s.id, status: "dismissed" } });
    refetch();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="min-h-screen flex" style={{ background: "#0d0f12", color: "#e6e8eb", fontFamily: FONT_MONO }}>
      <Sidebar plan={plan} initials={initials} firstName={firstName} onSignOut={signOut} active="Signals" />

      <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
        <header className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{ background: "#141820", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 className="text-sm font-medium" style={{ fontFamily: FONT_SANS }}>ACE Signals</h1>
          <div className="flex items-center gap-4 text-xs">
            <button className="p-1.5 rounded hover:bg-white/5" style={{ color: "#9ca3af" }}><Bell size={16} /></button>
            <AvatarMenu initials={initials} />
          </div>
        </header>

        <main className="p-7 space-y-5 max-w-[1100px] w-full">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: FONT_SANS }}>ACE Signals</h2>
                <span className="text-[10px] tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.12)", color: AMBER, border: `1px solid ${AMBER}55` }}>
                  ALGORITHMIC
                </span>
              </div>
              <p className="text-xs max-w-[640px] leading-relaxed" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
                Signals are generated algorithmically using RSI, EMA and MACD indicators. Always apply your own analysis. Past signals do not guarantee future results.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "#9ca3af" }}>
              <span>Last updated {updated}</span>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/5 disabled:opacity-50"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#e6e8eb" }}>
                <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {/* Signal cards */}
          <div className="relative">
            <div style={{ filter: unlocked ? "none" : "blur(6px)", pointerEvents: unlocked ? "auto" : "none" }}>
              {isLoading ? (
                <div className="p-10 text-center text-xs" style={{ color: "#6b7280" }}>Scanning your watchlist...</div>
              ) : signals.length === 0 ? (
                <div className="p-10 rounded-[12px] text-center text-sm"
                  style={{ background: "#141820", border: "1px dashed rgba(255,255,255,0.12)", color: "#9ca3af", fontFamily: FONT_SANS }}>
                  No signals right now for your instruments. ACE is watching the market — check back during active sessions.
                </div>
              ) : (
                <div className="space-y-4">
                  {signals.map((s) => (
                    <SignalCard key={s.id || `${s.instrument}-${s.generatedAt}`} s={s} riskDollars={riskDollars} riskPct={riskPct} onFollow={follow} onDismiss={dismiss} />
                  ))}
                </div>
              )}
            </div>
            {!unlocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 rounded-[12px]"
                style={{ background: "rgba(13,15,18,0.65)" }}>
                <Lock size={22} style={{ color: TEAL }} />
                <div className="text-sm" style={{ color: "#e6e8eb", fontFamily: FONT_SANS }}>
                  Upgrade to Pro to unlock ACE Signals
                </div>
                <Link to="/pricing" className="text-xs px-4 py-1.5 rounded font-medium"
                  style={{ background: TEAL, color: "#0d0f12" }}>Upgrade →</Link>
              </div>
            )}
          </div>

          {/* History */}
          {unlocked && history.length > 0 && (
            <div className="p-5 rounded-[12px]" style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] tracking-widest mb-3" style={{ color: "#9ca3af" }}>SIGNAL HISTORY · LAST 20</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ fontFamily: FONT_SANS }}>
                  <thead>
                    <tr style={{ color: "#6b7280", textAlign: "left" }} className="text-[10px] tracking-widest">
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2 pr-3">Instrument</th>
                      <th className="py-2 pr-3">Direction</th>
                      <th className="py-2 pr-3">Entry</th>
                      <th className="py-2 pr-3">Target 1</th>
                      <th className="py-2 pr-3">Confidence</th>
                      <th className="py-2 pr-3">Followed</th>
                      <th className="py-2 pr-3">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h: any) => {
                      const isBuy = h.direction === "BUY";
                      return (
                        <tr key={h.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)", color: "#d1d5db" }}>
                          <td className="py-2 pr-3" style={{ color: "#9ca3af" }}>
                            {new Date(h.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2 pr-3 font-medium">{h.instrument}</td>
                          <td className="py-2 pr-3" style={{ color: isBuy ? TEAL : RED }}>{h.direction}</td>
                          <td className="py-2 pr-3">{Number(h.entry_price)}</td>
                          <td className="py-2 pr-3">{Number(h.target1)}</td>
                          <td className="py-2 pr-3">{h.confidence}%</td>
                          <td className="py-2 pr-3">{h.followed ? "Yes" : "—"}</td>
                          <td className="py-2 pr-3" style={{ color: "#9ca3af" }}>{h.outcome || h.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SignalCard({ s, riskDollars, riskPct, onFollow, onDismiss }: {
  s: AceSignal; riskDollars: number; riskPct: number;
  onFollow: (s: AceSignal) => void; onDismiss: (s: AceSignal) => void;
}) {
  const isBuy = s.direction === "BUY";
  const color = isBuy ? TEAL : RED;
  const dot = isBuy ? "🟢" : "🔴";
  const t1Pip = pipDistance(s.target1, s.entry, s.instrument);
  const slPip = pipDistance(s.stopLoss, s.entry, s.instrument);
  const t2Pip = pipDistance(s.target2, s.entry, s.instrument);

  return (
    <div className="p-5 rounded-[12px] relative"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `3px solid ${color}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{dot}</span>
          <span className="text-sm font-semibold tracking-tight" style={{ color, fontFamily: FONT_SANS }}>{s.direction} SIGNAL</span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "#9ca3af" }}>
          <span className="font-semibold" style={{ color: "#e6e8eb" }}>{s.instrument}</span>
          <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>{s.timeframe}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 mt-4 text-xs" style={{ fontFamily: FONT_SANS, color: "#d1d5db" }}>
        <Row label="Entry" value={fmt(s.entry, s.decimals)} />
        <Row label="Stop loss" value={`${fmt(s.stopLoss, s.decimals)}  (${isBuy ? "-" : "+"}${slPip})`} valueColor="#ef4444" />
        <Row label="Target 1" value={`${fmt(s.target1, s.decimals)}  (${isBuy ? "+" : "-"}${t1Pip})  R:R 1:${s.rr}`} valueColor={TEAL} />
        <Row label="Target 2" value={`${fmt(s.target2, s.decimals)}  (${isBuy ? "+" : "-"}${t2Pip})`} valueColor={TEAL} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
          <span>Confidence</span>
          <span style={{ color }}>{s.confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full transition-all" style={{ width: `${s.confidence}%`, background: color }} />
        </div>
      </div>

      <div className="mt-3 text-xs" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
        <span style={{ color: "#6b7280" }}>Reasons: </span>{s.reasons.join(" · ")}
      </div>

      <div className="mt-3 text-xs" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
        <span style={{ color: "#6b7280" }}>Your risk: </span>
        <span style={{ color: "#e6e8eb" }}>${riskDollars}</span>
        <span style={{ color: "#6b7280" }}> ({riskPct}% of account)</span>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button onClick={() => onFollow(s)} className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ background: color, color: "#0d0f12" }}>
          Follow this signal
        </button>
        <button onClick={() => onDismiss(s)} className="text-xs px-3 py-1.5 rounded hover:bg-white/5"
          style={{ color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[10px] tracking-widest uppercase" style={{ color: "#6b7280", minWidth: 70 }}>{label}</span>
      <span style={{ color: valueColor || "#e6e8eb", fontFamily: FONT_MONO }}>{value}</span>
    </div>
  );
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
          style={{ background: "rgba(0,212,160,0.12)", color: TEAL, border: `1px solid ${TEAL}40` }}>{plan}</span>
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
      <div className="p-3">
        <SidebarUserMenu initials={initials} firstName={firstName} />
      </div>
    </aside>
  );
}
