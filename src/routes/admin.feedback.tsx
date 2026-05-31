import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, Panel } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({ meta: [{ title: "Admin — Feedback" }] }),
  component: () => (
    <AdminLayout title="Feedback">
      <Panel title="User feedback">
        <div className="text-sm py-6 text-center" style={{ color: "#6b7280" }}>
          Feedback collection isn't wired up yet — add a feedback table and form to populate this view.
        </div>
      </Panel>
    </AdminLayout>
  ),
});
