import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { ACE_SYSTEM_CHAT, buildTraderContext } from "@/lib/ace.server";

const MODEL = "claude-sonnet-4-20250514";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/ace-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7);
        const url = process.env.SUPABASE_URL!;
        const pubKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return new Response("ANTHROPIC_API_KEY missing", { status: 500 });

        const sb = createClient(url, pubKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: authErr } = await sb.auth.getClaims(token);
        if (authErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        const body = (await request.json()) as { messages: Msg[] };
        const msgs = (body.messages || []).slice(-10);

        const today = new Date().toISOString().slice(0, 10);
        const [{ data: profile }, { data: trades }] = await Promise.all([
          sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
          sb.from("trades").select("*").eq("user_id", userId).eq("trade_date", today),
        ]);
        const ctx = buildTraderContext(profile, trades ?? []);
        const system = ACE_SYSTEM_CHAT(ctx.summary);

        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 400,
            stream: true,
            system,
            messages: msgs.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const txt = await upstream.text();
          return new Response(`Anthropic error: ${txt.slice(0, 200)}`, { status: 502 });
        }

        // Transform Anthropic SSE → simple text/event-stream of plain text deltas
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            let buf = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() || "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (!payload) continue;
                  try {
                    const evt = JSON.parse(payload);
                    if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: evt.delta.text })}\n\n`));
                    } else if (evt.type === "message_stop") {
                      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    }
                  } catch {
                    /* ignore */
                  }
                }
              }
            } catch (e) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});
