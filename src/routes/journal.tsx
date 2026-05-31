import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, CalendarDays, BookOpen, Globe, Download, Settings,
  Bell, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { aceWeeklyReview, getLatestWeeklyReview } from "@/lib/ace.functions";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { hasAceAccess } from "@/lib/plan";

export const Route = createFileRoute("/journal")({
  head: () => ({ meta: [{ title: "Journal — Trader Coach" }] }),
  component: JournalPage,
});

const TEAL = "#00d4a0";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_SANS = "Inter, sans-serif";

const FILTERS = ["All", "Wins", "Losses", "High emotion", "Rule breaks"];
const RANGES = ["This week", "This month", "All time"];

function JournalPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>({});
  const [trades, setTrades] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const [calMonth, setCalMonth] = useState(new Date());
  const [filter, setFilter] = useState(() => (typeof window !== "undefined" && localStorage.getItem("journal.filter")) || "All");
  const [range, setRange] = useState(() => (typeof window !== "undefined" && localStorage.getItem("journal.range")) || "All time");
  useEffect(() => { localStorage.setItem("journal.filter", filter); }, [filter]);
  useEffect(() => { localStorage.setItem("journal.range", range); }, [range]);
  const [review, setReview] = useState<{ what_went_well: string; what_needs_work: string; focus_next_week: string; encouragement: string } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(false);
  const runWeeklyReview = useServerFn(aceWeeklyReview);
  const fetchLatestReview = useServerFn(getLatestWeeklyReview);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchLatestReview();
        if (r?.review) setReview(r.review);
      } catch {/* noop */}
    })();
  }, [fetchLatestReview]);

  async function generateReview() {
    setReviewLoading(true);
    setReviewError(false);
    try {
      const r = await runWeeklyReview();
      setReview(r.review);
    } catch {
      setReviewError(true);
    } finally {
      setReviewLoading(false);
    }
  }
  const [search, setSearch] = useState("");

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
      const { data: tr } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setTrades(tr || []);
    })();
  }, [navigate]);

  const firstName = (profile.full_name || "Trader").split(" ")[0];
  const initials = (profile.full_name || "T R").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const plan = (profile.plan || "PRO").toUpperCase();
  const unlocked = hasAceAccess(profile.plan);

  // Range filter
  const rangeStart = (() => {
    const d = new Date();
    if (range === "This week") { d.setDate(d.getDate() - 7); return d; }
    if (range === "This month") { d.setMonth(d.getMonth() - 1); return d; }
    return null;
  })();

  const filtered = trades.filter((t) => {
    if (rangeStart && new Date(t.created_at) < rangeStart) return false;
    const pl = Number(t.result_dollars) || 0;
    if (filter === "Wins" && pl <= 0) return false;
    if (filter === "Losses" && pl >= 0) return false;
    if (filter === "High emotion" && !["😤", "😰"].includes(t.emotion)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${t.instrument ?? ""} ${t.notes ?? ""} ${t.trade_date ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Stats
  const total = trades.length;
  const wins = trades.filter((t) => (Number(t.result_dollars) || 0) > 0).length;
  const losses = trades.filter((t) => (Number(t.result_dollars) || 0) < 0).length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const avgRR = (() => {
    const vals = trades
      .filter((t) => Number(t.risk_dollars) > 0)
      .map((t) => Math.abs(Number(t.result_dollars) || 0) / Number(t.risk_dollars));
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();
  const byDay = trades.reduce<Record<string, number>>((acc, t) => {
    const k = t.trade_date;
    if (!k) return acc;
    acc[k] = (acc[k] || 0) + (Number(t.result_dollars) || 0);
    return acc;
  }, {});
  const bestDay = Object.values(byDay).reduce((m, v) => (v > m ? v : m), 0);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0d0f12", color: "#e6e8eb", fontFamily: FONT_MONO }}>
      <Sidebar plan={plan} initials={initials} firstName={firstName} onSignOut={signOut} active="Journal" />

      <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
        <header className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{ background: "#141820", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 className="text-sm font-medium" style={{ fontFamily: FONT_SANS }}>Journal</h1>
          <div className="flex items-center gap-4 text-xs">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded font-medium"
              style={{ background: TEAL, color: "#0d0f12" }}>
              <Plus size={14} /> Log a trade
            </button>
            <span style={{ color: "#9ca3af" }}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <button className="p-1.5 rounded hover:bg-white/5" style={{ color: "#9ca3af" }}><Bell size={16} /></button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
              style={{ background: "rgba(0,212,160,0.15)", color: TEAL }}>{initials}</div>
          </div>
        </header>

        <main className="p-7 space-y-6 max-w-[1400px] w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-in">
            <Stat label="TOTAL TRADES" value={String(total)} sub="All time" />
            <Stat label="WIN RATE" value={`${winRate}%`} sub={`${wins}W · ${losses}L`} />
            <Stat label="AVG R:R" value={avgRR.toFixed(2)} sub="Target: 2.0" />
            <Stat label="BEST DAY" value={`$${Math.round(bestDay)}`} sub={total ? "Single-day best" : "No trades yet"} />
            <Stat label="CONSISTENCY" value={total >= 5 ? `${winRate}%` : "—"} sub="ACE grades your discipline" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7280" }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by instrument, date, notes..."
                    className="w-full pl-9 pr-3 py-2 rounded text-xs focus:outline-none"
                    style={{ background: "#1c2230", border: "1px solid rgba(255,255,255,0.1)", color: "#e6e8eb", fontFamily: FONT_SANS }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                      className="text-[11px] px-3 py-1 rounded-full transition-colors"
                      style={{
                        background: filter === f ? "rgba(0,212,160,0.12)" : "transparent",
                        color: filter === f ? TEAL : "#9ca3af",
                        border: `1px solid ${filter === f ? TEAL + "60" : "rgba(255,255,255,0.1)"}`,
                      }}>
                      {f}
                    </button>
                  ))}
                  <div className="ml-auto flex gap-1">
                    {RANGES.map((r) => (
                      <button key={r} onClick={() => setRange(r)}
                        className="text-[11px] px-2.5 py-1 rounded"
                        style={{
                          background: range === r ? "rgba(255,255,255,0.06)" : "transparent",
                          color: range === r ? "#e6e8eb" : "#6b7280",
                        }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {total === 0 && <ExampleEntry />}

              {filtered.length > 0 ? (
                filtered.map((t) => <TradeEntry key={t.id} t={t} />)
              ) : total > 0 ? (
                <div className="rounded-[10px] py-8 text-center text-xs" style={{ color: "#6b7280", border: "1px dashed rgba(255,255,255,0.12)", fontFamily: FONT_SANS }}>
                  No trades match these filters.
                </div>
              ) : (
                <div className="rounded-[10px] flex flex-col items-center justify-center py-12 gap-3 text-center"
                  style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
                  <div className="text-3xl">📓</div>
                  <div className="text-sm" style={{ fontFamily: FONT_SANS }}>No journal entries yet.</div>
                  <div className="text-xs max-w-xs" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
                    Log your first trade and ACE will write your journal entry automatically.
                  </div>
                  <button onClick={() => navigate({ to: "/dashboard" })} className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ background: TEAL, color: "#0d0f12" }}>
                    <Plus size={14} /> Log your first trade
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4 animate-fade-in">
              <Card title="ACE WEEKLY REVIEW" teal>
                {!unlocked ? (
                  <div className="mt-2 flex flex-col items-center text-center gap-3 py-4">
                    <Lock size={20} style={{ color: TEAL }} />
                    <p className="text-xs" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
                      Upgrade to Pro for AI weekly reviews and journal writing.
                    </p>
                    <Link to="/pricing" className="text-xs px-4 py-1.5 rounded font-medium"
                      style={{ background: TEAL, color: "#0d0f12", fontFamily: FONT_MONO }}>
                      Upgrade →
                    </Link>
                  </div>
                ) : review ? (
                  <div className="mt-2 space-y-3">
                    <ReviewSection label="WHAT WENT WELL" text={review.what_went_well} />
                    <ReviewSection label="WHAT NEEDS WORK" text={review.what_needs_work} />
                    <ReviewSection label="FOCUS NEXT WEEK" text={review.focus_next_week} />
                    <ReviewSection label="ENCOURAGEMENT" text={review.encouragement} />
                    <button
                      onClick={generateReview}
                      disabled={reviewLoading}
                      className="text-[10px] tracking-widest disabled:opacity-50"
                      style={{ color: TEAL, fontFamily: FONT_MONO }}
                    >
                      {reviewLoading ? "REGENERATING..." : "REGENERATE →"}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed mt-2" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
                      {reviewLoading
                        ? "ACE is analyzing your week..."
                        : reviewError
                        ? "ACE is thinking... tap to retry."
                        : "Click below to generate this week's review."}
                    </p>
                    <button
                      onClick={generateReview}
                      disabled={reviewLoading || total === 0}
                      className="mt-3 text-xs px-3 py-1.5 rounded disabled:opacity-50"
                      style={{ background: TEAL, color: "#0d0f12", fontFamily: FONT_MONO }}
                    >
                      {reviewLoading ? "..." : reviewError ? "Retry" : "Generate weekly review"}
                    </button>
                  </>
                )}
              </Card>

              <Card title="EMOTION TRACKER">
                <EmotionBars trades={trades} />
                <p className="text-[11px] mt-3" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
                  {total ? "Your emotional patterns so far." : "Your emotional patterns will appear here as you log trades."}
                </p>
              </Card>
            </div>
          </div>

          <Card title="TRADING CALENDAR" subtitle="Daily P&L overview — green days, red days, and rest days at a glance.">
            <div className="flex items-center justify-between mt-3 mb-3">
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                className="p-1 rounded hover:bg-white/5" style={{ color: "#9ca3af" }}>
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs" style={{ fontFamily: FONT_SANS }}>
                {calMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                className="p-1 rounded hover:bg-white/5" style={{ color: "#9ca3af" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <CalendarGrid month={calMonth} today={now} byDay={byDay} />
          </Card>
        </main>
      </div>
    </div>
  );
}

function ExampleEntry() {
  return (
    <div className="relative p-5 rounded-[10px] animate-fade-in"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="absolute top-3 right-3 text-[9px] tracking-widest px-1.5 py-0.5 rounded"
        style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
        EXAMPLE
      </span>

      <div className="flex flex-wrap items-center gap-2 mb-4 pr-20">
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>EURUSD</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>BUY</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,212,160,0.15)", color: TEAL }}>+$220</span>
        <span className="ml-auto text-[11px]" style={{ color: "#6b7280" }}>Fri 30 May · 10:42am</span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-[10px] tracking-widest mb-1.5" style={{ color: "#6b7280" }}>TRADE ENTRY</div>
          <p className="text-xs leading-relaxed" style={{ color: "#d1d5db", fontFamily: FONT_SANS }}>
            Entered EURUSD long at 1.0812 during London session. The 4H trend was bullish and entry was clean off the daily pivot at 1.0808. Exited at 1.0834 for +$220. Risk was $240 — within the 1% rule.
          </p>
        </div>
        <div>
          <div className="text-[10px] tracking-widest mb-1.5" style={{ color: TEAL }}>ACE'S NOTE</div>
          <p className="text-xs leading-relaxed" style={{ color: "#d1d5db", fontFamily: FONT_SANS }}>
            Well-executed. You waited for confirmation and respected your stop. Emotional state was focused — this is the version of you that builds a career. One thing to watch: you entered slightly early on the M15. Next time wait for the candle close.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-[11px]" style={{ color: "#d1d5db" }}>🎯 In the zone</span>
        <span className="text-[11px]" style={{ color: "#6b7280" }}>R:R: 1:1.8</span>
        <div className="ml-auto flex gap-1">
          <button className="p-1.5 rounded hover:bg-white/5" style={{ color: "#6b7280" }}><Pencil size={13} /></button>
          <button className="p-1.5 rounded hover:bg-white/5" style={{ color: "#6b7280" }}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function CalendarGrid({ month, today, byDay }: { month: Date; today: Date; byDay: Record<string, number> }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && m === today.getMonth() && year === today.getFullYear();

  const keyFor = (d: number) =>
    `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-[10px] text-center py-1" style={{ color: "#6b7280" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const pnl = d ? byDay[keyFor(d)] : undefined;
          const positive = pnl !== undefined && pnl > 0;
          const negative = pnl !== undefined && pnl < 0;
          const bg = positive
            ? "rgba(0,212,160,0.15)"
            : negative
            ? "rgba(239,68,68,0.15)"
            : d ? "rgba(255,255,255,0.02)" : "transparent";
          return (
            <div key={i} className="aspect-square rounded p-1.5 text-[11px] flex flex-col"
              style={{
                background: bg,
                border: d && isToday(d) ? `1px solid ${TEAL}` : "1px solid rgba(255,255,255,0.04)",
                color: d ? "#9ca3af" : "transparent",
              }}>
              <span>{d}</span>
              {pnl !== undefined && (
                <span className="text-[9px] mt-auto" style={{ color: positive ? TEAL : "#ef4444" }}>
                  {positive ? "+" : "-"}${Math.abs(Math.round(pnl))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TradeEntry({ t }: { t: any }) {
  const pl = Number(t.result_dollars) || 0;
  const isWin = pl > 0;
  const dt = new Date(t.created_at);
  return (
    <div className="relative p-5 rounded-[10px] animate-fade-in"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>{t.instrument || "—"}</span>
        {t.direction && (
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: t.direction === "BUY" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: t.direction === "BUY" ? "#22c55e" : "#ef4444" }}>
            {t.direction}
          </span>
        )}
        <span className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: isWin ? "rgba(0,212,160,0.15)" : "rgba(239,68,68,0.15)", color: isWin ? TEAL : "#ef4444" }}>
          {isWin ? "+" : pl < 0 ? "-" : ""}${Math.abs(pl).toFixed(2)}
        </span>
        <span className="ml-auto text-[11px]" style={{ color: "#6b7280" }}>
          {dt.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })} · {(t.trade_time || "").slice(0, 5)}
        </span>
      </div>
      {t.notes && (
        <div>
          <div className="text-[10px] tracking-widest mb-1.5" style={{ color: "#6b7280" }}>TRADE NOTES</div>
          <p className="text-xs leading-relaxed" style={{ color: "#d1d5db", fontFamily: FONT_SANS }}>{t.notes}</p>
        </div>
      )}
      {t.ace_note && (
        <div className="mt-3">
          <div className="text-[10px] tracking-widest mb-1.5" style={{ color: TEAL }}>ACE'S NOTE</div>
          <p className="text-xs leading-relaxed" style={{ color: "#d1d5db", fontFamily: FONT_SANS }}>{t.ace_note}</p>
        </div>
      )}
      <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {t.emotion && <span className="text-[11px]" style={{ color: "#d1d5db" }}>{t.emotion}</span>}
        {t.entry_price && t.exit_price && (
          <span className="text-[11px]" style={{ color: "#6b7280" }}>Entry {t.entry_price} → Exit {t.exit_price}</span>
        )}
      </div>
    </div>
  );
}

function EmotionBars({ trades }: { trades: any[] }) {
  const emojis = ["😤", "😰", "😐", "😊", "🎯", "😴"];
  const counts = emojis.map((e) => trades.filter((t) => t.emotion === e).length);
  const max = Math.max(1, ...counts);
  return (
    <div className="flex items-end gap-2 h-24 mt-3">
      {emojis.map((e, i) => (
        <div key={e} className="flex-1 flex flex-col items-center gap-1 justify-end">
          <div className="w-full rounded-t" style={{ height: `${Math.max(2, (counts[i] / max) * 80)}px`, background: counts[i] ? TEAL : "rgba(255,255,255,0.08)" }} />
          <span className="text-sm">{e}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-4 px-5 rounded-[10px]"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[10px] tracking-widest" style={{ color: "#6b7280" }}>{label}</div>
      <div className="text-2xl mt-2" style={{ color: TEAL }}>{value}</div>
      <div className="text-[11px] mt-1" style={{ color: "#6b7280" }}>{sub}</div>
    </div>
  );
}

function Card({ title, subtitle, teal, children }: { title: string; subtitle?: string; teal?: boolean; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-[10px]"
      style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[10px] tracking-widest" style={{ color: teal ? TEAL : "#9ca3af" }}>{title}</div>
      {subtitle && (
        <div className="text-[11px] mt-1" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>{subtitle}</div>
      )}
      {children}
    </div>
  );
}

function Sidebar({ plan, initials, firstName, onSignOut, active }: {
  plan: string; initials: string; firstName: string; onSignOut: () => void; active: string;
}) {
  const items = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: CalendarDays, label: "Today's Session", to: "#" },
    { icon: BookOpen, label: "Journal", to: "/journal" },
    { icon: Globe, label: "Market Intel", to: "#" },
    { icon: Download, label: "Download App", to: "#" },
    { icon: Settings, label: "Settings", to: "#" },
  ];
  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[220px] z-20"
      style={{ background: "#141820", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded" style={{ background: TEAL }} />
          <span className="font-semibold tracking-tight" style={{ color: TEAL }}>Trader Coach</span>
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
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#22c55e" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#22c55e" }} />
          </span>
          <span style={{ color: "#9ca3af" }}>ACE is ready</span>
        </div>
        <SidebarUserMenu initials={initials} firstName={firstName} />
      </div>
    </aside>
  );
}

function ReviewSection({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-widest mb-1" style={{ color: TEAL, fontFamily: FONT_MONO }}>
        {label}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "#d1d5db", fontFamily: FONT_SANS }}>
        {text}
      </p>
    </div>
  );
}
