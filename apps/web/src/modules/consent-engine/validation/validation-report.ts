/**
 * Shared types and helpers for the internal validation suite.
 *
 * The validation suite is preview-only / internal-only. It performs static
 * analysis on the legal-grade HTML preview output and on deterministic
 * engine runs. No production code paths are imported or modified.
 */

export type ValidationStatus = "PASS" | "WARNING" | "FAIL" | "SKIPPED";

export interface ValidationCheck {
  id: string;
  label: string;
  status: ValidationStatus;
  detail?: string;
  evidence?: string;
}

export interface ValidationSection {
  id: string;
  label: string;
  status: ValidationStatus;
  checks: ValidationCheck[];
}

export interface ValidationReport {
  generatedAt: string;
  overallStatus: ValidationStatus;
  sections: ValidationSection[];
  notes: string[];
}

const STATUS_RANK: Record<ValidationStatus, number> = {
  PASS: 0,
  SKIPPED: 1,
  WARNING: 2,
  FAIL: 3,
};

export function worstStatus(statuses: ValidationStatus[]): ValidationStatus {
  let worst: ValidationStatus = "PASS";
  for (const s of statuses) {
    if (STATUS_RANK[s] > STATUS_RANK[worst]) worst = s;
  }
  return worst;
}

export function summarizeSection(
  id: string,
  label: string,
  checks: ValidationCheck[],
): ValidationSection {
  return {
    id,
    label,
    status: worstStatus(checks.map((c) => c.status)),
    checks,
  };
}

export function buildReport(
  sections: ValidationSection[],
  notes: string[] = [],
  generatedAt = "1970-01-01T00:00:00.000Z",
): ValidationReport {
  return {
    generatedAt,
    overallStatus: worstStatus(sections.map((s) => s.status)),
    sections,
    notes,
  };
}

/** Test for substring presence; returns PASS/FAIL with stable wording. */
export function expectSubstring(
  id: string,
  label: string,
  haystack: string,
  needle: string,
): ValidationCheck {
  return haystack.includes(needle)
    ? { id, label, status: "PASS" }
    : { id, label, status: "FAIL", detail: `expected substring not found: ${needle}` };
}

/** Test that ALL listed substrings appear; aggregates into a single check. */
export function expectAllSubstrings(
  id: string,
  label: string,
  haystack: string,
  needles: string[],
): ValidationCheck {
  const missing = needles.filter((n) => !haystack.includes(n));
  if (missing.length === 0) return { id, label, status: "PASS" };
  return {
    id,
    label,
    status: "FAIL",
    detail: `missing: ${missing.join(", ")}`,
  };
}
