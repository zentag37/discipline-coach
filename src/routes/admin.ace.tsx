import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, Panel, StatCard, adminTheme } from "@/components/admin/AdminLayout";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAceUsage } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/ace")({
  head: () => ({ meta: [{ title: "Admin — ACE Usage" }] }),
  component: AdminAce,
});

function AdminAce() {
  const fn = useServerFn(getAceUsage);
  const { data } = useQuery({ queryKey: ["admin", "ace"], queryFn: () => fn() });

  return (
    <AdminLayout title="ACE Usage">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="ACE messages" value={data?.totalMessages ?? "—"} />
        <StatCard label="Weekly reviews" value={data?.totalReviews ?? "—"} />
        <StatCard label="Voice users" value={data?.voiceUsers ?? "—"} />
        <StatCard label="Est. API cost (mo)" value={data ? `$${data.apiCostEstimate}` : "—"} />
      </div>
      <Panel title="Top 10 ACE users">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "#6b7280" }} className="text-left text-xs uppercase tracking-wider">
              <th className="py-2">User</th>
              <th>Journals</th>
              <th>Reviews</th>
              <th>Voice</th>
            </tr>
          </thead>
          <tbody>
            {(data?.topUsers ?? []).map((u: any) => (
              <tr key={u.user_id} className="border-t" style={{ borderColor: adminTheme.BORDER }}>
                <td className="py-2.5">{u.name}</td>
                <td>{u.journals}</td>
                <td>{u.reviews}</td>
                <td style={{ color: u.voice_enabled ? adminTheme.TEAL : "#6b7280" }}>
                  {u.voice_enabled ? "On" : "Off"}
                </td>
              </tr>
            ))}
            {(data?.topUsers ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-sm" style={{ color: "#6b7280" }}>No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AdminLayout>
  );
}
