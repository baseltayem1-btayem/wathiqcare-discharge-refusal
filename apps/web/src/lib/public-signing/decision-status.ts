export type PublicDecisionStatus = "UNDECIDED" | "CONSENT_ACCEPTED" | "CONSENT_REFUSED";

const ACCEPTED_ALIASES = new Set([
  "CONSENT_ACCEPTED",
  "ACCEPTED",
  "APPROVED",
  "CONSENT_APPROVED",
  "DECISION_ACCEPTED",
]);

const REFUSED_ALIASES = new Set([
  "CONSENT_REFUSED",
  "REFUSED",
  "DECLINED",
  "REJECTED",
  "CONSENT_DECLINED",
  "DECISION_REFUSED",
]);

export function normalizePublicDecisionStatus(value: unknown): PublicDecisionStatus {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (ACCEPTED_ALIASES.has(normalized)) {
    return "CONSENT_ACCEPTED";
  }
  if (REFUSED_ALIASES.has(normalized)) {
    return "CONSENT_REFUSED";
  }
  return "UNDECIDED";
}

export function isPublicDecisionAcceptedLike(value: unknown): boolean {
  return normalizePublicDecisionStatus(value) === "CONSENT_ACCEPTED";
}

export function isPublicDecisionRefusedLike(value: unknown): boolean {
  return normalizePublicDecisionStatus(value) === "CONSENT_REFUSED";
}
