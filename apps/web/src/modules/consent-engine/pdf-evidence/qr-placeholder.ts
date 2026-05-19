/**
 * Legal Evidence PDF Pipeline — QR Placeholder
 *
 * This module does NOT generate a real QR code. It produces the
 * canonical text payload that a future QR generator will encode,
 * and a short human-readable label for the dashed QR box rendered
 * in the legal-grade HTML preview.
 */

import type { EvidenceQrPlaceholder } from "@/modules/consent-engine/pdf-evidence/evidence-types";

export interface QrPlaceholderInput {
  evidenceId: string;
  verificationUrl: string;
  auditHash: string;
}

export function buildEvidenceQrPlaceholder(
  input: QrPlaceholderInput,
): EvidenceQrPlaceholder {
  const hashShort = input.auditHash.slice(0, 16);
  return {
    payload: `WC|${input.evidenceId}|${hashShort}|${input.verificationUrl}`,
    label: `QR\nRESERVED\n${hashShort}`,
    isReal: false,
  };
}
