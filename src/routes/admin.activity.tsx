import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, Panel, StatCard, adminTheme } from "@/components/admin/AdminLayout";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getActivity } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({ meta: [{ title: "Admin — Activity" }] }),
  component: AdminActivity,
});

function AdminActivity() {
  const fn = useServerFn(getActivity);
  const { data } = useQuery({ queryKey: ["admin", "activity"], queryFn: () => fn(), refetchInterval: 15000 });

  return (
    <AdminLayout title="Trades & Activity">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total trades" value={data?.totalTrades ?? "—"} />
        <StatCard label="Trades today" value={data?.tradesToday ?? "—"} />
        <StatCard label="Most active today" value={data?.mostActiveUser ?? "—"} />
        <StatCard label="Top instrument today" value={data?.mostTradedInstrument ?? "—"} />
      </div>
      <Panel title="Recent activity">
        <div className="space-y-1.5">
          {(data?.feed ?? []).map((f: any) => (
            <div key={f.id} className="flex justify-between text-sm py-2 border-b" style={{ borderColor: adminTheme.BORDER }}>
              <span>{f.text}</span>
              <span className="text-xs" style={{ color: "#6b7280" }}>{new Date(f.time).toLocaleString()}</span>
            </div>
          ))}
          {(data?.feed ?? []).length === 0 && <div className="text-sm py-4" style={{ color: "#6b7280" }}>No activity yet.</div>}
        </div>
      </Panel>
    </AdminLayout>
  );
}
