import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, Panel, adminTheme } from "@/components/admin/AdminLayout";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAppSettings, updateAppSettings } from "@/lib/admin.functions";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin — Settings" }] }),
  component: AdminSettings,
});

function AdminSettings() {
  const getFn = useServerFn(getAppSettings);
  const setFn = useServerFn(updateAppSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => getFn() });
  const [local, setLocal] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setLocal(data); }, [data]);

  async function save(patch: any) {
    setSaving(true);
    const next = { ...local, ...patch };
    setLocal(next);
    try {
      await setFn({ data: patch });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    } finally { setSaving(false); }
  }

  if (!local) return <AdminLayout title="Settings"><div style={{ color: "#9ca3af" }}>Loading…</div></AdminLayout>;

  return (
    <AdminLayout title="Settings">
      <div className="space-y-4 max-w-2xl">
        <Panel title="Maintenance">
          <Toggle label="Maintenance mode" value={local.maintenance_mode} onChange={(v) => save({ maintenance_mode: v })} />
        </Panel>

        <Panel title="Announcement banner">
          <Toggle label="Show banner" value={local.announcement_enabled} onChange={(v) => save({ announcement_enabled: v })} />
          <textarea
            value={local.announcement_text}
            onChange={(e) => setLocal({ ...local, announcement_text: e.target.value })}
            onBlur={() => save({ announcement_text: local.announcement_text })}
            placeholder="Banner message…"
            className="w-full mt-3 px-3 py-2 text-sm rounded outline-none"
            rows={2}
            style={{ background: "#0a0c0f", border: `1px solid ${adminTheme.BORDER}`, color: "#e5e7eb" }}
          />
        </Panel>

        <Panel title="Defaults">
          <label className="text-sm" style={{ color: "#9ca3af" }}>Default plan for new users</label>
          <select
            value={local.default_plan}
            onChange={(e) => save({ default_plan: e.target.value })}
            className="block mt-2 px-3 py-2 text-sm rounded outline-none"
            style={{ background: "#0a0c0f", border: `1px solid ${adminTheme.BORDER}`, color: "#e5e7eb" }}
          >
            <option value="solo">Solo</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </select>
        </Panel>

        <Panel title="Beta features">
          <Toggle label="Enable PDF reports" value={local.feature_pdf_reports} onChange={(v) => save({ feature_pdf_reports: v })} />
          <Toggle label="Enable prop firm team dashboard" value={local.feature_prop_team} onChange={(v) => save({ feature_prop_team: v })} />
          <Toggle label="Enable API access" value={local.feature_api_access} onChange={(v) => save({ feature_api_access: v })} />
        </Panel>

        {saving && <div className="text-xs" style={{ color: adminTheme.TEAL }}>Saving…</div>}
      </div>
    </AdminLayout>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="relative w-10 h-6 rounded-full transition-colors"
        style={{ background: value ? adminTheme.TEAL : "#2d3138" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
          style={{ transform: value ? "translateX(18px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}
