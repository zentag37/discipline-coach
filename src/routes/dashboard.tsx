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
  Lock,
  Radio,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { marked } from "marked";
import { getLiveQuotes } from "@/lib/market.functions";
import { getAceSignals } from "@/lib/signals.functions";
import { aceMessage, aceJournal } from "@/lib/ace.functions";
import { getIgAccounts, getIgPositions } from "@/lib/ig.functions";
import { AceChatDrawer } from "@/components/ace/AceChatDrawer";
import { NotificationsBell } from "@/components/NotificationsBell";
import { speakAsACE, stopVoice, subscribeVoice } from "@/lib/ace-voice";
import { VoiceConsentModal } from "@/components/ace/VoiceConsentModal";
import { hasAceAccess, planLabel } from "@/lib/plan";
import { SidebarUserMenu } from "@/components/SidebarUserMenu";
import { AvatarMenu } from "@/components/AvatarMenu";
import { pushNotification } from "@/lib/notification-bus";
import {
  STATUS_GREEN, STATUS_AMBER, STATUS_RED,
  colorFor, tradesStatus, pnlStatus, checklistStatus, sessionHealth,
  publishHealth, type RuleStatus,
} from "@/lib/trading-status";


marked.setOptions({ breaks: true, gfm: true });
function renderMarkdown(src: string): string {
  return marked.parse(src, { async: false }) as string;
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — TradeWithAce" }],
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

function getGreeting(date = new Date()) {
  const h = date.getUTCHours();
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

const formatHeaderTime = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" });

const formatWeekday = (date: Date) => date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

const formatHeaderDate = (date: Date) =>
  date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" });

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
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

  // Voice state
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [lossOverlay, setLossOverlay] = useState<string | null>(null);
  const [tradeLimitFlash, setTradeLimitFlash] = useState(false);
  const greetedRef = useRef(false);
  const tradeLimitSpokenRef = useRef(false);
  const lossLimitSpokenRef = useRef(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    if (params.get("subscribed") === "true") {
      setWelcomeOpen(true);
      params.delete("subscribed");
      changed = true;
    }
    if (params.get("download") === "1") {
      params.delete("download");
      changed = true;
    }
    if (changed) {
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeVoice(setVoicePlaying);
    return () => { unsub(); };
  }, []);



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
    setNow(new Date());
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
      const prof: Profile = data
        ? (data as Profile)
        : { full_name: user.user_metadata?.full_name || user.email?.split("@")[0] };
      setProfile(prof);
      refreshTrades(user.id);
      // Persist a session row for today if none exists
      const today = todayStr();
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle();
      const firstOfDay = !existing;
      if (firstOfDay) {
        await supabase.from("sessions").insert({ user_id: user.id, session_date: today });
      }
      // Voice consent gate (first time ever) — Pro/Elite only
      const planUnlocked = hasAceAccess(prof.plan);
      if (planUnlocked && !prof.voice_consent_decided) {
        setShowConsent(true);
      } else if (planUnlocked && firstOfDay && prof.voice_enabled && !greetedRef.current) {
        greetedRef.current = true;
        speakGreeting(prof);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  function speakGreeting(p: Profile) {
    const fn = (p.full_name || "Trader").split(" ")[0];
    const acct = Number(p.account_size) || 25000;
    const rp = Number(p.risk_per_trade) || 1;
    const maxRiskAmt = Math.round((acct * rp) / 100);
    const sLabel = getSessionStatus(new Date()).label.replace(" Open", "").replace(" Session", "") || "London";
    const greet = getGreeting();
    speakAsACE(
      `${greet} ${fn}. ${sLabel} session is now open. Your max risk today is €${maxRiskAmt} per trade. Stay disciplined and wait for your setup.`,
      p.voice_style || "marcus",
    ).catch(() => {});
  }

  async function handleConsent(enable: boolean) {
    setShowConsent(false);
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ voice_enabled: enable, voice_consent_decided: true })
      .eq("id", userId);
    setProfile((p) => ({ ...p, voice_enabled: enable, voice_consent_decided: true }));
    if (enable && !greetedRef.current) {
      greetedRef.current = true;
      speakGreeting({ ...profile, voice_enabled: true });
    }
  }

  async function toggleVoiceFromSidebar() {
    if (!userId) return;
    if (!hasAceAccess(profile.plan)) { navigate({ to: "/pricing" }); return; }
    const next = !profile.voice_enabled;
    if (!next) stopVoice();
    await supabase.from("profiles").update({ voice_enabled: next }).eq("id", userId);
    setProfile((p) => ({ ...p, voice_enabled: next }));
  }


  const firstName = (profile.full_name || "Trader").split(" ")[0];
  const initials = (profile.full_name || "T R")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const plan = (profile.plan || "PRO").toUpperCase();
  const aceUnlocked = hasAceAccess(profile.plan);
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

  const fetchQuotes = useServerFn(getLiveQuotes);
  const watchlistSymbols = useMemo(() => instruments.map((s) => s.toUpperCase()), [instruments]);
  const { data: watchlistData } = useQuery({
    queryKey: ["live-quotes", watchlistSymbols],
    queryFn: () => fetchQuotes({ data: { symbols: watchlistSymbols } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: watchlistSymbols.length > 0,
  });
  const quoteMap = useMemo(() => {
    const m = new Map<string, { price: number; change: number; decimals: number; error?: string }>();
    watchlistData?.quotes?.forEach((q) => m.set(q.symbol, { price: q.price, change: q.change, decimals: q.decimals, error: q.error }));
    return m;
  }, [watchlistData]);

  // ACE Signals strip
  const fetchAceSignals = useServerFn(getAceSignals);
  const { data: signalsData } = useQuery({
    queryKey: ["ace-signals-strip", watchlistSymbols],
    queryFn: () => fetchAceSignals({ data: { symbols: watchlistSymbols } }),
    refetchInterval: 15 * 60 * 1000,
    staleTime: 60_000,
    enabled: !!userId && watchlistSymbols.length > 0 && aceUnlocked,
  });
  const activeSignals = signalsData?.signals || [];

  // IG Live Account
  const fetchIgAccounts = useServerFn(getIgAccounts);
  const fetchIgPositions = useServerFn(getIgPositions);
  const { data: igAccount } = useQuery({
    queryKey: ["ig-accounts"],
    queryFn: () => fetchIgAccounts(),
    refetchInterval: 30_000,
    enabled: !!userId,
  });
  const { data: igPositions } = useQuery({
    queryKey: ["ig-positions"],
    queryFn: () => fetchIgPositions(),
    refetchInterval: 30_000,
    enabled: !!userId,
  });
  const igConnected = igAccount?.connected === true && !("error" in (igAccount ?? {}) && (igAccount as any).error);
  const igPnl = igConnected && "profitLoss" in (igAccount ?? {}) ? Number((igAccount as any).profitLoss) || 0 : 0;
  const igBalance = igConnected && "balance" in (igAccount ?? {}) ? Number((igAccount as any).balance) || 0 : 0;
  const igMargin = igConnected && "usedMargin" in (igAccount ?? {}) ? Number((igAccount as any).usedMargin) || 0 : 0;
  const igCurrency = igConnected && "currency" in (igAccount ?? {}) ? String((igAccount as any).currency || "") : "";
  const openPositions = igConnected ? igPositions?.positions?.length ?? 0 : 0;

  // Daily loss alert based on live IG P&L
  const dailyLossHitRef = useRef(false);
  const igLossBreached = igConnected && dailyStop > 0 && igPnl <= -dailyStop;
  useEffect(() => {
    if (!igLossBreached) { dailyLossHitRef.current = false; return; }
    if (dailyLossHitRef.current) return;
    dailyLossHitRef.current = true;
    pushNotification({
      type: "warning",
      title: "Daily stop loss hit",
      body: `Live P&L ${igCurrency}${igPnl.toFixed(2)} exceeds your €${dailyStop} daily limit. Stand down.`,
    });
  }, [igLossBreached, igCurrency, igPnl, dailyStop]);


  const displayNow = now ?? new Date(0);
  const session = getSessionStatus(displayNow);
  const opensIn = !session.open ? nextLondonOpen(displayNow) : null;

  const checkedCount = checks.filter(Boolean).length;
  const allChecked = checkedCount === 5;

  const sessionPL = trades.reduce((a, t) => a + (Number(t.result_dollars) || 0), 0);

  // Trigger 3: trade limit reached
  useEffect(() => {
    if (!profile.voice_enabled || !userId) return;
    if (trades.length >= maxTrades && !tradeLimitSpokenRef.current) {
      tradeLimitSpokenRef.current = true;
      setTradeLimitFlash(true);
      speakAsACE(
        `${firstName}. You've reached your trade limit for today. ${maxTrades} trades is your maximum. Step away from the platform now. Come back tomorrow.`,
        profile.voice_style || "marcus",
      ).catch(() => {});
      setTimeout(() => setTradeLimitFlash(false), 8000);
    }
  }, [trades.length, maxTrades, profile.voice_enabled, profile.voice_style, firstName, userId]);

  // Trigger 4: daily loss limit
  useEffect(() => {
    if (!profile.voice_enabled || !userId) return;
    if (sessionPL <= -dailyStop && dailyStop > 0 && !lossLimitSpokenRef.current) {
      lossLimitSpokenRef.current = true;
      const msg = `${firstName}. Daily stop loss reached. You're down €${Math.abs(sessionPL).toFixed(0)} today. This is your hard limit. Close everything and log off the platform. You fought well — come back tomorrow.`;
      setLossOverlay(msg);
      speakAsACE(msg, profile.voice_style || "marcus").catch(() => {});
    }
  }, [sessionPL, dailyStop, profile.voice_enabled, profile.voice_style, firstName, userId]);

  function speakAceCardMessage() {
    if (voicePlaying) { stopVoice(); return; }
    if (!aceMsg) return;
    speakAsACE(aceMsg, profile.voice_style || "marcus").catch(() => {});
  }


  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/login";
  }

  async function switchAccount() {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/login";
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
            <span className="font-semibold tracking-tight" style={{ color: TEAL }}>TradeWithAce</span>
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
          <NavItem icon={<CalendarDays size={16} />} label="Today's Session" onClick={() => navigate({ to: "/session" })} />
          <NavItem icon={<BookOpen size={16} />} label="Journal" onClick={() => navigate({ to: "/journal" })} />
          <NavItem icon={<Globe size={16} />} label="Market Intel" onClick={() => navigate({ to: "/market-intel" })} />
          <NavItem icon={<Radio size={16} />} label="Signals" onClick={() => navigate({ to: "/signals" })} />
          <NavItem icon={<Download size={16} />} label="Download App" onClick={() => navigate({ to: "/download" })} />
          <NavItem icon={<Settings size={16} />} label="Settings" onClick={() => navigate({ to: "/settings" })} />
          <NavItem icon={<HelpCircle size={16} />} label="Help & Support" onClick={() => navigate({ to: "/help" })} />
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
          <button
            onClick={toggleVoiceFromSidebar}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs w-full transition-colors hover:bg-white/5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            title={profile.voice_enabled ? "Click to mute" : "Click to enable voice"}
          >
            {profile.voice_enabled ? (
              <>
                <Volume2 size={12} style={{ color: TEAL }} />
                <span style={{ color: TEAL }}>Voice on</span>
              </>
            ) : (
              <>
                <VolumeX size={12} style={{ color: "#6b7280" }} />
                <span style={{ color: "#6b7280" }}>Voice off</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              speakAsACE(
                `Hey ${firstName || "trader"}, this is a voice test. If you can hear me, audio is working.`,
                profile.voice_style || "marcus",
              ).catch((e) => console.error("[dashboard] test voice failed:", e));
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs w-full transition-colors hover:bg-white/5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#9ca3af" }}
            title="Play a test voice message"
          >
            <Volume2 size={12} />
            <span>Test voice</span>
          </button>

          <SidebarUserMenu initials={initials} firstName={firstName} />
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
              <span style={{ color: "#9ca3af" }}>{formatHeaderTime(displayNow)}</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: session.open ? "#22c55e" : "#00d4a0" }} />
                <span style={{ color: session.open ? "#22c55e" : "#00d4a0" }}>{session.label}</span>
              </span>
            </div>
            <NotificationsBell />
            <AvatarMenu initials={initials} />
          </div>
        </header>

        {/* Content */}
        <main className="p-7 space-y-6 max-w-[1400px] w-full">
          {/* Row 1 */}
          <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in">
            <div>
              <h2 className="text-2xl tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
                {getGreeting(displayNow)}, {firstName}.
              </h2>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
                {session.open
                  ? `${session.label}. Stay focused — trade your plan.`
                  : `London session opens in ${opensIn}. Stay patient — wait for your setup.`}
              </p>
            </div>
            <div className="text-right text-xs" style={{ color: "#9ca3af" }}>
              <div>{formatWeekday(displayNow)}</div>
              <div>{formatHeaderDate(displayNow)}</div>
            </div>
          </div>

          {/* Row 2 — stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            <StatCard label="MAX RISK PER TRADE" value={`€${maxRisk}`} sub={`${riskPct}% of €${acct.toLocaleString()}`} />
            <StatCard label="DAILY STOP LOSS" value={`€${dailyStop}`} sub={`${dailyPct}% of €${acct.toLocaleString()}`} />
            <StatCard
              label="TRADES TODAY"
              value={`${trades.length} / ${maxTrades}`}
              sub={`${Math.max(0, maxTrades - trades.length)} remaining`}
              flash={tradeLimitFlash}
            />
            <StatCard
              label="TODAY'S P&L"
              value={`${sessionPL < 0 ? "-" : ""}€${Math.abs(sessionPL).toFixed(2)}`}
              sub={trades.length ? `${trades.length} trade${trades.length === 1 ? "" : "s"} logged` : "No trades logged yet"}
              valueColor={sessionPL > 0 ? TEAL : sessionPL < 0 ? "#00d4a0" : undefined}
            />
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 animate-fade-in">
            {/* ACE card */}
            <div
              className="lg:col-span-3 p-5 rounded-[10px] relative overflow-hidden"
              style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `3px solid ${TEAL}` }}
            >
              <div style={{ filter: aceUnlocked ? "none" : "blur(6px)", pointerEvents: aceUnlocked ? "auto" : "none" }}>
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
                    <span className="ace-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(aceMsg) }} />
                  ) : (
                    `Good ${getGreeting().split(" ")[1]} ${firstName}. Loading your coaching message...`
                  )}
                </p>
                <div className="flex gap-2 mt-4 items-center">
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
                  {profile.voice_enabled && aceMsg && (
                    <button
                      onClick={speakAceCardMessage}
                      className={`ml-auto p-1.5 rounded transition-all ${voicePlaying ? "animate-pulse" : "hover:bg-white/5"}`}
                      style={{
                        color: voicePlaying ? TEAL : "#9ca3af",
                        border: voicePlaying ? `1px solid ${TEAL}` : "1px solid transparent",
                      }}
                      title={voicePlaying ? "Stop" : "Speak"}
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {!aceUnlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
                  style={{ background: "rgba(13,15,18,0.55)" }}>
                  <Lock size={22} style={{ color: TEAL }} />
                  <div className="text-sm" style={{ color: "#e6e8eb", fontFamily: "Inter, sans-serif" }}>
                    Upgrade to Pro to unlock ACE
                  </div>
                  <Link to="/pricing" className="text-xs px-4 py-1.5 rounded font-medium"
                    style={{ background: TEAL, color: "#0d0f12" }}>
                    Upgrade →
                  </Link>
                </div>
              )}
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

          {/* ACE Signals strip */}
          {aceUnlocked && (
            <div
              className="px-4 py-3 rounded-[10px] flex items-center justify-between gap-3 flex-wrap animate-fade-in"
              style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `3px solid ${TEAL}` }}
            >
              <div className="flex items-center gap-3 text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                <Radio size={14} style={{ color: TEAL }} />
                <span className="tracking-widest text-[10px]" style={{ color: TEAL }}>ACE SIGNALS</span>
                <span style={{ color: "#6b7280" }}>•</span>
                {activeSignals.length === 0 ? (
                  <span style={{ color: "#9ca3af" }}>No signals right now</span>
                ) : (
                  <>
                    <span style={{ color: "#9ca3af" }}>
                      {activeSignals.length} signal{activeSignals.length === 1 ? "" : "s"} active
                    </span>
                    <span style={{ color: "#6b7280" }}>•</span>
                    <div className="flex items-center gap-3">
                      {activeSignals.slice(0, 3).map((s) => (
                        <span key={s.id} className="flex items-center gap-1" style={{ color: "#e6e8eb" }}>
                          <span>{s.direction === "BUY" ? "🟢" : "🔴"}</span>
                          <span className="font-medium">{s.instrument}</span>
                          <span style={{ color: s.direction === "BUY" ? TEAL : "#00d4a0" }}>{s.direction}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Link to="/signals" className="text-xs hover:underline" style={{ color: TEAL, fontFamily: "Inter, sans-serif" }}>
                View all →
              </Link>
            </div>
          )}

          {/* Live Account (IG) */}
          <div className="animate-fade-in">
            {igLossBreached && (
              <div className="mb-3 p-3 rounded-[10px] flex items-center gap-3 text-sm"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#fecaca", fontFamily: "Inter, sans-serif" }}>
                <span className="text-xs tracking-widest px-2 py-0.5 rounded" style={{ background: "#dc2626", color: "#fff" }}>STOP</span>
                Daily loss limit hit — live P&L {igCurrency}{igPnl.toFixed(2)} exceeds your €{dailyStop} cap. Stand down for today.
              </div>
            )}
            <div className="p-5 rounded-[10px]"
              style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `3px solid ${TEAL}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-widest" style={{ color: TEAL }}>LIVE ACCOUNT · IG</div>
                {igConnected ? (
                  <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                    CONNECTED
                  </span>
                ) : (
                  <Link to="/settings" className="text-[10px] hover:underline" style={{ color: TEAL }}>
                    Connect in Settings →
                  </Link>
                )}
              </div>
              {!igConnected ? (
                <p className="text-xs" style={{ color: "#9ca3af", fontFamily: "Inter, sans-serif" }}>
                  Link your IG trading account to see live balance, P&L and open positions here.
                </p>
              ) : (igAccount as any)?.error ? (
                <p className="text-xs" style={{ color: "#f59e0b", fontFamily: "Inter, sans-serif" }}>
                  Could not fetch: {(igAccount as any).error}
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <LiveStat label="BALANCE" value={`${igCurrency}${igBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                  <LiveStat
                    label="TODAY'S P&L"
                    value={`${igPnl >= 0 ? "+" : "-"}${igCurrency}${Math.abs(igPnl).toFixed(2)}`}
                    valueColor={igPnl > 0 ? "#22c55e" : igPnl < 0 ? "#ef4444" : undefined}
                  />
                  <LiveStat label="OPEN POSITIONS" value={String(openPositions)} />
                  <LiveStat label="USED MARGIN" value={`${igCurrency}${igMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
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
                                    background: t.direction === "BUY" ? "rgba(34,197,94,0.15)" : "rgba(0,212,160,0.15)",
                                    color: t.direction === "BUY" ? "#22c55e" : "#00d4a0",
                                  }}
                                >
                                  {t.direction}
                                </span>
                              </td>
                              <td>{t.entry_price}</td>
                              <td>{t.exit_price}</td>
                              <td style={{ color: pl >= 0 ? TEAL : "#00d4a0" }}>
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
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-widest" style={{ color: "#9ca3af" }}>
                  YOUR WATCHLIST
                </div>
                <span className="flex items-center gap-1 text-[9px] tracking-widest px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <span className="w-1 h-1 rounded-full" style={{ background: "#22c55e" }} />
                  LIVE
                </span>
              </div>
              <div className="space-y-1">
                {instruments.map((sym, i) => {
                  const key = sym.toUpperCase();
                  const q = quoteMap.get(key);
                  const hasPrice = !!q && !q.error && q.price > 0;
                  const up = (q?.change ?? 0) >= 0;
                  return (
                    <div key={sym} className="flex items-center justify-between py-2" style={{ borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span className="text-sm">{sym}</span>
                      <div className="flex items-center gap-3 text-xs">
                        {hasPrice ? (
                          <>
                            <span style={{ color: "#d1d5db" }}>
                              {q!.price.toLocaleString(undefined, { minimumFractionDigits: q!.decimals, maximumFractionDigits: q!.decimals })}
                            </span>
                            <span className="flex items-center gap-0.5" style={{ color: up ? "#22c55e" : "#00d4a0" }}>
                              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {up ? "+" : ""}{q!.change.toFixed(2)}%
                            </span>
                          </>
                        ) : q?.error ? (
                          <span style={{ color: "#f59e0b" }} className="text-[10px]">unavailable</span>
                        ) : (
                          <span style={{ color: "#6b7280" }} className="text-[10px]">loading…</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link to="/market-intel" className="block mt-3 text-[10px] hover:underline" style={{ color: "#00d4a0" }}>
                Open full Market Intel →
              </Link>
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
        className="md:hidden fixed bottom-0 left-0 right-0 grid grid-cols-5 z-[60]"
        style={{ background: "#141820", borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {[
          { to: "/dashboard", Icon: LayoutDashboard, label: "Home" },
          { to: "/journal", Icon: BookOpen, label: "Journal" },
          { to: "/signals", Icon: Radio, label: "Signals" },
          { to: "/market-intel", Icon: Globe, label: "Market" },
          { to: "/settings", Icon: Settings, label: "Settings" },
        ].map(({ to, Icon, label }) => {
          const active = typeof window !== "undefined" && window.location.pathname === to;
          return (
            <button
              key={to}
              type="button"
              onClick={() => navigate({ to })}
              className="flex flex-col items-center justify-center gap-1 min-w-[78px] min-h-[56px] active:bg-white/10 cursor-pointer select-none"
              style={{ color: active ? TEAL : "#6b7280", background: "transparent", border: "none", touchAction: "manipulation" }}
              aria-label={label}
            >
              <Icon size={20} />
              <span className="text-[10px] leading-none">{label}</span>
            </button>
          );
        })}
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
              // Trigger 5: after-trade voice reaction
              if (profile.voice_enabled) {
                const amt = Math.abs(t.pl || 0).toFixed(0);
                const msg = (t.pl || 0) >= 0
                  ? `Good trade ${firstName}. €${amt} banked. Stay level — one win doesn't change your process.`
                  : `One loss. €${amt}. You managed the risk — that's what matters. Stay focused.`;
                speakAsACE(msg, profile.voice_style || "marcus").catch(() => {});
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

      {lossOverlay && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-6 animate-fade-in"
          style={{ background: "rgba(0,212,160,0.18)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="max-w-lg w-full rounded-[14px] p-7 text-center"
            style={{
              background: "#141820",
              border: "2px solid #00d4a0",
              boxShadow: "0 0 60px rgba(0,212,160,0.4)",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <div className="text-[10px] tracking-widest mb-3" style={{ color: "#00d4a0" }}>
              DAILY STOP LOSS REACHED
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#e6e8eb", fontFamily: "Inter, sans-serif" }}>
              {lossOverlay}
            </p>
            <button
              onClick={() => { stopVoice(); setLossOverlay(null); }}
              className="mt-5 text-xs px-4 py-2 rounded"
              style={{ border: "1px solid #00d4a0", color: "#00d4a0" }}
            >
              I understand — logging off
            </button>
          </div>
        </div>
      )}

      {showConsent && (
        <VoiceConsentModal
          onEnable={() => handleConsent(true)}
          onDecline={() => handleConsent(false)}
        />
      )}

      {welcomeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="max-w-md w-full rounded-[14px] p-7 text-center"
            style={{ background: "#141820", border: `2px solid ${TEAL}`, fontFamily: "'IBM Plex Mono', monospace" }}>
            <div className="text-[10px] tracking-widest mb-3" style={{ color: TEAL }}>WELCOME</div>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "Inter, sans-serif", color: "#e6e8eb" }}>
              You're in. Welcome to TradeWithAce {planLabel(profile.plan)}.
            </h2>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "#9ca3af", fontFamily: "Inter, sans-serif" }}>
              ACE is ready. Your rules are set. Let's build a consistent trading career.
            </p>
            <button onClick={() => setWelcomeOpen(false)}
              className="mt-6 text-sm px-5 py-2 rounded font-medium"
              style={{ background: TEAL, color: "#0d0f12" }}>
              Let's go →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <a
      href="#"
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick(); } }}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors cursor-pointer"
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

function LiveStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-widest mb-1" style={{ color: "#6b7280" }}>{label}</div>
      <div className="text-lg" style={{ color: valueColor ?? "#e6e8eb", fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
    </div>
  );
}

function StatCard({ label, value, sub, valueColor, flash }: { label: string; value: string; sub: string; valueColor?: string; flash?: boolean }) {
  return (
    <div
      className={`p-4 px-5 rounded-[10px] transition-all ${flash ? "animate-pulse" : ""}`}
      style={{
        background: "#141820",
        border: `1px solid ${flash ? "#00d4a0" : "rgba(255,255,255,0.08)"}`,
        boxShadow: flash ? "0 0 0 1px #00d4a0, 0 0 24px rgba(0,212,160,0.35)" : undefined,
      }}
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
                const color = d === "BUY" ? "#22c55e" : "#00d4a0";
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
            <div className="text-sm" style={{ color: pl >= 0 ? TEAL : "#00d4a0" }}>
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
