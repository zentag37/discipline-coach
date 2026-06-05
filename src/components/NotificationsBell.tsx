import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

type Notification = {
  id: number;
  type: "warning" | "info" | "success";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const INITIAL: Notification[] = [
  { id: 1, type: "warning", title: "Daily loss limit", body: "You're at 80% of your daily loss limit.", time: "2m ago", read: false },
  { id: 2, type: "info", title: "Session started", body: "Morning session detected on IG platform.", time: "14m ago", read: false },
  { id: 3, type: "success", title: "Trade rule followed", body: "No revenge trades in last session.", time: "1h ago", read: true },
];

function TypeIcon({ type }: { type: Notification["type"] }) {
  const common = { size: 16 };
  if (type === "warning") return <AlertTriangle {...common} style={{ color: "#f5a623" }} />;
  if (type === "success") return <CheckCircle2 {...common} style={{ color: "#22c55e" }} />;
  return <Info {...common} style={{ color: "#00d4a0" }} />;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>(INITIAL);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded hover:bg-white/5"
        style={{ color: "#9ca3af" }}
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
            style={{ background: "#00d4a0", color: "#fff" }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{ background: "#1a1f29", border: "1px solid rgba(255,255,255,0.08)", color: "#e6e8eb" }}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="text-sm font-medium">Notifications</span>
            <button
              onClick={() => setItems((arr) => arr.map((n) => ({ ...n, read: true })))}
              className="text-xs hover:underline"
              style={{ color: "#00d4a0" }}
              disabled={unread === 0}
            >
              Mark all read
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center" style={{ color: "#9ca3af" }}>
              <Bell size={24} className="mb-2 opacity-50" />
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() =>
                    setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                  }
                  className="flex gap-3 px-3 py-3 hover:bg-white/5 cursor-pointer"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="mt-0.5"><TypeIcon type={n.type} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium truncate">{n.title}</p>
                      <span className="text-[10px] shrink-0" style={{ color: "#9ca3af" }}>{n.time}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{n.body}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: "#00d4a0" }} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
