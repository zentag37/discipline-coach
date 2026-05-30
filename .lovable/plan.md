# ACE AI — 4 functions + UI wiring

## Architecture decision
Build as TanStack **server functions** (`createServerFn` + `requireSupabaseAuth`), not Supabase Edge Functions. This is the correct pattern for this stack. All 4 read `process.env.ANTHROPIC_API_KEY` server-side, never exposed to client.

Model: `claude-sonnet-4-20250514` via `https://api.anthropic.com/v1/messages`.

Plan gating: **skipped** — no `plan` column on `profiles`. Add later if needed.

## Files to create

### `src/lib/ace.server.ts` — shared helpers
- `callClaude({ system, user, maxTokens })` — POST to Anthropic API, returns text
- `callClaudeStream({ system, messages, maxTokens })` — streaming variant for chat
- `buildUserContext(profile, todayTrades)` — formats trader context string

### `src/lib/ace.functions.ts` — 3 non-streaming server fns
1. **`aceMessage`** — GET, maxTokens 150. Loads profile + today's trades, returns plain text coaching message.
2. **`aceJournal`** — POST `{ tradeId }`, maxTokens 300. Loads trade row, calls Claude, parses JSON `{journal_entry, ace_note}`, updates `trades` row, returns parsed result.
3. **`aceWeeklyReview`** — POST, maxTokens 500. Aggregates current-week trades, calls Claude, parses JSON 4 sections, inserts into `journal_reviews`, returns row.

### `src/routes/api/ace-chat.ts` — streaming server route
Server route (not serverFn) because streaming. Verifies bearer token manually via `supabaseAdmin.auth.getUser(token)`. Loads profile, takes last 10 messages from body, streams Anthropic SSE through to client. maxTokens 400.

## UI wiring

### `src/routes/dashboard.tsx`
- On mount + every 30min: call `aceMessage`, show teal pulse while loading, render text. Retry button on error.
- "Next tip →" button: re-call `aceMessage`.
- "Ask ACE something" button: opens new `<AceChatDrawer>` (360px, slides from right, fixed positioned, doesn't replace page).
- In `TradeLogModal` after successful insert: fire `aceJournal({ tradeId })`, show "ACE is writing your journal..." spinner; on success, toast.

### `src/routes/journal.tsx`
- "Generate weekly review" button → calls `aceWeeklyReview`, renders 4 sections (`what_went_well`, `what_needs_work`, `focus_next_week`, `encouragement`) with teal mono labels above each.
- Show existing latest review for current week if present (read from `journal_reviews`).

### `src/components/ace/AceChatDrawer.tsx`
- Fixed right drawer, 360px, slide-in animation
- Empty state: "Hey {first_name}. I'm here. What's on your mind — the market, a trade, or something else?"
- Message list: ACE left (teal A avatar), user right (teal bubble)
- Input + send. Streams from `/api/ace-chat` via fetch + ReadableStream, parses SSE, appends tokens.
- Typing dots before first token. Keeps last 10 messages in local state, sends whole history each call.

## Verification
After build: invoke `aceMessage` via `stack_modern--invoke-server-function` to confirm Anthropic key works and response shape is sane.
