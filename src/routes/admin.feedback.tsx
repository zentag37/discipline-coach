import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout, Panel, StatCard, adminTheme } from "@/components/admin/AdminLayout";
import { listFeedback, updateFeedback, deleteFeedback } from "@/lib/admin.functions";
import { Bug, Lightbulb, HelpCircle, Heart, MessageSquare, Trash2, X } from "lucide-react";

type Status = "all" | "new" | "in_progress" | "resolved" | "archived";

type FeedbackItem = {
  id: string;
  user_id: string;
  user_name: string | null;
  category: "bug" | "feature" | "question" | "praise" | "other";
  subject: string;
  message: string;
  status: "new" | "in_progress" | "resolved" | "archived";
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  in_progress: "#f59e0b",
  resolved: "#10b981",
  archived: "#6b7280",
};

const CATEGORY_ICONS: Record<string, any> = {
  bug: Bug,
  feature: Lightbulb,
  question: HelpCircle,
  praise: Heart,
  other: MessageSquare,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({ meta: [{ title: "Admin — Feedback" }] }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const list = useServerFn(listFeedback);
  const update = useServerFn(updateFeedback);
  const del = useServerFn(deleteFeedback);

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, new: 0, in_progress: 0, resolved: 0 });
  const [filter, setFilter] = useState<Status>("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (status: Status) => {
    setLoading(true);
    try {
      const res = await list({ data: { status } });
      setItems(res.items as FeedbackItem[]);
      setCounts(res.counts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (selected) setResponse(selected.admin_response || "");
  }, [selected]);

  const handleStatus = async (id: string, status: FeedbackItem["status"]) => {
    setSaving(true);
    try {
      await update({ data: { id, status } });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      if (selected?.id === id) setSelected({ ...selected, status });
    } finally {
      setSaving(false);
    }
  };

  const handleRespond = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await update({
        data: { id: selected.id, admin_response: response, status: selected.status === "new" ? "in_progress" : selected.status },
      });
      await load(filter);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    await del({ data: { id } });
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const tabs: { key: Status; label: string; count?: number }[] = useMemo(
    () => [
      { key: "all", label: "All", count: counts.total },
      { key: "new", label: "New", count: counts.new },
      { key: "in_progress", label: "In progress", count: counts.in_progress },
      { key: "resolved", label: "Resolved", count: counts.resolved },
      { key: "archived", label: "Archived" },
    ],
    [counts],
  );

  return (
    <AdminLayout title="Feedback">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={counts.total} />
          <StatCard label="New" value={counts.new} />
          <StatCard label="In progress" value={counts.in_progress} />
          <StatCard label="Resolved" value={counts.resolved} />
        </div>

        <Panel
          title="User feedback"
          right={
            <div className="flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className="text-xs px-2.5 py-1 rounded transition-colors"
                  style={{
                    background: filter === t.key ? "rgba(239,68,68,0.12)" : "transparent",
                    color: filter === t.key ? adminTheme.TEAL : "#9ca3af",
                    border: `1px solid ${filter === t.key ? "rgba(239,68,68,0.3)" : adminTheme.BORDER}`,
                  }}
                >
                  {t.label}
                  {typeof t.count === "number" && <span className="ml-1 opacity-60">({t.count})</span>}
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <div className="py-8 text-center text-sm" style={{ color: "#6b7280" }}>Loading…</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: "#6b7280" }}>
              No feedback {filter !== "all" ? `with status "${filter}"` : "yet"}.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const Icon = CATEGORY_ICONS[item.category] || MessageSquare;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="w-full text-left rounded-md p-3 flex items-start gap-3 transition-colors hover:bg-white/[0.02]"
                    style={{ border: `1px solid ${adminTheme.BORDER}` }}
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <Icon size={14} style={{ color: "#9ca3af" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate" style={{ color: "#f3f4f6" }}>
                          {item.subject}
                        </span>
                        <span
                          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            background: `${STATUS_COLORS[item.status]}22`,
                            color: STATUS_COLORS[item.status],
                          }}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                        {item.admin_response && (
                          <span className="text-[10px]" style={{ color: adminTheme.TEAL }}>● replied</span>
                        )}
                      </div>
                      <div className="text-xs line-clamp-1" style={{ color: "#9ca3af" }}>
                        {item.message}
                      </div>
                      <div className="text-[11px] mt-1" style={{ color: "#6b7280" }}>
                        {item.user_name || item.user_id.slice(0, 8)} · {item.category} · {fmtDate(item.created_at)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md h-full overflow-auto flex flex-col"
            style={{ background: adminTheme.PANEL, borderLeft: `1px solid ${adminTheme.BORDER}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${adminTheme.BORDER}` }}>
              <div className="text-sm font-medium">Feedback detail</div>
              <button onClick={() => setSelected(null)} style={{ color: "#9ca3af" }}>
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1">
              <div>
                <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#6b7280" }}>Subject</div>
                <div className="text-sm font-medium" style={{ color: "#f3f4f6" }}>{selected.subject}</div>
              </div>
              <div className="flex gap-4 text-xs" style={{ color: "#9ca3af" }}>
                <div><span style={{ color: "#6b7280" }}>From:</span> {selected.user_name || selected.user_id.slice(0, 8)}</div>
                <div><span style={{ color: "#6b7280" }}>Category:</span> {selected.category}</div>
              </div>
              <div className="text-[11px]" style={{ color: "#6b7280" }}>{fmtDate(selected.created_at)}</div>

              <div>
                <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#6b7280" }}>Message</div>
                <div className="text-sm whitespace-pre-wrap p-3 rounded" style={{ background: "rgba(255,255,255,0.03)", color: "#e5e7eb" }}>
                  {selected.message}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Status</div>
                <div className="flex gap-1.5 flex-wrap">
                  {(["new", "in_progress", "resolved", "archived"] as const).map((s) => (
                    <button
                      key={s}
                      disabled={saving}
                      onClick={() => handleStatus(selected.id, s)}
                      className="text-xs px-2.5 py-1 rounded capitalize transition-colors"
                      style={{
                        background: selected.status === s ? `${STATUS_COLORS[s]}22` : "transparent",
                        color: selected.status === s ? STATUS_COLORS[s] : "#9ca3af",
                        border: `1px solid ${selected.status === s ? STATUS_COLORS[s] + "55" : adminTheme.BORDER}`,
                      }}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Admin response</div>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={6}
                  placeholder="Write a response to this user…"
                  className="w-full text-sm p-3 rounded resize-none outline-none"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${adminTheme.BORDER}`,
                    color: "#e5e7eb",
                  }}
                />
                {selected.responded_at && (
                  <div className="text-[11px] mt-1" style={{ color: "#6b7280" }}>
                    Last replied {fmtDate(selected.responded_at)}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${adminTheme.BORDER}` }}>
              <button
                onClick={() => handleDelete(selected.id)}
                disabled={saving}
                className="text-xs px-2.5 py-1.5 rounded flex items-center gap-1.5"
                style={{ color: "#ef4444", border: `1px solid rgba(239,68,68,0.3)` }}
              >
                <Trash2 size={12} /> Delete
              </button>
              <button
                onClick={handleRespond}
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded font-medium"
                style={{ background: adminTheme.TEAL, color: "#0a0c0f" }}
              >
                {saving ? "Saving…" : "Save response"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
