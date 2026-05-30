import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Globe,
  Download,
  Settings,
  Bell,
  Plus,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Quote,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { aceMessage, aceJournal } from "@/lib/ace.functions";
import { AceChatDrawer } from "@/components/ace/AceChatDrawer";
import { speakAsACE, stopVoice, subscribeVoice } from "@/lib/ace-voice";
import { VoiceConsentModal } from "@/components/ace/VoiceConsentModal";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Trader Coach" }],
  }),
  component: DashboardPage,
});

const TEAL = "#00d4a0";

type Profile = {
  full_name?: string | null;
  plan?: string | null;
  account_size?: number | string | null;
  risk_per_trade?: number | string | null;
  daily_loss_limit?: number | string | null;
  max_trades?: number | string | null;
  max_trades_per_day?: number | null;
  instruments?: any;
  session?: any;
  voice_enabled?: boolean | null;
  voice_style?: string | null;
  voice_consent_decided?: boolean | null;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getSessionStatus(now: Date) {
  // UTC hours roughly: London 7-16, NY 12-21, Asia 23-8
  const h = now.getUTCHours();
  if (h >= 7 && h < 16) return { label: "London Session Open", open: true };
  if (h >= 12 && h < 21) return { label: "New York Session Open", open: true };
  if (h >= 23 || h < 8) return { label: "Asia Session Open", open: true };
  return { label: "Market Closed", open: false };
}

function nextLondonOpen(now: Date) {
  const next = new Date(now);
  next.setUTCHours(7, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const diff = next.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [checks, setChecks] = useState([false, false, false, false, false]);
  const [showLog, setShowLog] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);
  const [aceMsg, setAceMsg] = useState<string | null>(null);
  const [aceLoading, setAceLoading] = useState(false);
  const [aceError, setAceError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [journalStatus, setJournalStatus] = useState<string | null>(null);
  const fetchAceMessage = useServerFn(aceMessage);
  const fetchAceJournal = useServerFn(aceJournal);

  async function loadAceMessage() {
    setAceLoading(true);
    setAceError(false);
    try {
      const r = await fetchAceMessage();
      setAceMsg(r.message);
    } catch {
      setAceError(true);
    } finally {
      setAceLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    loadAceMessage();
    const t = setInterval(loadAceMessage, 30 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function refreshTrades(uid: string) {
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", uid)
      .eq("trade_date", todayStr())
      .order("created_at", { ascending: true });
    setTrades(data || []);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile(data as Profile);
      else setProfile({ full_name: user.user_metadata?.full_name || user.email?.split("@")[0] });
      refreshTrades(user.id);
      // Persist a session row for today if none exists
      const today = todayStr();
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle();
      if (!existing) {
        await supabase.from("sessions").insert({ user_id: user.id, session_date: today });
      }
    })();
  }, [navigate]);

  const firstName = (profile.full_name || "Trader").split(" ")[0];
  const initials = (profile.full_name || "T R")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const plan = (profile.plan || "PRO").toUpperCase();
  const acct = Number(profile.account_size) || 25000;
  const riskPct = Number(profile.risk_per_trade) || 1;
  const dailyPct = Number(profile.daily_loss_limit) || 3;
  const maxTrades = Number((profile as any).max_trades) || profile.max_trades_per_day || 3;
  const maxRisk = Math.round((acct * riskPct) / 100);
  const dailyStop = Math.round((acct * dailyPct) / 100);
  const rawIns = profile.instruments;
  const instruments: string[] = Array.isArray(rawIns)
    ? rawIns
    : typeof rawIns === "string" && rawIns.length
    ? rawIns.split(",").map((s: string) => s.trim()).filter(Boolean)
    : ["EURUSD", "NAS100", "GOLD"];

  const session = getSessionStatus(now);
  const opensIn = !session.open ? nextLondonOpen(now) : null;

  const checkedCount = checks.filter(Boolean).length;
  const allChecked = checkedCount === 5;

  const sessionPL = trades.reduce((a, t) => a + (Number(t.result_dollars) || 0), 0);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0d0f12", color: "#e6e8eb", fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[220px] z-20"
        style={{ background: "#141820", borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="p-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded" style={{ background: TEAL }} />
            <span className="font-semibold tracking-tight" style={{ color: TEAL }}>Trader Coach</span>
          </div>
          <span
            className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,212,160,0.12)", color: TEAL, border: `1px solid ${TEAL}40` }}
          >
            {plan}
          </span>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard" active />
          <NavItem icon={<CalendarDays size={16} />} label="Today's Session" />
          <NavItem icon={<BookOpen size={16} />} label="Journal" />
          <NavItem icon={<Globe size={16} />} label="Market Intel" />
          <NavItem icon={<Download size={16} />} label="Download App" />
          <NavItem icon={<Settings size={16} />} label="Settings" />
        </nav>

        <div className="p-3 space-y-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#22c55e" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#22c55e" }} />
            </span>
            <span style={{ color: "#9ca3af" }}>ACE is ready</span>
          </div>
          <div className="flex items-center gap-2 px-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
              style={{ background: "rgba(0,212,160,0.15)", color: TEAL }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate">{firstName}</div>
              <button onClick={signOut} className="text-[10px] hover:underline" style={{ color: "#6b7280" }}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
        {/* Header */}
        <header
          className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{ background: "#141820", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h1 className="text-sm font-medium tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
            Dashboard
          </h1>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span style={{ color: "#9ca3af" }}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: session.open ? "#22c55e" : "#ef4444" }} />
                <span style={{ color: session.open ? "#22c55e" : "#ef4444" }}>{session.label}</span>
              </span>
            </div>
            <button className="p-1.5 rounded hover:bg-white/5" style={{ color: "#9ca3af" }}>
              <Bell size={16} />
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
              style={{ background: "rgba(0,212,160,0.15)", color: TEAL }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-7 space-y-6 max-w-[1400px] w-full">
          {/* Row 1 */}
          <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in">
            <div>
              <h2 className="text-2xl tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
                {getGreeting()}, {firstName}.
              </h2>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
                {session.open
                  ? `${session.label}. Stay focused — trade your plan.`
                  : `London session opens in ${opensIn}. Stay patient — wait for your setup.`}
              </p>
            </div>
            <div className="text-right text-xs" style={{ color: "#9ca3af" }}>
              <div>{now.toLocaleDateString([], { weekday: "long" })}</div>
              <div>{now.toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" })}</div>
            </div>
          </div>

          {/* Row 2 — stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            <StatCard label="MAX RISK PER TRADE" value={`$${maxRisk}`} sub={`${riskPct}% of $${acct.toLocaleString()}`} />
            <StatCard label="DAILY STOP LOSS" value={`$${dailyStop}`} sub={`${dailyPct}% of $${acct.toLocaleString()}`} />
            <StatCard label="TRADES TODAY" value={`${trades.length} / ${maxTrades}`} sub={`${Math.max(0, maxTrades - trades.length)} remaining`} />
            <StatCard
              label="TODAY'S P&L"
              value={`${sessionPL < 0 ? "-" : ""}$${Math.abs(sessionPL).toFixed(2)}`}
              sub={trades.length ? `${trades.length} trade${trades.length === 1 ? "" : "s"} logged` : "No trades logged yet"}
              valueColor={sessionPL > 0 ? TEAL : sessionPL < 0 ? "#ef4444" : undefined}
            />
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 animate-fade-in">
            {/* ACE card */}
            <div
              className="lg:col-span-3 p-5 rounded-[10px]"
              style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `3px solid ${TEAL}` }}
            >
              <div className="text-[10px] tracking-widest mb-2" style={{ color: TEAL }}>
                ACE · AI MENTOR
              </div>
              <p className="text-sm leading-relaxed min-h-[60px]" style={{ color: "#d1d5db", fontFamily: "Inter, sans-serif" }}>
                {aceLoading && !aceMsg ? (
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL, animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL, animationDelay: "300ms" }} />
                  </span>
                ) : aceError && !aceMsg ? (
                  <button onClick={loadAceMessage} className="text-xs" style={{ color: TEAL }}>
                    ACE is thinking... tap to retry
                  </button>
                ) : aceMsg ? (
                  aceMsg
                ) : (
                  `Good ${getGreeting().split(" ")[1]} ${firstName}. Loading your coaching message...`
                )}
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={loadAceMessage}
                  disabled={aceLoading}
                  className="text-xs px-3 py-1.5 rounded hover:bg-white/5 disabled:opacity-50"
                  style={{ color: "#9ca3af" }}
                >
                  Next tip →
                </button>
                <button
                  onClick={() => setChatOpen(true)}
                  className="text-xs px-3 py-1.5 rounded"
                  style={{ border: `1px solid ${TEAL}`, color: TEAL }}
                >
                  Ask ACE something
                </button>
              </div>
            </div>

            {/* Pre-trade checklist */}
            <div
              className="lg:col-span-2 p-5 rounded-[10px] transition-colors"
              style={{
                background: "#141820",
                border: `1px solid ${allChecked ? TEAL : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <div className="text-[10px] tracking-widest mb-3" style={{ color: "#9ca3af" }}>
                PRE-TRADE CHECKLIST
              </div>
              <div className="space-y-2">
                {[
                  "Plan is defined — I know my setup",
                  "Stop-loss placed before entry",
                  "Risk is max 1–2% of account",
                  "Not chasing — I waited for my setup",
                  "Emotional state is calm",
                ].map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setChecks((c) => c.map((v, idx) => (idx === i ? !v : v)))}
                    className="w-full flex items-center gap-2.5 text-left text-xs py-1"
                    style={{ fontFamily: "Inter, sans-serif", color: "#d1d5db" }}
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        background: checks[i] ? TEAL : "transparent",
                        border: `1px solid ${checks[i] ? TEAL : "rgba(255,255,255,0.2)"}`,
                      }}
                    >
                      {checks[i] && <Check size={11} color="#0d0f12" strokeWidth={3} />}
                    </span>
                    <span style={{ opacity: checks[i] ? 0.6 : 1, textDecoration: checks[i] ? "line-through" : "none" }}>{label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full transition-all duration-300" style={{ width: `${(checkedCount / 5) * 100}%`, background: TEAL }} />
              </div>
              {allChecked && (
                <div className="mt-3 text-xs text-center" style={{ color: TEAL }}>
                  Ready to trade.
                </div>
              )}
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
            <div
              className="p-5 rounded-[10px]"
              style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="text-[10px] tracking-widest mb-3" style={{ color: "#9ca3af" }}>
                TODAY'S TRADES
              </div>
              {trades.length === 0 ? (
                <div
                  className="rounded-lg flex flex-col items-center justify-center py-10 gap-3"
                  style={{ border: "1px dashed rgba(255,255,255,0.12)" }}
                >
                  <span className="text-sm" style={{ color: "#6b7280", fontFamily: "Inter, sans-serif" }}>
                    No trades logged yet.
                  </span>
                  <button
                    onClick={() => setShowLog(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ background: TEAL, color: "#0d0f12" }}
                  >
                    <Plus size={14} /> Log a trade
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ color: "#6b7280" }}>
                          {["Time", "Instr", "Dir", "Entry", "Exit", "P&L", "Emotion"].map((h) => (
                            <th key={h} className="text-left py-2 font-normal">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((t, i) => {
                          const pl = Number(t.result_dollars) || 0;
                          const timeStr = (t.trade_time || "").slice(0, 5);
                          return (
                            <tr key={t.id ?? i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                              <td className="py-2">{timeStr}</td>
                              <td>{t.instrument}</td>
                              <td>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px]"
                                  style={{
                                    background: t.direction === "BUY" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                                    color: t.direction === "BUY" ? "#22c55e" : "#ef4444",
                                  }}
                                >
                                  {t.direction}
                                </span>
                              </td>
                              <td>{t.entry_price}</td>
                              <td>{t.exit_price}</td>
                              <td style={{ color: pl >= 0 ? TEAL : "#ef4444" }}>
                                {pl >= 0 ? "+" : "-"}${Math.abs(pl).toFixed(2)}
                              </td>
                              <td>{t.emotion}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => setShowLog(true)}
                    className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ border: `1px solid ${TEAL}`, color: TEAL }}
                  >
                    <Plus size={14} /> Log a trade
                  </button>
                </>
              )}
            </div>

            <div
              className="p-5 rounded-[10px]"
              style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="text-[10px] tracking-widest mb-3" style={{ color: "#9ca3af" }}>
                YOUR WATCHLIST
              </div>
              <div className="space-y-1">
                {instruments.map((sym, i) => {
                  const change = [0.42, -0.18, 0.91][i % 3];
                  const price = [1.0842, 18432.5, 2384.6][i % 3];
                  const up = change >= 0;
                  return (
                    <div key={sym} className="flex items-center justify-between py-2" style={{ borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span className="text-sm">{sym}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span style={{ color: "#d1d5db" }}>{price.toLocaleString()}</span>
                        <span className="flex items-center gap-0.5" style={{ color: up ? "#22c55e" : "#ef4444" }}>
                          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {up ? "+" : ""}{change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-[10px]" style={{ color: "#6b7280" }}>
                Live prices connect after backend setup
              </div>
            </div>
          </div>

          {/* Row 5 — quote */}
          <div
            className="flex items-center gap-4 p-5 rounded-[10px] animate-fade-in"
            style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Quote size={28} style={{ color: TEAL }} className="flex-shrink-0" />
            <p className="flex-1 italic text-sm text-center" style={{ color: "#d1d5db", fontFamily: "Inter, sans-serif" }}>
              "The goal of a successful trader is to make the best trades. Money is secondary."
            </p>
            <span className="text-xs whitespace-nowrap" style={{ color: "#6b7280" }}>
              — Alexander Elder
            </span>
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 h-14 flex items-center justify-around z-30"
        style={{ background: "#141820", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {[LayoutDashboard, CalendarDays, BookOpen, Globe, Settings].map((Icon, i) => (
          <button key={i} className="p-2" style={{ color: i === 0 ? TEAL : "#6b7280" }}>
            <Icon size={18} />
          </button>
        ))}
      </nav>

      {showLog && (
        <TradeLogModal
          onClose={() => setShowLog(false)}
          onSave={async (t) => {
            if (!userId) return;
            const session = getSessionStatus(new Date()).label;
            const { data: inserted, error } = await supabase
              .from("trades")
              .insert({
                user_id: userId,
                instrument: t.instrument,
                direction: t.direction,
                entry_price: t.entry ? Number(t.entry) : null,
                exit_price: t.exit ? Number(t.exit) : null,
                result_dollars: t.pl,
                emotion: t.emotion,
                notes: t.notes,
                session,
              })
              .select()
              .single();
            if (!error && inserted) {
              setShowLog(false);
              refreshTrades(userId);
              setJournalStatus("ACE is writing your journal...");
              try {
                await fetchAceJournal({ data: { tradeId: inserted.id } });
                setJournalStatus("Journal entry saved ✓");
                refreshTrades(userId);
              } catch {
                setJournalStatus("ACE journal failed — saved trade only");
              }
              setTimeout(() => setJournalStatus(null), 3000);
            }
          }}
          instruments={instruments}
        />
      )}

      {journalStatus && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-md text-xs animate-fade-in"
          style={{ background: "#141820", border: `1px solid ${TEAL}`, color: TEAL, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {journalStatus}
        </div>
      )}

      <AceChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} firstName={firstName} />
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors"
      style={{
        background: active ? "rgba(0,212,160,0.08)" : "transparent",
        color: active ? TEAL : "#9ca3af",
      }}
    >
      <span style={{ color: active ? TEAL : "#6b7280" }}>{icon}</span>
      <span style={{ fontFamily: "Inter, sans-serif" }}>{label}</span>
    </a>
  );
}

function StatCard({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <div
      className="p-4 px-5 rounded-[10px]"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="text-[10px] tracking-widest" style={{ color: "#6b7280" }}>{label}</div>
      <div className="text-2xl mt-2" style={{ color: valueColor || TEAL }}>{value}</div>
      <div className="text-[11px] mt-1" style={{ color: "#6b7280" }}>{sub}</div>
    </div>
  );
}

function TradeLogModal({ onClose, onSave, instruments }: { onClose: () => void; onSave: (t: any) => void; instruments: string[] }) {
  const [instrument, setInstrument] = useState("");
  const [direction, setDirection] = useState<"BUY" | "SELL" | null>(null);
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [emotion, setEmotion] = useState("");
  const [notes, setNotes] = useState("");

  const pl = useMemo(() => {
    const e = parseFloat(entry);
    const x = parseFloat(exit);
    if (!e || !x || !direction) return null;
    const diff = direction === "BUY" ? x - e : e - x;
    return diff * 100;
  }, [entry, exit, direction]);

  function save() {
    if (!instrument || !direction || !entry || !exit) return;
    onSave({
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      instrument,
      direction,
      entry,
      exit,
      pl: pl || 0,
      emotion,
      notes,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[14px] p-6 animate-fade-in"
        style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base" style={{ fontFamily: "Inter, sans-serif" }}>Log a trade</h3>
          <button onClick={onClose} style={{ color: "#6b7280" }}><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <Field label="INSTRUMENT">
            <input
              list="instruments"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded text-sm bg-transparent focus:outline-none"
              style={{ background: "#1c2230", border: "1px solid rgba(255,255,255,0.1)", color: "#e6e8eb" }}
              placeholder="EURUSD"
            />
            <datalist id="instruments">
              {instruments.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>

          <Field label="DIRECTION">
            <div className="grid grid-cols-2 gap-2">
              {(["BUY", "SELL"] as const).map((d) => {
                const active = direction === d;
                const color = d === "BUY" ? "#22c55e" : "#ef4444";
                return (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className="py-2.5 rounded text-sm font-medium"
                    style={{
                      background: active ? color : "transparent",
                      color: active ? "#0d0f12" : color,
                      border: `1px solid ${color}`,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ENTRY PRICE">
              <input type="number" value={entry} onChange={(e) => setEntry(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                style={{ background: "#1c2230", border: "1px solid rgba(255,255,255,0.1)", color: "#e6e8eb" }} />
            </Field>
            <Field label="EXIT PRICE">
              <input type="number" value={exit} onChange={(e) => setExit(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                style={{ background: "#1c2230", border: "1px solid rgba(255,255,255,0.1)", color: "#e6e8eb" }} />
            </Field>
          </div>

          {pl !== null && (
            <div className="text-sm" style={{ color: pl >= 0 ? TEAL : "#ef4444" }}>
              Result: {pl >= 0 ? "+" : "-"}${Math.abs(pl).toFixed(2)}
            </div>
          )}

          <Field label="HOW ARE YOU FEELING?">
            <div className="flex gap-2 flex-wrap">
              {["😤", "😰", "😐", "😊", "🎯", "😴"].map((e) => (
                <button key={e} onClick={() => setEmotion(e)}
                  className="w-10 h-10 rounded-full text-lg flex items-center justify-center"
                  style={{
                    background: emotion === e ? "rgba(0,212,160,0.15)" : "transparent",
                    border: `1px solid ${emotion === e ? TEAL : "rgba(255,255,255,0.1)"}`,
                  }}>
                  {e}
                </button>
              ))}
            </div>
          </Field>

          <Field label="NOTES">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What was your reason for this trade?"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none resize-none"
              style={{ background: "#1c2230", border: "1px solid rgba(255,255,255,0.1)", color: "#e6e8eb", fontFamily: "Inter, sans-serif" }} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded" style={{ color: "#9ca3af" }}>Cancel</button>
          <button onClick={save} className="px-4 py-2 text-sm rounded font-medium" style={{ background: TEAL, color: "#0d0f12" }}>
            Save trade
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] tracking-widest block mb-1.5" style={{ color: "#6b7280" }}>{label}</label>
      {children}
    </div>
  );
}
