import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";
import { BarChart3, Users, CreditCard, Activity, Bot, MessageSquare, Settings as SettingsIcon, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { checkAdmin } from "@/lib/admin.functions";

const TEAL = "#ef4444";
const BG = "#0a0c0f";
const PANEL = "#0d0f12";
const BORDER = "rgba(255,255,255,0.06)";

const NAV = [
  { to: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/activity", label: "Trades & Activity", icon: Activity },
  { to: "/admin/ace", label: "ACE Usage", icon: Bot },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const check = useServerFn(checkAdmin);
  const [state, setState] = useState<"loading" | "ok" | "deny">("loading");
  const [name, setName] = useState("Admin");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      setName((data.user.user_metadata?.full_name as string) || data.user.email?.split("@")[0] || "Admin");
      try {
        const res = await check();
        if (!mounted) return;
        if (res.isAdmin) setState("ok");
        else {
          setState("deny");
          navigate({ to: "/dashboard" });
        }
      } catch {
        navigate({ to: "/dashboard" });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (state !== "ok") {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: BG, color: "#9ca3af" }}>
        {state === "loading" ? "Verifying access…" : "Redirecting…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: BG, color: "#e5e7eb" }}>
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{ background: PANEL, borderRight: `1px solid ${BORDER}` }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: BORDER }}>
          <div className="text-sm font-semibold tracking-wide">TradeWithAce</div>
          <div className="text-[10px] mt-1 tracking-widest" style={{ color: "#ef4444" }}>ADMIN CONSOLE</div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors"
                style={{
                  background: active ? "rgba(239,68,68,0.08)" : "transparent",
                  color: active ? TEAL : "#9ca3af",
                }}
              >
                <Icon size={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t" style={{ borderColor: BORDER }}>
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded text-sm" style={{ color: "#9ca3af" }}>
            <LogOut size={16} />
            Exit admin
          </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 px-6 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${BORDER}`, background: PANEL }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium">{title}</h1>
            <span
              className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
            >
              ADMIN
            </span>
          </div>
          <div className="text-sm" style={{ color: "#9ca3af" }}>{name}</div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
      <div className="text-[11px] uppercase tracking-widest" style={{ color: "#6b7280" }}>{label}</div>
      <div className="text-2xl font-semibold mt-2" style={{ color: "#f3f4f6" }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}

export function Panel({ children, title, right }: { children: ReactNode; title?: string; right?: ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="text-sm font-medium" style={{ color: "#e5e7eb" }}>{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export const adminTheme = { TEAL, BG, PANEL, BORDER };
