import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Apple, Monitor, Download as DownloadIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DOWNLOAD_MAC, DOWNLOAD_WIN, trackDownload } from "@/lib/downloads";

export const Route = createFileRoute("/download")({
  head: () => ({ meta: [{ title: "Download — TradeWithAce" }] }),
  component: DownloadPage,
});

const TEAL = "#00d4a0";

function DownloadPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate({ to: "/login" });
      else setChecked(true);
    })();
  }, [navigate]);

  if (!checked) return <div style={{ background: "#0d0f12", minHeight: "100vh" }} />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "#0d0f12", color: "#e6e8eb", fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="w-full max-w-xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs mb-8"
          style={{ color: "#9ca3af" }}>
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="text-[10px] tracking-widest mb-3" style={{ color: TEAL }}>DESKTOP APP · v1.0.0</div>
        <h1 className="text-3xl tracking-tight mb-3" style={{ fontFamily: "Inter, sans-serif" }}>
          Download TradeWithAce
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "#9ca3af", fontFamily: "Inter, sans-serif" }}>
          The floating coach that sits on top of any trading platform. Pick your OS.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <a href={DOWNLOAD_MAC} download onClick={() => trackDownload("mac")}
            className="group flex items-center justify-between rounded-lg p-5 transition hover:-translate-y-0.5"
            style={{ background: "#141820", border: `1px solid ${TEAL}40` }}>
            <div className="flex items-center gap-3">
              <Apple size={24} style={{ color: TEAL }} />
              <div>
                <div className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Download for Mac</div>
                <div className="text-[11px]" style={{ color: "#6b7280" }}>Apple Silicon · .dmg</div>
              </div>
            </div>
            <DownloadIcon size={16} style={{ color: "#6b7280" }} />
          </a>

          <a href={DOWNLOAD_WIN} onClick={() => trackDownload("windows")}
            className="group flex items-center justify-between rounded-lg p-5 transition hover:-translate-y-0.5"
            style={{ background: "#141820", border: `1px solid ${TEAL}40` }}>
            <div className="flex items-center gap-3">
              <Monitor size={24} style={{ color: TEAL }} />
              <div>
                <div className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Download for Windows</div>
                <div className="text-[11px]" style={{ color: "#6b7280" }}>.exe installer</div>
              </div>
            </div>
            <DownloadIcon size={16} style={{ color: "#6b7280" }} />
          </a>
        </div>

        <p className="text-[11px] mt-6" style={{ color: "#6b7280", fontFamily: "Inter, sans-serif" }}>
          Sign in with your TradeWithAce account once installed. All releases:{" "}
          <a href="https://github.com/zentag37/discipline-coach/releases" className="underline" style={{ color: TEAL }}>
            github.com/zentag37/discipline-coach/releases
          </a>
        </p>
      </div>
    </div>
  );
}
