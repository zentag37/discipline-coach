// Server-only IG broker integration helpers.
// AES-256-GCM symmetric encryption for at-rest credentials.
// Token cache lives in module scope — re-used across calls inside the same warm isolate; safe to re-login on miss.
import crypto from "node:crypto";

const DEMO_BASE = "https://demo-api.ig.com/gateway/deal";
const LIVE_BASE = "https://api.ig.com/gateway/deal";

export function igBaseUrl(accountType: string | null | undefined) {
  return accountType === "live" ? LIVE_BASE : DEMO_BASE;
}

function getKey(): Buffer {
  const raw = process.env.IG_ENC_KEY;
  if (!raw) throw new Error("IG_ENC_KEY not configured");
  // Derive a 32-byte key from whatever the user supplied.
  return crypto.createHash("sha256").update(raw).digest();
}

export function encrypt(plain: string): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]); // 12 + 16 + N
}

export function decrypt(buf: Buffer): string {
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

type Token = { cst: string; xst: string; expiresAt: number; accountId: string };
const tokenCache = new Map<string, Token>();
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;

export type IgCreds = {
  apiKey: string;
  username: string;
  password: string;
  accountType: "demo" | "live";
};

export async function igLogin(creds: IgCreds): Promise<Token> {
  const res = await fetch(`${igBaseUrl(creds.accountType)}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json; charset=UTF-8",
      "X-IG-API-KEY": creds.apiKey,
      Version: "2",
    },
    body: JSON.stringify({ identifier: creds.username, password: creds.password }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`IG login failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const cst = res.headers.get("CST") || "";
  const xst = res.headers.get("X-SECURITY-TOKEN") || "";
  if (!cst || !xst) throw new Error("IG login: missing session tokens");
  const body = (await res.json().catch(() => ({}))) as { currentAccountId?: string };
  return {
    cst,
    xst,
    expiresAt: Date.now() + TOKEN_TTL_MS,
    accountId: body.currentAccountId || "",
  };
}

export async function getToken(userId: string, creds: IgCreds): Promise<Token> {
  const cached = tokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached;
  const tok = await igLogin(creds);
  tokenCache.set(userId, tok);
  return tok;
}

export function clearToken(userId: string) {
  tokenCache.delete(userId);
}

export async function igFetch(
  userId: string,
  creds: IgCreds,
  path: string,
  version: string,
): Promise<any> {
  let tok = await getToken(userId, creds);
  const doFetch = () =>
    fetch(`${igBaseUrl(creds.accountType)}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json; charset=UTF-8",
        "X-IG-API-KEY": creds.apiKey,
        CST: tok.cst,
        "X-SECURITY-TOKEN": tok.xst,
        Version: version,
      },
    });

  let res = await doFetch();
  if (res.status === 401 || res.status === 403) {
    clearToken(userId);
    tok = await getToken(userId, creds);
    res = await doFetch();
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`IG ${path} failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  return res.json();
}
