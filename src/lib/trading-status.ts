// Traffic-light helpers for "Trading Rules" status across the app.
export const STATUS_GREEN = "#3fb950";
export const STATUS_AMBER = "#f0a500";
export const STATUS_RED = "#f85149";

export type RuleStatus = "green" | "amber" | "red";

export function colorFor(status: RuleStatus): string {
  return status === "red" ? STATUS_RED : status === "amber" ? STATUS_AMBER : STATUS_GREEN;
}

export function tradesStatus(tradesUsed: number, maxTrades: number): RuleStatus {
  const remaining = Math.max(0, maxTrades - tradesUsed);
  if (remaining <= 0) return "red";
  if (remaining === 1) return "amber";
  return "green";
}

export function pnlStatus(sessionPL: number, dailyStop: number): RuleStatus {
  if (sessionPL >= 0) return "green";
  if (dailyStop <= 0) return "green";
  const lossPct = Math.abs(sessionPL) / dailyStop;
  if (lossPct >= 0.8) return "red";
  if (lossPct >= 0.5) return "amber";
  return "green";
}

export function checklistStatus(checkedCount: number, total: number): RuleStatus {
  if (checkedCount === total) return "green";
  if (checkedCount === 0) return "red";
  return "amber";
}

// Overall session health = worst of the inputs.
export function sessionHealth(parts: RuleStatus[]): RuleStatus {
  if (parts.includes("red")) return "red";
  if (parts.includes("amber")) return "amber";
  return "green";
}

export const HEALTH_STORAGE_KEY = "tw-ace-session-health";

export function publishHealth(status: RuleStatus) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(HEALTH_STORAGE_KEY, status);
    }
  } catch {/* noop */}
}

export function readHealth(): RuleStatus {
  try {
    if (typeof window === "undefined") return "green";
    const v = localStorage.getItem(HEALTH_STORAGE_KEY);
    if (v === "amber" || v === "red" || v === "green") return v;
  } catch {/* noop */}
  return "green";
}
