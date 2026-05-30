import { Volume2 } from "lucide-react";

const TEAL = "#00d4a0";

export function VoiceConsentModal({
  onEnable,
  onDecline,
}: {
  onEnable: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-[14px] p-7 animate-fade-in"
        style={{
          background: "#141820",
          border: "1px solid rgba(255,255,255,0.08)",
          fontFamily: "'IBM Plex Mono', monospace",
          color: "#e6e8eb",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(0,212,160,0.15)", color: TEAL }}
        >
          <Volume2 size={22} />
        </div>
        <h2
          className="text-lg mb-2"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          ACE wants to speak to you
        </h2>
        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: "#9ca3af", fontFamily: "Inter, sans-serif" }}
        >
          Enable voice so ACE can coach you out loud during your sessions —
          warnings, encouragement, and market updates. You can turn this off
          anytime in settings.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onEnable}
            className="px-4 py-2.5 text-sm rounded font-medium"
            style={{ background: TEAL, color: "#0d0f12" }}
          >
            Yes, enable voice
          </button>
          <button
            onClick={onDecline}
            className="px-4 py-2.5 text-sm rounded"
            style={{ color: "#9ca3af" }}
          >
            Keep it silent
          </button>
        </div>
      </div>
    </div>
  );
}
