import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TEAL = "#ef4444";

type Msg = { role: "user" | "assistant"; content: string };

export function AceChatDrawer({ open, onClose, firstName }: { open: boolean; onClose: () => void; firstName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/ace-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: next.slice(-10) }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            if (j.t) {
              assistant += j.t;
              setMessages((m) => {
                const copy = m.slice();
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch {/*noop*/}
        }
      }
    } catch (e: any) {
      setError(e?.message || "ACE is thinking... tap to retry");
      setMessages((m) => (m[m.length - 1]?.content === "" ? m.slice(0, -1) : m));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 z-40 bg-black/40 animate-fade-in" />}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col transition-transform duration-300"
        style={{
          width: "360px",
          maxWidth: "100vw",
          background: "#0d0f12",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Avatar />
            <div>
              <div className="text-sm" style={{ color: "#e5e7eb" }}>ACE</div>
              <div className="text-[10px] tracking-widest" style={{ color: TEAL }}>AI MENTOR</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded" style={{ color: "#9ca3af" }}>
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !streaming && (
            <div className="flex gap-2 items-start">
              <Avatar />
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "#141820", color: "#d1d5db", maxWidth: "260px" }}>
                Hey {firstName}. I'm here. What's on your mind — the market, a trade, or something else?
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 items-start ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <Avatar />}
              <div
                className="text-sm px-3 py-2 rounded-lg whitespace-pre-wrap"
                style={{
                  background: m.role === "user" ? TEAL : "#141820",
                  color: m.role === "user" ? "#0d0f12" : "#d1d5db",
                  maxWidth: "260px",
                }}
              >
                {m.content || (streaming && i === messages.length - 1 ? <TypingDots /> : "")}
              </div>
            </div>
          ))}
          {streaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 items-start"><Avatar /><div className="px-3 py-2 rounded-lg" style={{ background: "#141820" }}><TypingDots /></div></div>
          )}
          {error && (
            <button onClick={send} className="text-xs px-3 py-1.5 rounded" style={{ border: `1px solid ${TEAL}`, color: TEAL }}>
              {error} — tap to retry
            </button>
          )}
        </div>

        <div className="p-3 border-t border-white/5 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask ACE..."
            className="flex-1 px-3 py-2 rounded bg-[#141820] border border-white/5 text-sm outline-none focus:border-white/20"
            style={{ color: "#e5e7eb" }}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="px-3 rounded disabled:opacity-40"
            style={{ background: TEAL, color: "#0d0f12" }}
          >
            <Send size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}

function Avatar() {
  return (
    <div className="grid place-items-center rounded-full flex-shrink-0" style={{ width: 26, height: 26, background: "rgba(239,68,68,0.15)", color: TEAL, fontSize: 12 }}>
      A
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL }} />
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL, animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL, animationDelay: "300ms" }} />
    </span>
  );
}
