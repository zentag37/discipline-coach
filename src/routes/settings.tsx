import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, CalendarDays, BookOpen, Globe, Download, Settings as SettingsIcon,
  Bell, User, Shield, BarChart3, Bot, Mic, BellRing, CreditCard, Lock, Check, X, Plus, Play, Square, Radio,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { speakAsACE, stopVoice, subscribeVoice } from "@/lib/ace-voice";
import { useServerFn } from "@tanstack/react-start";
import { getSubscriptionInfo, cancelSubscription } from "@/lib/subscription.functions";
import { normalizePlan, planLabel } from "@/lib/plan";
import { SidebarUserMenu } from "@/components/SidebarUserMenu";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — TradeWithAce" }] }),
  component: SettingsPage,
});

const TEAL = "#ef4444";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const GREEN = "#ef4444";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_SANS = "Inter, sans-serif";

const NAV = [
  { id: "profile", label: "Profile", icon: User },
  { id: "risk", label: "Risk Rules", icon: Shield },
  { id: "trading", label: "Trading Setup", icon: BarChart3 },
  { id: "ace", label: "ACE Mentor", icon: Bot },
  { id: "voice", label: "Voice Assistant", icon: Mic },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "security", label: "Security", icon: Lock },
];

function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>({});
  const [form, setForm] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState("profile");
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/login" }); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const base: any = data || { full_name: user.user_metadata?.full_name || user.email?.split("@")[0], email: user.email };
      setProfile(base);
      setForm({
        full_name: base.full_name || "",
        email: base.email || user.email,
        country: base.country || "United States",
        timezone: base.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        experience: base.experience || "Intermediate",
        account_size: base.account_size || 25000,
        risk_per_trade: base.risk_per_trade || 1,
        daily_loss_limit: base.daily_loss_limit || 3,
        max_trades_per_day: base.max_trades_per_day || 3,
        prop_firm: false, prop_firm_name: "FTMO",
        emergency_stop: false,
        broker: base.broker || "IC Markets",
        platform: base.platform || "MT4",
        session: base.session || ["London"],
        assets: base.assets || ["Forex"],
        instruments: base.instruments?.length ? base.instruments : ["EURUSD", "NAS100", "GOLD"],
        trading_style: base.trading_style || "Day trader",
        ace_name: base.ace_name || "ACE",
        coaching_style: base.coaching_style || "Balanced",
        tip_frequency: "Every trade",
        floating_quotes: true,
        overtrade_reminder: true,
        revenge_reminder: true,
        daily_debrief: true,
        voice_enabled: base.voice_enabled ?? true,
        voice_personality: base.voice_style || "Marcus",
        speaking_rate: "Normal",
        language: "English (US)",
        speak_open: true, speak_limit: true, speak_loss: true, speak_wins: true, speak_after_loss: true,
        notif_session_open: true, notif_session_minutes: 15,
        notif_loss_limit: true, notif_trade_limit: true, notif_calendar: true,
        notif_weekly: true, notif_debrief: true, notif_email: true, notif_push: false,
      });
    })();
  }, [navigate]);

  const set = (k: string, v: any) => { setForm((f: any) => ({ ...f, [k]: v })); setDirty(true); };

  const [voicePlaying, setVoicePlaying] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  useEffect(() => {
    const unsub = subscribeVoice((p) => {
      setVoicePlaying(p);
      if (!p) setPreviewing(null);
    });
    return () => { unsub(); };
  }, []);

  async function toggleVoiceEnabled(v: boolean) {
    set("voice_enabled", v);
    if (!v) stopVoice();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ voice_enabled: v }).eq("id", user.id);
  }

  function previewVoice(name: string) {
    if (previewing === name && voicePlaying) {
      stopVoice();
      return;
    }
    setPreviewing(name);
    speakAsACE(
      "Good morning. I'm ACE, your trading mentor. Stay disciplined today.",
      name.toLowerCase(),
      { rate: form.speaking_rate },
    ).catch(() => setPreviewing(null));
  }

  type SubInfo = { plan: string; status: string; subscriptionId: string | null; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean };
  const fetchSubInfo = useServerFn(getSubscriptionInfo);
  const runCancel = useServerFn(cancelSubscription);
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    (async () => {
      try { setSubInfo(await fetchSubInfo()); } catch {/* noop */}
    })();
  }, [fetchSubInfo]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await runCancel();
      toast.success("Subscription cancelled");
      setConfirmCancel(false);
      setSubInfo((s) => s ? { ...s, status: "cancelled", plan: "solo" } : s);
      setProfile((p: any) => ({ ...p, plan: "solo", subscription_status: "cancelled" }));
    } catch (e: any) {
      toast.error(e?.message || "Could not cancel");
    } finally {
      setCancelling(false);
    }
  }

  const firstName = (profile?.full_name || "Trader").split(" ")[0];
  const initials = (form?.full_name || profile?.full_name || "T R").split(" ").map((s: string) => s?.[0] || "").slice(0, 2).join("").toUpperCase();
  const plan = (profile?.plan || "PRO").toUpperCase();

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0f12", color: "#9ca3af", fontFamily: FONT_MONO }}>
        <div className="text-xs">Loading settings…</div>
      </div>
    );
  }

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form, onboarded: true });
    if (error) { toast.error("Could not save"); return; }
    setDirty(false);
    toast.success("Saved ✓");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const scrollTo = (id: string) => {
    setActive(id);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0d0f12", color: "#e6e8eb", fontFamily: FONT_MONO }}>
      <Sidebar plan={plan} initials={initials} firstName={firstName} onSignOut={signOut} />

      <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
        <header className="h-14 flex items-center justify-between px-6 sticky top-0 z-20"
          style={{ background: "#141820", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 className="text-sm font-medium" style={{ fontFamily: FONT_SANS }}>Settings</h1>
          <button
            disabled={!dirty}
            onClick={save}
            className="text-xs px-4 py-1.5 rounded font-medium transition-all"
            style={{
              background: dirty ? TEAL : "rgba(255,255,255,0.05)",
              color: dirty ? "#0d0f12" : "#6b7280",
              cursor: dirty ? "pointer" : "not-allowed",
            }}>
            Save changes
          </button>
        </header>

        <div className="flex flex-1">
          {/* Secondary nav */}
          <nav className="hidden md:block w-[180px] flex-shrink-0 p-4 sticky top-14 self-start"
            style={{ background: "#141820", height: "calc(100vh - 56px)" }}>
            <div className="space-y-0.5">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => scrollTo(n.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs text-left transition-colors"
                  style={{
                    background: active === n.id ? "rgba(239,68,68,0.08)" : "transparent",
                    color: active === n.id ? TEAL : "#9ca3af",
                  }}>
                  <n.icon size={13} />
                  <span style={{ fontFamily: FONT_SANS }}>{n.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile horizontal tab strip */}
          <nav className="md:hidden sticky top-14 z-10 overflow-x-auto whitespace-nowrap px-3 py-2 flex gap-1"
            style={{ background: "#141820", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {NAV.map((n) => (
              <button key={n.id} onClick={() => scrollTo(n.id)}
                className="text-[11px] px-3 py-1.5 rounded-full flex-shrink-0"
                style={{
                  background: active === n.id ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                  color: active === n.id ? TEAL : "#9ca3af",
                }}>
                {n.label}
              </button>
            ))}
          </nav>

          <main className="flex-1 p-7 max-w-[820px] space-y-10">
            {/* Profile */}
            <Section id="profile" title="Profile" refs={refs}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl"
                  style={{ background: "rgba(239,68,68,0.15)", color: TEAL }}>{initials}</div>
                <button className="text-xs hover:underline" style={{ color: "#9ca3af" }}>Change photo</button>
              </div>
              <Field label="FULL NAME">
                <Input value={form.full_name} onChange={(v) => set("full_name", v)} />
              </Field>
              <Field label="EMAIL">
                <div className="relative">
                  <Input value={form.email} onChange={(v) => set("email", v)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] flex items-center gap-0.5"
                    style={{ color: TEAL }}>
                    Verified <Check size={11} />
                  </span>
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="COUNTRY">
                  <Select value={form.country} onChange={(v) => set("country", v)}
                    options={["United States", "United Kingdom", "Australia", "Canada", "Germany", "Other"]} />
                </Field>
                <Field label="TIMEZONE">
                  <Select value={form.timezone} onChange={(v) => set("timezone", v)}
                    options={[form.timezone, "UTC", "America/New_York", "Europe/London", "Asia/Tokyo"].filter((v, i, a) => a.indexOf(v) === i)} />
                </Field>
              </div>
              <Field label="TRADING EXPERIENCE">
                <div className="grid grid-cols-2 gap-2">
                  {["Beginner", "Intermediate", "Advanced", "Professional"].map((e) => (
                    <OptionCard key={e} label={e} active={form.experience === e} onClick={() => set("experience", e)} />
                  ))}
                </div>
              </Field>
            </Section>

            {/* Risk */}
            <Section id="risk" title="Risk Rules" refs={refs}
              badge={<span className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(245,158,11,0.12)", color: AMBER, border: `1px solid ${AMBER}40` }}>
                ACE enforces these every session
              </span>}>
              <Field label="ACCOUNT SIZE">
                <Select value={String(form.account_size)} onChange={(v) => set("account_size", Number(v))}
                  options={["1000", "5000", "10000", "25000", "50000", "100000", "250000"].map((v) => v)} format={(v) => `€${Number(v).toLocaleString()}`} />
              </Field>
              <Field label="RISK PER TRADE">
                <Pills value={String(form.risk_per_trade)} onChange={(v) => set("risk_per_trade", Number(v))}
                  options={["0.5", "1", "1.5", "2", "Custom"]} suffix="%" />
              </Field>
              <Field label="DAILY LOSS LIMIT">
                <Pills value={String(form.daily_loss_limit)} onChange={(v) => set("daily_loss_limit", Number(v))}
                  options={["1", "2", "3", "5", "Custom"]} suffix="%" />
              </Field>
              <Field label="MAX TRADES PER DAY">
                <Pills value={String(form.max_trades_per_day)} onChange={(v) => set("max_trades_per_day", Number(v))}
                  options={["1", "2", "3", "5", "Custom"]} />
              </Field>

              <div className="p-4 rounded-[10px] mt-2"
                style={{ background: "#1c2230", borderLeft: `3px solid ${TEAL}` }}>
                <div className="text-[10px] tracking-widest mb-2" style={{ color: TEAL }}>ACE WILL ENFORCE THESE RULES</div>
                <div className="text-xs space-y-1" style={{ color: "#d1d5db" }}>
                  <div>→ Max risk per trade: <span style={{ color: TEAL }}>${Math.round((form.account_size * form.risk_per_trade) / 100)}</span> ({form.risk_per_trade}% of ${form.account_size?.toLocaleString()})</div>
                  <div>→ Daily stop loss: <span style={{ color: TEAL }}>${Math.round((form.account_size * form.daily_loss_limit) / 100)}</span> ({form.daily_loss_limit}% of ${form.account_size?.toLocaleString()})</div>
                  <div>→ Max trades today: <span style={{ color: TEAL }}>{form.max_trades_per_day}</span></div>
                </div>
              </div>

              <Toggle label="Prop firm mode" value={form.prop_firm} onChange={(v) => set("prop_firm", v)} />
              {form.prop_firm && (
                <Field label="FIRM">
                  <Select value={form.prop_firm_name} onChange={(v) => set("prop_firm_name", v)}
                    options={["FTMO", "MyForexFunds", "The Funded Trader", "Topstep", "Other"]} />
                </Field>
              )}
              <Toggle label="Emergency stop"
                sub="If I lose 3 trades in a row, lock me out for the rest of the session"
                value={form.emergency_stop} onChange={(v) => set("emergency_stop", v)} />
            </Section>

            {/* Trading Setup */}
            <Section id="trading" title="Trading Setup" refs={refs}>
              <Field label="BROKER">
                <Input value={form.broker} onChange={(v) => set("broker", v)} />
              </Field>
              <Field label="PLATFORM">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {["MT4", "MT5", "TradingView", "cTrader", "NinjaTrader"].map((p) => (
                    <OptionCard key={p} label={p} active={form.platform === p} onClick={() => set("platform", p)} />
                  ))}
                </div>
              </Field>
              <Field label="TRADING SESSION">
                <MultiPills value={form.session} onChange={(v) => set("session", v)}
                  options={["Asia", "London", "New York", "Overlap"]} />
              </Field>
              <Field label="ASSET CLASSES">
                <MultiPills value={form.assets} onChange={(v) => set("assets", v)}
                  options={["Forex", "Indices", "Commodities", "Crypto", "Stocks"]} />
              </Field>
              <Field label="INSTRUMENTS WATCHLIST">
                <ChipInput value={form.instruments} onChange={(v) => set("instruments", v)} />
              </Field>
              <Field label="TRADING STYLE">
                <Pills value={form.trading_style} onChange={(v) => set("trading_style", v)}
                  options={["Scalper", "Day trader", "Swing trader", "Position trader"]} />
              </Field>
            </Section>

            {/* ACE */}
            <Section id="ace" title="ACE Mentor" refs={refs}
              badge={<span className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(239,68,68,0.12)", color: TEAL, border: `1px solid ${TEAL}40` }}>AI</span>}>
              <Field label="WHAT DO YOU WANT TO CALL YOUR MENTOR?">
                <Input value={form.ace_name} onChange={(v) => set("ace_name", v)} placeholder="ACE" />
              </Field>
              <Field label="COACHING STYLE">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { id: "Balanced", icon: "💬", desc: "Firm on rules, supportive emotionally" },
                    { id: "Strict", icon: "⚡", desc: "Rules first, no exceptions" },
                    { id: "Supportive", icon: "🤝", desc: "Focus on confidence & emotion" },
                  ].map((c) => (
                    <button key={c.id} onClick={() => set("coaching_style", c.id)}
                      className="p-3 rounded-[10px] text-left transition-all"
                      style={{
                        background: form.coaching_style === c.id ? "rgba(239,68,68,0.08)" : "#1c2230",
                        border: `1px solid ${form.coaching_style === c.id ? TEAL : "rgba(255,255,255,0.08)"}`,
                      }}>
                      <div className="text-lg mb-1">{c.icon}</div>
                      <div className="text-xs" style={{ fontFamily: FONT_SANS, color: "#e6e8eb" }}>{c.id}</div>
                      <div className="text-[10px] mt-1" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>{c.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="TIP FREQUENCY">
                <Pills value={form.tip_frequency} onChange={(v) => set("tip_frequency", v)}
                  options={["Every trade", "Every 30 min", "Session open & close only"]} />
              </Field>
              <Toggle label="Show quotes in floating window" value={form.floating_quotes} onChange={(v) => set("floating_quotes", v)} />
              <Toggle label="Remind me about overtrading" value={form.overtrade_reminder} onChange={(v) => set("overtrade_reminder", v)} />
              <Toggle label="Remind me about revenge trading" value={form.revenge_reminder} onChange={(v) => set("revenge_reminder", v)} />
              <Toggle label="Daily session debrief" sub="ACE summarises your session at close"
                value={form.daily_debrief} onChange={(v) => set("daily_debrief", v)} />
            </Section>

            {/* Voice */}
            <Section id="voice" title="Voice Assistant" refs={refs}>
              <Toggle label="Enable voice assistant" value={form.voice_enabled} onChange={toggleVoiceEnabled} large />
              <div style={{ opacity: form.voice_enabled ? 1 : 0.4, pointerEvents: form.voice_enabled ? "auto" : "none" }} className="space-y-5">
                <Field label="VOICE PERSONALITY">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Marcus", icon: "🎯", desc: "Direct & focused" },
                      { name: "Sophia", icon: "💫", desc: "Calm & analytical" },
                      { name: "Rex", icon: "⚡", desc: "High-energy coach" },
                      { name: "Aria", icon: "🧘", desc: "Mindful & steady" },
                    ].map((v) => {
                      const isPreviewing = previewing === v.name && voicePlaying;
                      return (
                      <div key={v.name} onClick={() => set("voice_personality", v.name)}
                        className="p-3 rounded-[10px] cursor-pointer transition-all"
                        style={{
                          background: form.voice_personality === v.name ? "rgba(239,68,68,0.08)" : "#1c2230",
                          border: `1px solid ${form.voice_personality === v.name ? TEAL : "rgba(255,255,255,0.08)"}`,
                        }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg">{v.icon}</div>
                            <div className="text-xs mt-1" style={{ fontFamily: FONT_SANS }}>{v.name}</div>
                            <div className="text-[10px]" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>{v.desc}</div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); previewVoice(v.name); }}
                            className="text-[10px] px-2 py-1 rounded flex items-center gap-1"
                            style={{
                              border: `1px solid ${isPreviewing ? TEAL : "rgba(255,255,255,0.15)"}`,
                              color: isPreviewing ? TEAL : "#9ca3af",
                            }}>
                            {isPreviewing ? <><Square size={9} /> Stop</> : <><Play size={9} /> Preview</>}
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </Field>
                <Field label="SPEAKING RATE">
                  <Pills value={form.speaking_rate} onChange={(v) => set("speaking_rate", v)} options={["Slow", "Normal", "Fast"]} />
                </Field>
                <Field label="LANGUAGE">
                  <Select value={form.language} onChange={(v) => set("language", v)}
                    options={["English (US)", "English (UK)", "Spanish", "French", "German", "Japanese", "Chinese"]} />
                </Field>
                <Toggle label="Speak on session open" value={form.speak_open} onChange={(v) => set("speak_open", v)} />
                <Toggle label="Speak when trade limit reached" value={form.speak_limit} onChange={(v) => set("speak_limit", v)} />
                <Toggle label="Speak when daily loss limit hit" value={form.speak_loss} onChange={(v) => set("speak_loss", v)} />
                <Toggle label="Speak encouragement after wins" value={form.speak_wins} onChange={(v) => set("speak_wins", v)} />
                <Toggle label="Speak after losses" value={form.speak_after_loss} onChange={(v) => set("speak_after_loss", v)} />
                <p className="text-[10px]" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
                  TradeWithAce uses your microphone only to play audio. We never record or store voice data.
                </p>
              </div>
            </Section>

            {/* Notifications */}
            <Section id="notifications" title="Notifications" refs={refs}>
              <Toggle label="Session open reminder" value={form.notif_session_open} onChange={(v) => set("notif_session_open", v)} />
              {form.notif_session_open && (
                <Field label="MINUTES BEFORE">
                  <Pills value={String(form.notif_session_minutes)} onChange={(v) => set("notif_session_minutes", Number(v))}
                    options={["5", "15", "30", "60"]} suffix=" min" />
                </Field>
              )}
              <Toggle label="Daily loss limit warning" value={form.notif_loss_limit} onChange={(v) => set("notif_loss_limit", v)} />
              <Toggle label="Trade limit reached alert" value={form.notif_trade_limit} onChange={(v) => set("notif_trade_limit", v)} />
              <Toggle label="Economic calendar alerts" sub="High-impact events on your instruments"
                value={form.notif_calendar} onChange={(v) => set("notif_calendar", v)} />
              <Toggle label="Weekly performance review ready" value={form.notif_weekly} onChange={(v) => set("notif_weekly", v)} />
              <Toggle label="ACE daily debrief" value={form.notif_debrief} onChange={(v) => set("notif_debrief", v)} />
              <Toggle label="Email notifications" value={form.notif_email} onChange={(v) => set("notif_email", v)} />
              <Toggle label="Browser push notifications" value={form.notif_push} onChange={(v) => set("notif_push", v)} />
              {!form.notif_push && (
                <button className="text-xs px-3 py-1.5 rounded"
                  style={{ border: `1px solid ${TEAL}`, color: TEAL }}>
                  Enable browser notifications
                </button>
              )}
            </Section>

            {/* Subscription */}
            <Section id="subscription" title="Subscription" refs={refs}>
              {(() => {
                const tier = normalizePlan(subInfo?.plan ?? profile.plan);
                const status = subInfo?.status ?? profile.subscription_status ?? "inactive";
                const statusCfg =
                  status === "active" ? { label: "Active", color: GREEN }
                  : status === "past_due" ? { label: "Past due", color: AMBER }
                  : status === "cancelled" ? { label: "Cancelled", color: RED }
                  : { label: "Inactive", color: "#6b7280" };
                const renewal = subInfo?.currentPeriodEnd
                  ? new Date(subInfo.currentPeriodEnd * 1000).toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" })
                  : null;
                return (
                  <div className="p-5 rounded-[10px]"
                    style={{ background: "#141820", border: `2px solid ${TEAL}` }}>
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <div className="text-3xl tracking-tight uppercase" style={{ color: TEAL, fontFamily: FONT_MONO }}>
                          {planLabel(tier)}
                        </div>
                        <div className="mt-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full"
                            style={{ background: `${statusCfg.color}22`, color: statusCfg.color, border: `1px solid ${statusCfg.color}55` }}>
                            {statusCfg.label}
                          </span>
                        </div>
                        {status === "active" && renewal && (
                          <div className="text-[11px] mt-2" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
                            {subInfo?.cancelAtPeriodEnd ? `Ends ${renewal}` : `Renews ${renewal}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-5 pt-4 gap-2 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      {tier === "pro" && (
                        <a href="/pricing" className="text-xs px-4 py-1.5 rounded"
                          style={{ border: `1px solid ${TEAL}`, color: TEAL }}>
                          Upgrade to Elite →
                        </a>
                      )}
                      {tier === "solo" && (
                        <a href="/pricing" className="text-xs px-4 py-1.5 rounded font-medium"
                          style={{ background: TEAL, color: "#0d0f12" }}>
                          Upgrade to Pro →
                        </a>
                      )}
                      {subInfo?.subscriptionId && status === "active" && !confirmCancel && (
                        <button onClick={() => setConfirmCancel(true)} className="text-xs hover:underline" style={{ color: RED }}>
                          Cancel subscription
                        </button>
                      )}
                    </div>
                    {confirmCancel && (
                      <div className="mt-4 p-4 rounded-[10px]" style={{ background: "rgba(239,68,68,0.08)", border: `1px solid ${RED}55` }}>
                        <div className="text-xs" style={{ color: "#e6e8eb", fontFamily: FONT_SANS }}>
                          Cancel your subscription? You'll lose access to {planLabel(tier)} features at the end of the period.
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={handleCancel} disabled={cancelling}
                            className="text-xs px-3 py-1.5 rounded disabled:opacity-50"
                            style={{ background: RED, color: "#0d0f12" }}>
                            {cancelling ? "Cancelling..." : "Yes, cancel"}
                          </button>
                          <button onClick={() => setConfirmCancel(false)} disabled={cancelling}
                            className="text-xs px-3 py-1.5 rounded"
                            style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#9ca3af" }}>
                            Keep subscription
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </Section>

            {/* Security */}
            <Section id="security" title="Security" refs={refs}>
              <div className="space-y-3">
                <div className="text-[10px] tracking-widest" style={{ color: "#9ca3af" }}>CHANGE PASSWORD</div>
                <Input placeholder="Current password" type="password" />
                <Input placeholder="New password" type="password" />
                <Input placeholder="Confirm new password" type="password" />
                <button className="text-xs px-4 py-1.5 rounded"
                  style={{ background: TEAL, color: "#0d0f12" }}>
                  Update password
                </button>
              </div>

              <Toggle label="Two-factor authentication" sub="Add an extra layer of security to your account" value={false} onChange={() => {}} />

              <div>
                <div className="text-[10px] tracking-widest mb-2" style={{ color: "#9ca3af" }}>ACTIVE SESSIONS</div>
                <table className="w-full text-xs">
                  <thead><tr style={{ color: "#6b7280" }}>
                    {["Device", "Location", "Last active"].map((h) => <th key={h} className="text-left py-2 font-normal text-[10px] tracking-widest">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    <tr style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="py-2">Chrome · macOS</td><td>{form.country}</td><td style={{ color: TEAL }}>Now</td>
                    </tr>
                    <tr style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="py-2">Safari · iPhone</td><td>{form.country}</td><td style={{ color: "#6b7280" }}>2 days ago</td>
                    </tr>
                  </tbody>
                </table>
                <button className="mt-3 text-xs hover:underline" style={{ color: RED }}>Sign out all devices</button>
              </div>

              <div className="p-4 rounded-[10px]"
                style={{ background: "rgba(239,68,68,0.05)", border: `1px solid ${RED}30` }}>
                <div className="text-xs font-medium mb-1" style={{ color: RED, fontFamily: FONT_SANS }}>Delete account</div>
                <div className="text-[11px] mb-3" style={{ color: "#9ca3af", fontFamily: FONT_SANS }}>
                  Permanently delete your account and all trading data. This cannot be undone.
                </div>
                <button className="text-xs px-3 py-1.5 rounded"
                  style={{ border: `1px solid ${RED}`, color: RED }}>
                  Delete my account
                </button>
              </div>
            </Section>
          </main>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, badge, children, refs }: { id: string; title: string; badge?: React.ReactNode; children: React.ReactNode; refs: React.MutableRefObject<Record<string, HTMLElement | null>> }) {
  return (
    <section ref={(el) => { refs.current[id] = el; }} className="scroll-mt-20 space-y-4">
      <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 className="text-[11px] tracking-widest uppercase" style={{ color: "#9ca3af" }}>{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] tracking-widest block" style={{ color: "#6b7280" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value?: string; onChange?: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 rounded text-sm focus:outline-none"
      style={{ background: "#1c2230", border: "1px solid rgba(255,255,255,0.1)", color: "#e6e8eb", fontFamily: FONT_SANS }} />
  );
}

function Select({ value, onChange, options, format }: { value: string; onChange: (v: string) => void; options: string[]; format?: (v: string) => string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded text-sm focus:outline-none appearance-none"
      style={{ background: "#1c2230", border: "1px solid rgba(255,255,255,0.1)", color: "#e6e8eb", fontFamily: FONT_SANS }}>
      {options.map((o) => <option key={o} value={o}>{format ? format(o) : o}</option>)}
    </select>
  );
}

function Pills({ value, onChange, options, suffix = "" }: { value: string; onChange: (v: string) => void; options: string[]; suffix?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = String(value) === o;
        return (
          <button key={o} onClick={() => onChange(o)}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: active ? "rgba(239,68,68,0.12)" : "#1c2230",
              color: active ? TEAL : "#9ca3af",
              border: `1px solid ${active ? TEAL : "rgba(255,255,255,0.08)"}`,
            }}>
            {o}{o !== "Custom" ? suffix : ""}
          </button>
        );
      })}
    </div>
  );
}

function MultiPills({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: string[] }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button key={o} onClick={() => toggle(o)}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: active ? "rgba(239,68,68,0.12)" : "#1c2230",
              color: active ? TEAL : "#9ca3af",
              border: `1px solid ${active ? TEAL : "rgba(255,255,255,0.08)"}`,
            }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function ChipInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().toUpperCase();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="p-2 rounded flex flex-wrap gap-1.5 items-center"
      style={{ background: "#1c2230", border: "1px solid rgba(255,255,255,0.1)" }}>
      {value.map((c) => (
        <span key={c} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ background: "rgba(239,68,68,0.12)", color: TEAL }}>
          {c}
          <button onClick={() => onChange(value.filter((v) => v !== c))}><X size={11} /></button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="Add instrument..."
        className="flex-1 min-w-[120px] bg-transparent text-xs focus:outline-none py-1 px-1"
        style={{ color: "#e6e8eb", fontFamily: FONT_SANS }} />
    </div>
  );
}

function Toggle({ label, sub, value, onChange, large }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; large?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex-1">
        <div className={large ? "text-sm" : "text-xs"} style={{ fontFamily: FONT_SANS }}>{label}</div>
        {sub && <div className="text-[11px] mt-0.5" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        className="relative flex-shrink-0 rounded-full transition-colors"
        style={{
          width: large ? 48 : 36, height: large ? 26 : 20,
          background: value ? TEAL : "rgba(255,255,255,0.1)",
        }}>
        <span className="absolute top-0.5 rounded-full bg-white transition-all"
          style={{
            width: large ? 22 : 16, height: large ? 22 : 16,
            left: value ? (large ? 24 : 18) : 2,
          }} />
      </button>
    </div>
  );
}

function OptionCard({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-2.5 rounded-[10px] text-xs"
      style={{
        background: active ? "rgba(239,68,68,0.08)" : "#1c2230",
        color: active ? TEAL : "#d1d5db",
        border: `1px solid ${active ? TEAL : "rgba(255,255,255,0.08)"}`,
        fontFamily: FONT_SANS,
      }}>
      {label}
    </button>
  );
}

function Sidebar({ plan, initials, firstName, onSignOut }: { plan: string; initials: string; firstName: string; onSignOut: () => void }) {
  const items = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: CalendarDays, label: "Today's Session", to: "/session" },
    { icon: BookOpen, label: "Journal", to: "/journal" },
    { icon: Globe, label: "Market Intel", to: "/market-intel" },
    { icon: Radio, label: "Signals", to: "/signals" },
    { icon: Download, label: "Download App", to: "/download" },
    { icon: SettingsIcon, label: "Settings", to: "/settings" },
  ];
  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[220px] z-30"
      style={{ background: "#141820", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded" style={{ background: TEAL }} />
          <span className="font-semibold tracking-tight" style={{ color: TEAL }}>TradeWithAce</span>
        </div>
        <span className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(239,68,68,0.12)", color: TEAL, border: `1px solid ${TEAL}40` }}>{plan}</span>
      </div>
      <nav className="flex-1 px-2 space-y-0.5">
        {items.map((it) => {
          const isActive = it.label === "Settings";
          return (
            <a key={it.label} href={it.to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors"
              style={{ background: isActive ? "rgba(239,68,68,0.08)" : "transparent", color: isActive ? TEAL : "#9ca3af" }}>
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
