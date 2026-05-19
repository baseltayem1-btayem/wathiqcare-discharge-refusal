import type { PdfEvidenceHashOptions, PdfEvidenceRecord } from "@/lib/pdf-engine/core/pdf-types";
import { generateEvidenceHash, stableEvidenceJsonStringify } from "@/lib/pdf-engine/evidence/evidence-hash";

export function stableJsonStringify(value: unknown, options: PdfEvidenceHashOptions = {}): string {
  return stableEvidenceJsonStringify(value, options);
}

export function buildPdfEvidenceHash(
  value: PdfEvidenceRecord | Record<string, unknown>,
  options: PdfEvidenceHashOptions = {},
): string {
  return generateEvidenceHash(value, options);
}