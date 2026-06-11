import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronDown, MessageCircle, LifeBuoy, Wrench, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — TradeWithAce" },
      { name: "description", content: "FAQs, troubleshooting, and community support for TradeWithAce." },
    ],
  }),
  component: HelpPage,
});

const TEAL = "#00d4a0";
const DISCORD_URL = "https://discord.gg/lovable-dev";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is TradeWithAce?",
    a: "A discipline coach for traders — a floating desktop window that sits on top of your trading platform and helps you stick to your plan, with a web dashboard for journaling, signals, and market intel.",
  },
  {
    q: "Which trading platforms are supported?",
    a: "The floating coach works on top of any platform (IG, MT4/MT5, TradingView, cTrader, etc.). Optional API connections (e.g. IG Web API) work with CFD/spread bet accounts only.",
  },
  {
    q: "How do I connect my IG account?",
    a: "Go to Settings → Trading Account, enter your IG API Key, username, and password, choose Demo or Live, then click Connect. Your IG API username may differ from your login email.",
  },
  {
    q: "Why does the IG connection fail with “stockbroking-not-supported”?",
    a: "Your IG account type doesn't support API access. The IG Web API works with CFD/spread bet accounts only. The floating window still works automatically without an API connection.",
  },
  {
    q: "Where can I download the desktop app?",
    a: "From the Download page in the sidebar (Mac and Windows builds available).",
  },
  {
    q: "How do I cancel or change my subscription?",
    a: "Go to Settings → Subscription to manage your plan. Changes take effect at the end of your billing period.",
  },
];

const TROUBLESHOOTING: { title: string; steps: string[] }[] = [
  {
    title: "Floating window won't open",
    steps: [
      "Make sure the desktop app is installed and running.",
      "On macOS, allow the app under System Settings → Privacy & Security → Accessibility.",
      "On Windows, run the app as Administrator the first time.",
      "Restart the app, then sign in again from the tray icon.",
    ],
  },
  {
    title: "Can't sign in / session keeps expiring",
    steps: [
      "Clear your browser cookies for tradewithace.com and sign in again.",
      "Try a different browser to rule out an extension blocking auth cookies.",
      "Reset your password from the Forgot Password link.",
    ],
  },
  {
    title: "IG API connection fails",
    steps: [
      "Confirm you're using your IG API username (not your login email).",
      "Verify your API key in My IG → Settings → API keys is active.",
      "Switch the Demo/Live toggle to match the account the key was generated for.",
      "If your account is stockbroking-only, API access isn't supported — use the floating coach instead.",
    ],
  },
  {
    title: "Signals or market intel not loading",
    steps: [
      "Refresh the page. Most feeds update every few minutes.",
      "Check your internet connection and any VPN/firewall blocking our API.",
      "If it persists for more than 10 minutes, report it in Discord.",
    ],
  },
];

function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen px-6 py-12"
      style={{ background: "#0d0f12", color: "#e6e8eb", fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="max-w-3xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs mb-8"
          style={{ color: "#9ca3af" }}>
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="text-[10px] tracking-widest mb-3" style={{ color: TEAL }}>SUPPORT</div>
        <h1 className="text-3xl tracking-tight mb-3" style={{ fontFamily: "Inter, sans-serif" }}>
          Help & Support
        </h1>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "#9ca3af", fontFamily: "Inter, sans-serif" }}>
          Answers to common questions, fixes for common problems, and a way to reach the team.
        </p>

        {/* Community card */}
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg p-5 mb-10 transition hover:-translate-y-0.5"
          style={{ background: "#141820", border: `1px solid ${TEAL}40` }}>
          <div className="flex items-center gap-3">
            <MessageCircle size={22} style={{ color: TEAL }} />
            <div>
              <div className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Join the Discord community</div>
              <div className="text-[11px]" style={{ color: "#6b7280" }}>Get help from the team and fellow traders</div>
            </div>
          </div>
          <span className="text-xs" style={{ color: TEAL }}>Open →</span>
        </a>

        {/* FAQs */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={16} style={{ color: TEAL }} />
            <h2 className="text-lg tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>FAQs</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="rounded-lg overflow-hidden"
                  style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left">
                    <span className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>{f.q}</span>
                    <ChevronDown size={16} style={{ color: "#9ca3af", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-sm leading-relaxed"
                      style={{ color: "#9ca3af", fontFamily: "Inter, sans-serif" }}>
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={16} style={{ color: TEAL }} />
            <h2 className="text-lg tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>Troubleshooting</h2>
          </div>
          <div className="space-y-4">
            {TROUBLESHOOTING.map((t, i) => (
              <div key={i} className="rounded-lg p-5"
                style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-sm mb-3" style={{ fontFamily: "Inter, sans-serif" }}>{t.title}</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm leading-relaxed"
                  style={{ color: "#9ca3af", fontFamily: "Inter, sans-serif" }}>
                  {t.steps.map((s, j) => <li key={j}>{s}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Still need help */}
        <section className="rounded-lg p-5"
          style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-2">
            <LifeBuoy size={16} style={{ color: TEAL }} />
            <h2 className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Still need help?</h2>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "#9ca3af", fontFamily: "Inter, sans-serif" }}>
            Ping us in <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" style={{ color: TEAL }}>Discord</a> or email{" "}
            <a href="mailto:support@tradewithace.com" style={{ color: TEAL }}>support@tradewithace.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
