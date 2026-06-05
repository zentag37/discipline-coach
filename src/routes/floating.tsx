import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Minus, TrendingUp, TrendingDown, Bell, Activity, X } from "lucide-react";

export const Route = createFileRoute("/floating")({
  head: () => ({
    meta: [
      { title: "TradeWithAce — Floating Overlay" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: FloatingOverlay,
});

const WIDTH = 380;
const FAB_SIZE = 56;
const STORAGE_KEY = "tw-ace-overlay-fab-pos";

type Quote = { sym: string; price: string; change: string; up: boolean };

const QUOTES: Quote[] = [
  { sym: "GBP/USD", price: "1.2734", change: "+0.18%", up: true },
  { sym: "EUR/USD", price: "1.0892", change: "-0.07%", up: false },
  { sym: "USD/JPY", price: "156.42", change: "+0.34%", up: true },
];

const ALERTS = [
  { time: "09:31", text: "Session started · 0/5 trades", tone: "info" as const },
  { time: "09:47", text: "A+ setup confirmed on GBP/USD", tone: "ok" as const },
  { time: "10:12", text: "Risk check passed · 0.8% of account", tone: "ok" as const },
];

function sendToElectron(type: string, payload?: unknown) {
  try {
    // Electron preload-bridge (optional)
    (window as any).ace?.send?.(type, payload);
    // Postmessage fallback for BrowserView/WebContents host
    window.parent?.postMessage({ source: "tw-ace-overlay", type, payload }, "*");
  } catch {/*noop*/}
}

function FloatingOverlay() {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const movedRef = useRef(false);

  const clamp = (x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const maxX = window.innerWidth - FAB_SIZE - 8;
    const maxY = window.innerHeight - FAB_SIZE - 8;
    return { x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) };
  };

  useEffect(() => {
    if (!minimized || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      setPos(saved && typeof saved.x === "number"
        ? clamp(saved.x, saved.y)
        : clamp(window.innerWidth - FAB_SIZE - 16, window.innerHeight - FAB_SIZE - 16));
    } catch {
      setPos(clamp(window.innerWidth - FAB_SIZE - 16, window.innerHeight - FAB_SIZE - 16));
    }
  }, [minimized]);

  useEffect(() => {
    if (!minimized) return;
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minimized]);

  function minimize() {
    console.log("[floating] minimize → electronAPI.minimizeToFab", !!(window as any).electronAPI);
    (window as any).electronAPI?.minimizeToFab?.();
    setMinimized(true);
  }
  function expand() {
    console.log("[floating] expand → electronAPI.expandWindow", !!(window as any).electronAPI);
    (window as any).electronAPI?.expandWindow?.();
    setMinimized(false);
  }
  function hideWindow() {
    const api = (window as any).aceAPI ?? (window as any).electronAPI;
    api?.hideWindow?.();
  }
  const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;

  function onFabDown(e: React.PointerEvent) {
    if (!pos) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {/*noop*/}
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    movedRef.current = false;
  }
  function onFabMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
    if (movedRef.current) {
      setPos(clamp(dragRef.current.ox + dx, dragRef.current.oy + dy));
    }
  }
  function onFabUp(e: React.PointerEvent) {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {/*noop*/}
    const wasDragging = !!dragRef.current;
    const moved = movedRef.current;
    dragRef.current = null;
    if (!wasDragging) return;
    if (!moved) {
      expand();
    } else if (pos) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {/*noop*/}
    }
  }
  function onFabClick() {
    // Fallback for environments where pointerup doesn't fire (e.g. Electron tray-spawned focus)
    if (!movedRef.current) expand();
  }

  if (minimized) {
    if (!pos) return null;
    return (
      <>
        <style>{`html,body,#root{background:transparent !important;}`}</style>
        <button
          onPointerDown={onFabDown}
          onPointerMove={onFabMove}
          onPointerUp={onFabUp}
          onPointerCancel={onFabUp}
          onClick={onFabClick}
          onMouseEnter={() => { try { (window as any).electronAPI?.fabHover?.(true); } catch {/*noop*/} }}
          onMouseLeave={() => { try { (window as any).electronAPI?.fabHover?.(false); } catch {/*noop*/} }}
          className="fixed rounded-full grid place-items-center cursor-pointer touch-none select-none shadow-lg"
          style={{
            left: pos.x,
            top: pos.y,
            width: FAB_SIZE,
            height: FAB_SIZE,
            background: "#00d4a0",
            border: "2px solid rgba(255,255,255,0.15)",
            boxShadow: "0 8px 24px rgba(0,212,160,0.45)",
            color: "#0d0f12",
            fontSize: 24,
          }}
          aria-label="Expand TradeWithAce"
        >
          📊
        </button>
      </>
    );
  }

  return (
    <div
      className="overflow-hidden select-none"
      style={{
        width: WIDTH,
        maxWidth: "100vw",
        height: "100vh",
        background: "#0d0f12",
        color: "#e6e8eb",
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        scrollbarWidth: "none",
      }}
    >
      <style>{`::-webkit-scrollbar{display:none}`}</style>

      {/* Header — drag region for Electron */}
      <header
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          // @ts-expect-error electron drag region
          WebkitAppRegion: "drag",
        }}
      >
        <div className="flex items-center gap-2">
          <Logo size={18} />
          <span className="text-[12px] tracking-tight">TradeWithAce</span>
        </div>
        <button
          onClick={minimize}
          className="grid place-items-center rounded hover:bg-white/10 transition"
          style={{
            width: 22, height: 22, color: "#9ca3af",
            // @ts-expect-error electron drag region
            WebkitAppRegion: "no-drag",
          }}
          aria-label="Minimize"
        >
          <Minus size={14} />
        </button>
      </header>

      {/* Status */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <span className="relative grid place-items-center" style={{ width: 8, height: 8 }}>
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#00d4a0", opacity: 0.4 }} />
            <span className="relative rounded-full" style={{ width: 8, height: 8, background: "#00d4a0" }} />
          </span>
          <span className="text-[11px]" style={{ color: "#00d4a0" }}>Active</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "#6b7280" }}>Session · live</span>
      </div>

      {/* Live overview */}
      <section className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity size={11} style={{ color: "#00d4a0" }} />
          <h2 className="text-[10px] uppercase tracking-widest" style={{ color: "#9ca3af" }}>Live overview</h2>
        </div>
        <div className="space-y-1">
          {QUOTES.map((q) => (
            <QuoteRow key={q.sym} q={q} />
          ))}
        </div>
      </section>

      {/* Alerts */}
      <section className="px-3 pt-3 pb-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Bell size={11} style={{ color: "#00d4a0" }} />
            <h2 className="text-[10px] uppercase tracking-widest" style={{ color: "#9ca3af" }}>ACE Alerts</h2>
          </div>
          <span className="text-[10px]" style={{ color: "#6b7280" }}>3 / 5 trades</span>
        </div>
        <ul className="space-y-1.5">
          {ALERTS.map((a, i) => (
            <li key={i} className="flex gap-2 items-start rounded px-2 py-1.5" style={{ background: "#141820" }}>
              <span className="text-[10px] pt-0.5 tabular-nums" style={{ color: "#6b7280" }}>{a.time}</span>
              <span
                className="mt-1 rounded-full"
                style={{
                  width: 5, height: 5, flexShrink: 0,
                  background: a.tone === "ok" ? "#00d4a0" : "#3b82f6",
                }}
              />
              <span className="text-[11px] leading-snug" style={{ color: "#d1d5db" }}>{a.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="px-3 py-2 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-[10px]" style={{ color: "#6b7280" }}>v1.0 · floating overlay</span>
        <span className="text-[10px]" style={{ color: "#00d4a0" }}>● online</span>
      </footer>
    </div>
  );
}

function QuoteRow({ q }: { q: Quote }) {
  const color = q.up ? "#00d4a0" : "#00d4a0";
  const Icon = q.up ? TrendingUp : TrendingDown;
  return (
    <div
      className="flex items-center justify-between rounded px-2.5 py-1.5"
      style={{ background: "#141820" }}
    >
      <span className="text-[11px]" style={{ color: "#e6e8eb" }}>{q.sym}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] tabular-nums" style={{ color: "#d1d5db" }}>{q.price}</span>
        <span className="flex items-center gap-1 text-[10px] tabular-nums" style={{ color }}>
          <Icon size={11} /> {q.change}
        </span>
      </div>
    </div>
  );
}

function Logo({ size = 18 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded"
      style={{
        width: size, height: size,
        background: "rgba(0,212,160,0.15)",
        color: "#00d4a0",
        fontSize: size * 0.55,
        fontWeight: 600,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      A
    </div>
  );
}
