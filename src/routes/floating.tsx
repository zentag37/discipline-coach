import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X, Activity, Target, TrendingUp, Shield } from "lucide-react";
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

const CIRCLE = 60;
const EDGE = 20;
const PANEL_W = 200;
const POS_KEY = "tw-ace-cockpit-pos";
const SNAPSHOT_KEY = "tw-ace-session-snapshot";

// Session snapshot the dashboard publishes for the widget.
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

function readSnapshot(): Snapshot {
  const fallback: Snapshot = {
    tradesUsed: 0, maxTrades: 3, sessionPL: 0, dailyStop: 0, maxRisk: 0,
    sessionLabel: "Session", sessionOpen: false, currency: "€",
  };
  try {
    if (typeof window === "undefined") return fallback;
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch { return fallback; }
}

function FloatingOverlay() {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [health, setHealth] = useState<RuleStatus>("green");
  const [snap, setSnap] = useState<Snapshot>(() => ({
    tradesUsed: 0, maxTrades: 3, sessionPL: 0, dailyStop: 0, maxRisk: 0,
    sessionLabel: "Session", sessionOpen: false, currency: "€",
  }));
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const movedRef = useRef(false);

  // Mount + initial position (bottom-right by default).
  useEffect(() => {
    setMounted(true);
    const clamp = (x: number, y: number) => {
      const maxX = window.innerWidth - CIRCLE - EDGE;
      const maxY = window.innerHeight - CIRCLE - EDGE;
      return { x: Math.max(EDGE, Math.min(x, maxX)), y: Math.max(EDGE, Math.min(y, maxY)) };
    };
    try {
      const raw = localStorage.getItem(POS_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      setPos(saved && typeof saved.x === "number"
        ? clamp(saved.x, saved.y)
        : clamp(window.innerWidth - CIRCLE - EDGE, window.innerHeight - CIRCLE - EDGE));
    } catch {
      setPos(clamp(window.innerWidth - CIRCLE - EDGE, window.innerHeight - CIRCLE - EDGE));
    }
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sync session health + snapshot from dashboard via localStorage.
  useEffect(() => {
    const sync = () => { setHealth(readHealth()); setSnap(readSnapshot()); };
    sync();
    const t = setInterval(sync, 3000);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === SNAPSHOT_KEY || e.key.includes("session-health")) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(t); window.removeEventListener("storage", onStorage); };
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {/*noop*/}
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    movedRef.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
    if (movedRef.current) {
      const maxX = window.innerWidth - CIRCLE - EDGE;
      const maxY = window.innerHeight - CIRCLE - EDGE;
      setPos({
        x: Math.max(EDGE, Math.min(dragRef.current.ox + dx, maxX)),
        y: Math.max(EDGE, Math.min(dragRef.current.oy + dy, maxY)),
      });
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {/*noop*/}
    const wasDragging = !!dragRef.current;
    const moved = movedRef.current;
    dragRef.current = null;
    if (!wasDragging) return;
    if (moved) {
      // Snap to nearest corner for cockpit feel.
      const maxX = window.innerWidth - CIRCLE - EDGE;
      const maxY = window.innerHeight - CIRCLE - EDGE;
      const left = pos.x < window.innerWidth / 2;
      const top = pos.y < window.innerHeight / 2;
      const snapped = { x: left ? EDGE : maxX, y: top ? EDGE : maxY };
      setPos(snapped);
      try { localStorage.setItem(POS_KEY, JSON.stringify(snapped)); } catch {/*noop*/}
    } else {
      setExpanded((v) => !v);
    }
  }

  if (!mounted) return null;

  const color = colorFor(health);
  const tradesLeft = Math.max(0, snap.maxTrades - snap.tradesUsed);
  const cur = snap.currency || "€";
  const pl = snap.sessionPL;
  const riskLeft = Math.max(0, snap.dailyStop + Math.min(0, pl)); // pl negative reduces room
  const panelRight = pos.x + CIRCLE / 2 < window.innerWidth / 2; // panel on left side if circle is on left

  // Tooltip position: above circle, centered.
  const tooltipStyle: React.CSSProperties = {
    left: pos.x + CIRCLE / 2,
    top: pos.y - 12,
    transform: "translate(-50%, -100%)",
  };

  return (
    <>
      <style>{`
        html,body,#root{background:transparent !important;}
        @keyframes ace-breathe {
          0%, 100% { box-shadow: 0 0 0 0 ${STATUS_RED}99, 0 8px 24px ${STATUS_RED}66; }
          50%      { box-shadow: 0 0 0 10px ${STATUS_RED}00, 0 8px 24px ${STATUS_RED}66; }
        }
      `}</style>

      {/* Circle */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="fixed grid place-items-center rounded-full cursor-pointer touch-none select-none transition-colors"
        style={{
          left: pos.x,
          top: pos.y,
          width: CIRCLE,
          height: CIRCLE,
          background: color,
          color: "#0d0f12",
          border: "2px solid rgba(255,255,255,0.18)",
          boxShadow: `0 8px 24px ${color}66`,
          fontFamily: "'IBM Plex Mono', monospace",
          animation: health === "red" ? "ace-breathe 1.8s ease-in-out infinite" : undefined,
          zIndex: 50,
        }}
        aria-label="TradeWithAce cockpit"
      >
        <div className="flex flex-col items-center leading-none">
          <span className="text-[22px] font-bold" style={{ color: "#fff" }}>{tradesLeft}</span>
          <span className="text-[8px] tracking-widest mt-0.5" style={{ color: "rgba(13,15,18,0.75)" }}>LEFT</span>
        </div>
      </button>

      {/* Hover tooltip */}
      {hover && !expanded && (
        <div
          className="fixed pointer-events-none rounded-lg p-3 animate-fade-in"
          style={{
            ...tooltipStyle,
            zIndex: 60,
            width: 220,
            background: "#141820",
            border: `1px solid ${color}55`,
            borderLeft: `3px solid ${color}`,
            color: "#e6e8eb",
            fontFamily: "'IBM Plex Mono', monospace",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div className="text-[9px] tracking-widest mb-2" style={{ color }}>
            {health === "green" ? "ALL GOOD" : health === "amber" ? "CAUTION" : "STOP TRADING"}
          </div>
          <TipRow label="Session" value={snap.sessionLabel} valueColor={snap.sessionOpen ? STATUS_GREEN : STATUS_AMBER} />
          <TipRow
            label="Today P&L"
            value={`${pl >= 0 ? "+" : "-"}${cur}${Math.abs(pl).toFixed(2)}`}
            valueColor={pl > 0 ? STATUS_GREEN : pl < 0 ? STATUS_RED : "#e6e8eb"}
          />
          <TipRow label="Trades left" value={`${tradesLeft} / ${snap.maxTrades}`} valueColor={color} />
          <TipRow label="Risk room" value={`${cur}${riskLeft.toFixed(0)}`} />
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <>
          <div
            className="fixed inset-0"
            style={{ background: "rgba(0,0,0,0.25)", zIndex: 55 }}
            onClick={() => setExpanded(false)}
          />
          <aside
            className="fixed top-0 h-full animate-slide-in-right flex flex-col"
            style={{
              [panelRight ? "left" : "right"]: 0,
              width: PANEL_W,
              background: "#0d0f12",
              borderLeft: panelRight ? "none" : `1px solid ${color}44`,
              borderRight: panelRight ? `1px solid ${color}44` : "none",
              boxShadow: panelRight
                ? "8px 0 24px rgba(0,0,0,0.5)"
                : "-8px 0 24px rgba(0,0,0,0.5)",
              color: "#e6e8eb",
              fontFamily: "'IBM Plex Mono', monospace",
              zIndex: 60,
            }}
          >
            <header
              className="flex items-center justify-between px-3 py-2.5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full"
                  style={{ width: 8, height: 8, background: color }}
                />
                <span className="text-[10px] tracking-widest" style={{ color }}>
                  COCKPIT
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="grid place-items-center rounded hover:bg-white/10"
                style={{ width: 22, height: 22, color: "#9ca3af" }}
                aria-label="Close"
              >
                <X size={13} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-3 space-y-4" style={{ scrollbarWidth: "none" }}>
              <style>{`::-webkit-scrollbar{display:none}`}</style>

              <Section icon={<Activity size={11} />} title="SESSION" accent={color}>
                <Row label="Status" value={snap.sessionLabel} valueColor={snap.sessionOpen ? STATUS_GREEN : STATUS_AMBER} />
                <Row label="Health" value={health.toUpperCase()} valueColor={color} />
              </Section>

              <Section icon={<Target size={11} />} title="TRADES" accent={color}>
                <Row label="Used" value={`${snap.tradesUsed} / ${snap.maxTrades}`} />
                <Row label="Remaining" value={String(tradesLeft)} valueColor={color} />
              </Section>

              <Section icon={<TrendingUp size={11} />} title="P&L" accent={color}>
                <Row
                  label="Today"
                  value={`${pl >= 0 ? "+" : "-"}${cur}${Math.abs(pl).toFixed(2)}`}
                  valueColor={pl > 0 ? STATUS_GREEN : pl < 0 ? STATUS_RED : "#e6e8eb"}
                />
                <Row label="Daily stop" value={`${cur}${snap.dailyStop.toFixed(0)}`} />
              </Section>

              <Section icon={<Shield size={11} />} title="RISK" accent={color}>
                <Row label="Per trade" value={`${cur}${snap.maxRisk.toFixed(0)}`} />
                <Row label="Room left" value={`${cur}${riskLeft.toFixed(0)}`} valueColor={color} />
              </Section>
            </div>

            <footer
              className="px-3 py-2 border-t text-[9px] tracking-widest flex items-center justify-between"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "#6b7280" }}
            >
              <span>v1.0 · COCKPIT</span>
              <span style={{ color }}>● LIVE</span>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}

function TipRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span className="tabular-nums" style={{ color: valueColor ?? "#e6e8eb" }}>{value}</span>
    </div>
  );
}

function Section({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-2 text-[9px] tracking-widest" style={{ color: accent }}>
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-1 rounded-md p-2.5" style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.06)" }}>
        {children}
      </div>
    </section>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span className="tabular-nums" style={{ color: valueColor ?? "#e6e8eb" }}>{value}</span>
    </div>
  );
}
