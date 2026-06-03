import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, StatCard, Panel, adminTheme } from "@/components/admin/AdminLayout";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOverviewStats, getRecentSignups, getDownloadStats } from "@/lib/admin.functions";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Overview" }] }),
  component: AdminOverview,
});

const COLORS = ["#6b7280", adminTheme.TEAL, "#f59e0b"];

function AdminOverview() {
  const statsFn = useServerFn(getOverviewStats);
  const signupsFn = useServerFn(getRecentSignups);
  const downloadsFn = useServerFn(getDownloadStats);
  const { data: stats } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => statsFn() });
  const { data: signups } = useQuery({ queryKey: ["admin", "signups"], queryFn: () => signupsFn() });
  const { data: downloads } = useQuery({ queryKey: ["admin", "downloads"], queryFn: () => downloadsFn() });

  const pieData = stats
    ? [
        { name: "Solo", value: stats.planCounts.solo || 0 },
        { name: "Pro", value: stats.planCounts.pro || 0 },
        { name: "Elite", value: stats.planCounts.elite || 0 },
      ]
    : [];

  return (
    <AdminLayout title="Overview">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total users" value={stats?.totalUsers ?? "—"} />
        <StatCard label="Active today" value={stats?.activeToday ?? "—"} />
        <StatCard label="Monthly revenue" value={stats ? `$${stats.monthlyRevenue}` : "—"} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Churn this month" value={stats?.churnThisMonth ?? "—"} />
        <StatCard label="Solo / Pro / Elite" value={stats ? `${stats.planCounts.solo} / ${stats.planCounts.pro} / ${stats.planCounts.elite}` : "—"} />
        <StatCard label="Trades logged today" value={stats?.tradesToday ?? "—"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel title="New signups (last 30 days)">
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={stats?.signupsByDay ?? []}>
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0d0f12", border: `1px solid ${adminTheme.BORDER}`, fontSize: 12 }} />
                <Bar dataKey="count" fill={adminTheme.TEAL} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Plan breakdown">
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0d0f12", border: `1px solid ${adminTheme.BORDER}`, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-xs mt-2" style={{ color: "#9ca3af" }}>
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} /> {p.name} ({p.value})
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title={`Desktop downloads (last 30 days) — Mac ${downloads?.macTotal ?? 0} · Windows ${downloads?.winTotal ?? 0} · Total ${downloads?.total ?? 0}`}>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={downloads?.daily ?? []}>
              <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
              <YAxis stroke="#6b7280" fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0d0f12", border: `1px solid ${adminTheme.BORDER}`, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="mac" name="Mac" stroke={adminTheme.TEAL} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="windows" name="Windows" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="h-4" />
      <Panel title="Recent signups">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "#6b7280" }} className="text-left text-xs uppercase tracking-wider">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(signups ?? []).map((s: any) => (
              <tr key={s.id} className="border-t" style={{ borderColor: adminTheme.BORDER }}>
                <td className="py-2.5">{s.full_name || "—"}</td>
                <td style={{ color: "#9ca3af" }}>{s.email}</td>
                <td><PlanPill plan={s.plan} /></td>
                <td style={{ color: "#9ca3af" }}>{new Date(s.created_at).toLocaleDateString()}</td>
                <td style={{ color: s.subscription_status === "active" ? adminTheme.TEAL : "#9ca3af" }}>
                  {s.subscription_status === "active" ? "Active" : "Inactive"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AdminLayout>
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
