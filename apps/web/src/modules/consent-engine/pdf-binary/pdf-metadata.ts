/**
 * Deterministic PDF document metadata builder for the internal preview pipeline.
 *
 * All fields are derived from the evidence package — no random values, no
 * uncontrolled timestamps. Re-running with the same evidence package yields
 * identical metadata.
 */

import type { EvidencePackage } from "../pdf-evidence/evidence-types";
import type { PdfBinaryDeterministicMetadata } from "./pdf-binary-types";

export function buildDeterministicPdfMetadata(
  ev: EvidencePackage,
): PdfBinaryDeterministicMetadata {
  return {
    title: `WathiqCare Consent Preview — ${ev.templateId} v${ev.templateVersion}`,
    author: ev.generatedBy || "wathiqcare-internal-preview",
    subject: `Evidence ${ev.evidenceId} (case ${ev.caseNumber || "n/a"}, encounter ${ev.encounterNo || "n/a"})`,
    keywords: [
      "wathiqcare",
      "internal-preview",
      "dynamic-consent",
      "legal-grade",
      "evidence",
      ev.evidenceId,
      ev.templateId,
      `v${ev.templateVersion}`,
    ].join(", "),
    creator: "wathiqcare-pdf-binary-preview",
    producer: "puppeteer-core+sparticuz-chromium (internal preview)",
  };
}
