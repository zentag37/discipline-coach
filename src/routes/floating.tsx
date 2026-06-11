import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  colorFor, readHealth, type RuleStatus,
  STATUS_GREEN, STATUS_AMBER, STATUS_RED,
} from "@/lib/trading-status";

export const Route = createFileRoute("/floating")({
  head: () => ({
    meta: [
      { title: "TradeWithAce — Cockpit Widget" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: FloatingOverlay,
});

const SNAPSHOT_KEY = "tw-ace-session-snapshot";
const GOLD = "#c9a84c";
const BG = "#0d1117";
const SURFACE = "#161b22";
const BORDER = "#30363d";
const TEXT = "#f0e6d3";
const MUTED = "#8b949e";

type Snapshot = {
  tradesUsed: number;
  maxTrades: number;
  sessionPL: number;
  dailyStop: number;
  maxRisk: number;
  sessionLabel: string;
  sessionOpen: boolean;
  currency?: string;
};

const FALLBACK: Snapshot = {
  tradesUsed: 0, maxTrades: 3, sessionPL: 0, dailyStop: 0, maxRisk: 0,
  sessionLabel: "Session", sessionOpen: false, currency: "€",
};

function readSnapshot(): Snapshot {
  try {
    if (typeof window === "undefined") return FALLBACK;
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return FALLBACK;
    return { ...FALLBACK, ...JSON.parse(raw) };
  } catch { return FALLBACK; }
}

function FloatingOverlay() {
  const [mounted, setMounted] = useState(false);
  const [health, setHealth] = useState<RuleStatus>("green");
  const [snap, setSnap] = useState<Snapshot>(FALLBACK);
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const sync = () => { setHealth(readHealth()); setSnap(readSnapshot()); };
    sync();
    const t = setInterval(sync, 2000);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === SNAPSHOT_KEY || e.key.includes("session-health")) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(t); window.removeEventListener("storage", onStorage); };
  }, []);

  if (!mounted) return null;

  const tradesLeft = Math.max(0, snap.maxTrades - snap.tradesUsed);
  const cur = snap.currency || "€";
  const pl = snap.sessionPL;

  // Circle color from trades-left rule, escalated to red by health.
  const circleColor =
    health === "red" || tradesLeft <= 0 ? STATUS_RED
    : tradesLeft === 1 ? STATUS_AMBER
    : STATUS_GREEN;

  const lossUsed = pl < 0 ? Math.min(Math.abs(pl), snap.dailyStop) : 0;
  const lossPct = snap.dailyStop > 0 ? Math.min(100, (lossUsed / snap.dailyStop) * 100) : 0;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning, trader";
    if (h < 18) return "Good afternoon, trader";
    return "Good evening, trader";
  })();

  return (
    <>
      <style>{`
        html,body,#root{background:transparent !important;}
        @keyframes ace-pulse {
          0%,100% { box-shadow: 0 0 0 0 ${STATUS_RED}88, 0 6px 20px ${STATUS_RED}55; }
          50%     { box-shadow: 0 0 0 14px ${STATUS_RED}00, 0 6px 20px ${STATUS_RED}55; }
        }
        @keyframes ace-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {/* Collapsed circle */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label="Open cockpit"
          className="fixed grid place-items-center rounded-full cursor-pointer select-none"
          style={{
            right: 24,
            bottom: 24,
            width: 64,
            height: 64,
            background: circleColor,
            border: "none",
            color: "#fff",
            boxShadow: `0 6px 20px ${circleColor}66`,
            animation: circleColor === STATUS_RED ? "ace-pulse 2s ease-in-out infinite" : undefined,
            zIndex: 50,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: "#fff" }}>
            {tradesLeft}
          </span>
        </button>
      )}

      {/* Hover tooltip */}
      {hover && !expanded && (
        <div
          className="fixed pointer-events-none animate-fade-in"
          style={{
            right: 24 + 32 - 90, // center 180px tip over 64px circle
            bottom: 24 + 64 + 10,
            width: 180,
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderLeft: `3px solid ${circleColor}`,
            color: TEXT,
            borderRadius: 8,
            padding: "10px 12px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 60,
          }}
        >
          <Line label="Status" value={snap.sessionOpen ? "Live" : "Closed"} valueColor={snap.sessionOpen ? STATUS_GREEN : MUTED} />
          <Line
            label="P&L"
            value={`${pl >= 0 ? "+" : "-"}${cur}${Math.abs(pl).toFixed(2)}`}
            valueColor={pl > 0 ? STATUS_GREEN : pl < 0 ? STATUS_RED : TEXT}
          />
          <Line label="Trades left" value={`${tradesLeft} / ${snap.maxTrades}`} valueColor={circleColor} />
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <aside
          className="fixed top-0 right-0 h-full flex flex-col"
          style={{
            width: 220,
            background: BG,
            borderLeft: `1px solid ${BORDER}`,
            color: TEXT,
            fontFamily: "'JetBrains Mono', monospace",
            boxShadow: "-8px 0 24px rgba(0,0,0,0.6)",
            animation: "ace-slide-in 0.25s ease-out",
            zIndex: 60,
          }}
        >
          <header
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <span style={{ fontSize: 10, letterSpacing: "0.18em", color: GOLD }}>COCKPIT</span>
            <button
              onClick={() => setExpanded(false)}
              aria-label="Close"
              className="grid place-items-center rounded hover:bg-white/10"
              style={{ width: 24, height: 24, color: MUTED, border: "none", background: "transparent" }}
            >
              <X size={14} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            <div>
              <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em" }}>BRIEFING</div>
              <div style={{ fontSize: 13, color: TEXT, marginTop: 4 }}>{greeting}.</div>
            </div>

            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", color: MUTED, marginBottom: 6 }}>TRADES</div>
              <div className="flex items-baseline gap-2">
                <span style={{ fontSize: 32, fontWeight: 700, color: circleColor, lineHeight: 1 }}>
                  {tradesLeft}
                </span>
                <span style={{ fontSize: 11, color: MUTED }}>/ {snap.maxTrades} left</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", color: MUTED, marginBottom: 6 }}>P&amp;L TODAY</div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: pl > 0 ? STATUS_GREEN : pl < 0 ? STATUS_RED : TEXT,
                  lineHeight: 1,
                }}
              >
                {pl >= 0 ? "+" : "-"}{cur}{Math.abs(pl).toFixed(2)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 9, letterSpacing: "0.2em", color: MUTED }}>DAILY LOSS LIMIT</span>
                <span style={{ fontSize: 10, color: MUTED }}>
                  {cur}{lossUsed.toFixed(0)} / {cur}{snap.dailyStop.toFixed(0)}
                </span>
              </div>
              <div style={{ width: "100%", height: 6, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${lossPct}%`,
                    height: "100%",
                    background: lossPct >= 80 ? STATUS_RED : lossPct >= 50 ? STATUS_AMBER : STATUS_GREEN,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => { try { window.open("/dashboard", "_blank"); } catch {/*noop*/} }}
              className="w-full"
              style={{
                marginTop: 8,
                padding: "10px 12px",
                background: GOLD,
                color: BG,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.15em",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              LOG TRADE
            </button>
          </div>
        </aside>
      )}
    </>
  );
}

function Line({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "2px 0" }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span className="tabular-nums" style={{ color: valueColor ?? TEXT }}>{value}</span>
    </div>
  );
}
