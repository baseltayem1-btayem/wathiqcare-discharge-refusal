/**
 * Deterministic PDF filename helper for the internal preview pipeline.
 *
 * Mirrors the suggested-filename shape from the evidence module but ends
 * in `.pdf` to signal a real binary. Pure / deterministic.
 */

import type { EvidencePackage } from "../pdf-evidence/evidence-types";

function sanitizeSegment(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function buildDeterministicPdfFilename(ev: EvidencePackage): string {
  const parts = [
    "wathiqcare-consent-preview",
    sanitizeSegment(ev.templateId),
    `v${sanitizeSegment(ev.templateVersion)}`,
    sanitizeSegment(ev.patientMrn || "no-mrn"),
    sanitizeSegment(ev.caseNumber || "no-case"),
    sanitizeSegment(ev.evidenceId),
  ];
  return `${parts.join("__")}.pdf`;
}
