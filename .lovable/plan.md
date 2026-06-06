
# IG Account Integration

## 1. Database (migration)

Extend `profiles` with IG fields (credentials encrypted at rest via pgcrypto + a server-side `IG_ENC_KEY` secret; never returned to the client):

- `ig_api_key_enc bytea`
- `ig_username_enc bytea`
- `ig_password_enc bytea`
- `ig_account_type text` ('demo' | 'live')
- `ig_connected boolean default false`
- `ig_last_connected_at timestamptz`
- `ig_account_id text` (returned by IG on login, safe to store plain)

Add helper SQL functions `encrypt_ig(text)` / `decrypt_ig(bytea)` using `pgp_sym_encrypt` with a key read from a GUC populated by the server.

A new secret `IG_ENC_KEY` will be required.

## 2. Server layer (TanStack server functions, NOT edge functions)

Per stack rules, app-internal logic uses `createServerFn`. The user's "edge function ig-proxy" maps to a `src/lib/ig.functions.ts` module with these protected fns (require auth):

- `saveIgCredentials({ apiKey, username, password, accountType })` — encrypts via service-role admin client, sets `ig_connected=false` initially, then performs a test login. On success → `ig_connected=true`.
- `getIgStatus()` — returns `{ connected, accountType, lastConnectedAt, accountId }` only. Never credentials.
- `disconnectIg()` — clears creds + flag.
- `getIgPositions()` — calls IG `/positions`.
- `getIgAccounts()` — calls IG `/accounts`, returns balance, P&L, margin.

Internal helpers (`src/lib/ig.server.ts`):

- `igBaseUrl(type)` → demo vs live URL.
- `igLogin(creds)` → POST `/session` (v2) returning `CST` + `X-SECURITY-TOKEN`.
- Token cache: in-memory `Map<userId, { cst, xst, expiresAt }>` valid 6h. Workers are stateless across requests but a single warm isolate reuses it; on cache miss we re-login. (No DB cache to avoid leaking tokens.)
- `igFetch(userId, path)` → fetches creds via admin client + decrypt SQL, ensures token, calls IG with required headers (`X-IG-API-KEY`, `CST`, `X-SECURITY-TOKEN`, `Version`, `Accept: application/json`).

## 3. Settings UI

In `src/routes/settings.tsx`, add a "Trading Account" panel:

- Inputs: API Key, Username, Password (type=password), Demo/Live segmented toggle.
- Status pill: green "Connected to <accountId>" or gray "Disconnected".
- "Connect IG Account" button → calls `saveIgCredentials`, toasts success/failure.
- "Disconnect" button when connected.
- Inputs never pre-fill credential values; only status from `getIgStatus`.

## 4. Dashboard "Live Account" card

In `src/routes/dashboard.tsx`, new card:

- `useQuery` `getIgAccounts` + `getIgPositions`, `refetchInterval: 30_000`.
- Shows: balance, today P&L (green if ≥0 else red), open positions count, used margin.
- Empty/not-connected state links to Settings.

## 5. Daily-loss alert

Within the same card / dashboard:

- Compare `accounts.profitLoss` (today) against `profile.daily_loss_limit`.
- If `pnl <= -dailyLossLimit`: render a red banner ("Daily stop loss hit — stand down") and push a notification via existing `NotificationsBell` mechanism (dedupe per-day in local state).

## Technical notes

- IG REST: `POST /session` with `{identifier, password}` + headers `X-IG-API-KEY`, `Version: 2` → returns `CST` & `X-SECURITY-TOKEN` headers + body with `accountId`.
- `GET /positions` (Version 2), `GET /accounts` (Version 1).
- All credentialed calls run server-side only. Frontend never sees apiKey/username/password after submission.
- Validation: zod schema on inputs (api key 1–100 chars `[A-Za-z0-9]`, username 1–60, password 1–200, accountType enum).
- Errors from IG (401, 403) → `disconnectIg()` and return typed `{ error }` so UI can prompt reconnect.
- New secret needed: `IG_ENC_KEY` (random 32+ char string). I'll request it via `add_secret` after the plan is approved.

## File changes

- New migration (profiles columns + encrypt/decrypt SQL).
- New `src/lib/ig.functions.ts`, `src/lib/ig.server.ts`.
- Edit `src/routes/settings.tsx` — add panel.
- Edit `src/routes/dashboard.tsx` — add Live Account card + alert banner.
- Possibly edit `src/components/NotificationsBell.tsx` if a programmatic push API isn't already exposed (will check first).
