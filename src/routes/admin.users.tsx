import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminLayout, Panel, adminTheme } from "@/components/admin/AdminLayout";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listUsers, getUserDetail, updateUserPlan } from "@/lib/admin.functions";
import { X, Search } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Admin — Users" }] }),
  component: AdminUsers,
});

const FILTERS = ["All", "Solo", "Pro", "Elite", "Active", "Cancelled"];

function AdminUsers() {
  const listFn = useServerFn(listUsers);
  const { data: users } = useQuery({ queryKey: ["admin", "users"], queryFn: () => listFn() });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (users ?? []).filter((u: any) => {
      if (q && !`${u.full_name || ""} ${u.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (["Solo", "Pro", "Elite"].includes(filter) && (u.plan || "").toLowerCase() !== filter.toLowerCase()) return false;
      if (filter === "Active" && u.subscription_status !== "active") return false;
      if (filter === "Cancelled" && u.subscription_status !== "cancelled") return false;
      return true;
    });
  }, [users, q, filter]);

  return (
    <AdminLayout title="Users">
      <Panel>
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7280" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded outline-none"
              style={{ background: "#0a0c0f", border: `1px solid ${adminTheme.BORDER}`, color: "#e5e7eb" }}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs px-3 py-1.5 rounded"
                style={{
                  background: filter === f ? adminTheme.TEAL : "transparent",
                  color: filter === f ? "#0a0c0f" : "#9ca3af",
                  border: `1px solid ${filter === f ? adminTheme.TEAL : adminTheme.BORDER}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "#6b7280" }} className="text-left text-xs uppercase tracking-wider">
                <th className="py-2"></th>
                <th>Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Trades</th>
                <th>Joined</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => (
                <tr
                  key={u.id}
                  onClick={() => setOpenId(u.id)}
                  className="border-t cursor-pointer hover:bg-white/[0.02]"
                  style={{ borderColor: adminTheme.BORDER }}
                >
                  <td className="py-2.5">
                    <Avatar name={u.full_name || u.email} />
                  </td>
                  <td>{u.full_name || "—"}</td>
                  <td style={{ color: "#9ca3af" }}>{u.email}</td>
                  <td><PlanPill plan={u.plan} /></td>
                  <td>
                    <StatusPill status={u.subscription_status} />
                  </td>
                  <td>{u.trade_count}</td>
                  <td style={{ color: "#9ca3af" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ color: "#9ca3af" }}>{u.last_active ? new Date(u.last_active).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-8 text-center text-sm" style={{ color: "#6b7280" }}>No users match.</div>}
        </div>
      </Panel>
      {openId && <UserDetailPanel userId={openId} onClose={() => setOpenId(null)} />}
    </AdminLayout>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "U";
  return (
    <div
      className="w-7 h-7 grid place-items-center rounded-full text-[11px] font-semibold"
      style={{ background: "rgba(239,68,68,0.15)", color: adminTheme.TEAL }}
    >
      {initials}
    </div>
  );
}

function PlanPill({ plan }: { plan?: string }) {
  const p = (plan || "solo").toLowerCase();
  const color = p === "pro" ? adminTheme.TEAL : p === "elite" ? "#f59e0b" : "#6b7280";
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider" style={{ background: `${color}22`, color }}>
      {p}
    </span>
  );
}

function StatusPill({ status }: { status?: string }) {
  const s = (status || "inactive").toLowerCase();
  const color = s === "active" ? adminTheme.TEAL : s === "past_due" ? "#f59e0b" : s === "cancelled" ? "#ef4444" : "#6b7280";
  const label = s === "past_due" ? "Past due" : s.charAt(0).toUpperCase() + s.slice(1);
  return <span className="text-xs" style={{ color }}>{label}</span>;
}

function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const detailFn = useServerFn(getUserDetail);
  const updatePlanFn = useServerFn(updateUserPlan);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "user", userId], queryFn: () => detailFn({ data: { userId } }) });

  async function changePlan(plan: string) {
    await updatePlanFn({ data: { userId, plan } });
    qc.invalidateQueries({ queryKey: ["admin", "user", userId] });
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 overflow-auto"
        style={{ width: 360, background: adminTheme.PANEL, borderLeft: `1px solid ${adminTheme.BORDER}` }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: adminTheme.BORDER }}>
          <div className="text-sm font-medium">User detail</div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded" style={{ color: "#9ca3af" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {!data && <div className="text-sm" style={{ color: "#9ca3af" }}>Loading…</div>}
          {data && (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={data.profile?.full_name || data.email || "U"} />
                <div>
                  <div className="text-sm font-medium">{data.profile?.full_name || "—"}</div>
                  <div className="text-xs" style={{ color: "#9ca3af" }}>{data.email}</div>
                </div>
                <div className="ml-auto"><PlanPill plan={data.profile?.plan} /></div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Trades" value={data.stats.totalTrades} />
                <Stat label="Win rate" value={`${data.stats.winRate}%`} />
                <Stat label="Days active" value={data.stats.daysActive} />
              </div>

              <div className="text-xs space-y-1.5" style={{ color: "#9ca3af" }}>
                <div>Status: <StatusPill status={data.profile?.subscription_status ?? undefined} /></div>
                <div>Account size: {data.profile?.account_size || "—"}</div>
                <div>Risk/trade: {data.profile?.risk_per_trade ?? "—"}%</div>
                <div>Max trades: {data.profile?.max_trades ?? "—"}</div>
                <div>Instruments: {data.profile?.instruments || "—"}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Last 5 trades</div>
                <div className="space-y-1.5">
                  {data.recentTrades.map((t: any) => (
                    <div key={t.id} className="text-xs flex justify-between p-2 rounded" style={{ background: "#0a0c0f" }}>
                      <span>{t.trade_date} · {t.instrument || "—"} {t.direction || ""}</span>
                      <span style={{ color: Number(t.result_dollars) >= 0 ? adminTheme.TEAL : "#ef4444" }}>
                        {t.result_dollars != null ? `${Number(t.result_dollars) >= 0 ? "+" : ""}€${Number(t.result_dollars).toFixed(0)}` : "—"}
                      </span>
                    </div>
                  ))}
                  {data.recentTrades.length === 0 && <div className="text-xs" style={{ color: "#6b7280" }}>No trades.</div>}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Change plan</div>
                <div className="flex gap-1.5">
                  {["solo", "pro", "elite"].map((p) => (
                    <button
                      key={p}
                      onClick={() => changePlan(p)}
                      className="flex-1 text-xs py-2 rounded uppercase tracking-wider"
                      style={{
                        background: (data.profile?.plan || "solo") === p ? adminTheme.TEAL : "transparent",
                        color: (data.profile?.plan || "solo") === p ? "#0a0c0f" : "#9ca3af",
                        border: `1px solid ${adminTheme.BORDER}`,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <a
                href={`mailto:${data.email}`}
                className="block text-center text-xs py-2 rounded"
                style={{ border: `1px solid ${adminTheme.BORDER}`, color: "#e5e7eb" }}
              >
                Send email
              </a>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-2 rounded" style={{ background: "#0a0c0f" }}>
      <div className="text-base font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "#6b7280" }}>{label}</div>
    </div>
  );
}
