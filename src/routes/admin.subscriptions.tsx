import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, Panel, StatCard, adminTheme } from "@/components/admin/AdminLayout";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSubscriptions } from "@/lib/admin.functions";
import { Copy } from "lucide-react";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Admin — Subscriptions" }] }),
  component: AdminSubs,
});

function AdminSubs() {
  const fn = useServerFn(getSubscriptions);
  const { data } = useQuery({ queryKey: ["admin", "subs"], queryFn: () => fn() });

  return (
    <AdminLayout title="Subscriptions">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="MRR" value={data ? `$${data.summary.mrr}` : "—"} />
        <StatCard label="ARR" value={data ? `$${data.summary.arr}` : "—"} />
        <StatCard label="Active" value={data?.summary.activeCount ?? "—"} />
        <StatCard label="Cancelled this month" value={data?.summary.cancelledThisMonth ?? "—"} />
        <StatCard label="Failed payments" value={data?.summary.failedPayments ?? "—"} />
      </div>
      <Panel title="All subscriptions">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "#6b7280" }} className="text-left text-xs uppercase tracking-wider">
                <th className="py-2">User</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Amount/mo</th>
                <th>Started</th>
                <th>Stripe ID</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-t" style={{ borderColor: adminTheme.BORDER }}>
                  <td className="py-2.5">{r.full_name || "—"}</td>
                  <td style={{ color: "#9ca3af" }}>{r.email}</td>
                  <td className="uppercase text-xs">{r.plan}</td>
                  <td className="text-xs">{r.subscription_status}</td>
                  <td>${r.amount}</td>
                  <td style={{ color: "#9ca3af" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    {r.stripe_subscription_id ? (
                      <button
                        onClick={() => navigator.clipboard.writeText(r.stripe_subscription_id)}
                        className="flex items-center gap-1 text-xs font-mono"
                        style={{ color: "#9ca3af" }}
                        title="Click to copy"
                      >
                        {r.stripe_subscription_id.slice(0, 14)}…
                        <Copy size={11} />
                      </button>
                    ) : (
                      <span style={{ color: "#6b7280" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminLayout>
  );
}
