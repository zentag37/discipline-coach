export type PlanTier = "solo" | "pro" | "elite";

export function normalizePlan(p?: string | null): PlanTier {
  const v = (p || "solo").toLowerCase();
  if (v === "pro" || v === "elite") return v;
  return "solo";
}

export function hasAceAccess(p?: string | null) {
  return normalizePlan(p) !== "solo";
}

export function planLabel(p?: string | null) {
  const v = normalizePlan(p);
  return v.charAt(0).toUpperCase() + v.slice(1);
}
