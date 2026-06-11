import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, CalendarDays, BookOpen, Globe, Download, Settings, Bell, Radio,
  Sunrise, Target, Brain, CheckCircle2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarUserMenu } from "@/components/SidebarUserMenu";
import { AvatarMenu } from "@/components/AvatarMenu";
import { NotificationsBell } from "@/components/NotificationsBell";
import { colorFor, readHealth, type RuleStatus } from "@/lib/trading-status";

export const Route = createFileRoute("/session")({
  head: () => ({ meta: [{ title: "Today's Session — TradeWithAce" }] }),
  component: SessionPage,
});

const TEAL = "#00d4a0";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_SANS = "Inter, sans-serif";

function SessionPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>({});
  const [intent, setIntent] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);

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
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const moods = ["Focused", "Calm", "Neutral", "Anxious", "Tilted"];

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0d0f12", color: "#e6e8eb", fontFamily: FONT_MONO }}>
      <Sidebar plan={plan} initials={initials} firstName={firstName} onSignOut={signOut} active="Today's Session" />

      <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
        <header className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{ background: "#141820", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 className="text-sm font-medium" style={{ fontFamily: FONT_SANS }}>Today's Session</h1>
          <div className="flex items-center gap-4 text-xs">
            <NotificationsBell />
            <AvatarMenu initials={initials} />
          </div>
        </header>

        <main className="p-7 space-y-5 max-w-[900px] w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
              <Sunrise size={14} style={{ color: TEAL }} /> {today}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: FONT_SANS }}>
              Good to see you, {firstName}.
            </h2>
            <p className="text-xs" style={{ color: "#6b7280", fontFamily: FONT_SANS }}>
              Lock in your intent before you take a single trade.
            </p>
          </div>

          {/* Intent */}
          <Card title="Your intent today" icon={<Target size={14} />}>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Only A+ setups on EURUSD London session. Max 2 trades. No revenge."
              className="w-full bg-transparent text-xs outline-none resize-none min-h-[80px]"
              style={{ color: "#e6e8eb", fontFamily: FONT_SANS }}
            />
          </Card>

          {/* Mood */}
          <Card title="How are you feeling?" icon={<Brain size={14} />}>
            <div className="flex flex-wrap gap-2">
              {moods.map((m) => (
                <button key={m} onClick={() => setMood(m)}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{
                    background: mood === m ? "rgba(0,212,160,0.15)" : "rgba(255,255,255,0.04)",
                    color: mood === m ? TEAL : "#9ca3af",
                    border: `1px solid ${mood === m ? TEAL + "55" : "rgba(255,255,255,0.08)"}`,
                    fontFamily: FONT_SANS,
                  }}>{m}</button>
              ))}
            </div>
          </Card>

          {/* Risk reminder */}
          <Card title="Your guardrails" icon={<Clock size={14} />}>
            <ul className="space-y-1.5 text-xs" style={{ color: "#d1d5db", fontFamily: FONT_SANS }}>
              <li>• Risk per trade: <span style={{ color: TEAL }}>{profile.risk_per_trade || 1}%</span></li>
              <li>• Account: <span style={{ color: TEAL }}>${Number(profile.account_size || 25000).toLocaleString()}</span></li>
              <li>• Stop trading after 2 consecutive losses.</li>
              <li>• No trades outside your planned session.</li>
            </ul>
          </Card>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommitted(true)}
              disabled={!intent.trim() || !mood}
              className="text-xs px-4 py-2 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: TEAL, color: "#0d0f12", fontFamily: FONT_SANS }}>
              {committed ? <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Committed</span> : "Commit to session"}
            </button>
            <button
              onClick={() => navigate({ to: "/journal" })}
              className="text-xs px-4 py-2 rounded hover:bg-white/5"
              style={{ color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)", fontFamily: FONT_SANS }}>
              Open journal →
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-[12px]" style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-2 text-[10px] tracking-widest mb-3" style={{ color: "#9ca3af" }}>
        <span style={{ color: TEAL }}>{icon}</span>
        <span>{title.toUpperCase()}</span>
      </div>
      {children}
    </div>
  );
}

function Sidebar({ plan, initials, firstName, active }: {
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
