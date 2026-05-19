/**
 * Legal Evidence PDF Pipeline — Preview Adapter
 *
 * Composes a legal-grade HTML render with a deterministic evidence
 * package. Returns a print-ready preview object only — NO real PDF
 * binary is produced at this stage and no document is persisted.
 */

import type {
  LegalEvidencePdfPreviewInput,
  LegalEvidencePdfPreviewOutput,
} from "@/modules/consent-engine/pdf-evidence/evidence-types";
import { buildEvidencePackage } from "@/modules/consent-engine/pdf-evidence/evidence-package";

function sanitizeFilenameSegment(value: string): string {
  return (value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function buildSuggestedFilename(parts: {
  templateId: string;
  templateVersion: string;
  patientMrn: string;
  caseNumber: string;
  evidenceId: string;
}): string {
  const segments = [
    "wathiqcare-consent-preview",
    sanitizeFilenameSegment(parts.templateId),
    `v${sanitizeFilenameSegment(parts.templateVersion)}`,
    sanitizeFilenameSegment(parts.patientMrn) || "no-mrn",
    sanitizeFilenameSegment(parts.caseNumber) || "no-case",
    sanitizeFilenameSegment(parts.evidenceId),
  ].filter(Boolean);
  return `${segments.join("__")}.html`;
}

export function buildLegalEvidencePdfPreview(
  input: LegalEvidencePdfPreviewInput,
): LegalEvidencePdfPreviewOutput {
  const evidencePackage = buildEvidencePackage({
    evidenceId: input.evidenceId ?? null,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    templateHash: input.templateHash,
    payloadHash: input.payloadHash,
    auditHash: input.auditHash,
    patientMrn: input.patientMrn,
    encounterNo: input.encounterNo,
    caseNumber: input.caseNumber,
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
  });

  const suggestedFilename = buildSuggestedFilename({
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    patientMrn: input.patientMrn,
    caseNumber: input.caseNumber,
    evidenceId: evidencePackage.evidenceId,
  });

  return {
    html: input.html,
    evidencePackage,
    suggestedFilename,
    contentType: "text/html-preview",
  };
}
