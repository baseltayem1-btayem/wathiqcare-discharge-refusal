import type { PdfEvidenceQrResult } from "@/lib/pdf-engine/core/pdf-types";
import { buildEvidenceVerificationUrl } from "@/lib/pdf-engine/evidence/verification-token";

export interface BuildEvidenceQrInput {
  evidenceId: string;
  baseUrl?: string;
  verificationUrl?: string;
}

export function buildEvidenceQrPayload(input: BuildEvidenceQrInput): string {
  return input.verificationUrl || buildEvidenceVerificationUrl(input.evidenceId, { baseUrl: input.baseUrl });
}

export async function buildEvidenceQrData(input: BuildEvidenceQrInput): Promise<PdfEvidenceQrResult> {
  const verificationUrl = buildEvidenceQrPayload(input);

  try {
    const QRCode = await import("qrcode");
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
    });

    return {
      verificationUrl,
      qrPayload: verificationUrl,
      qrDataUrl,
    };
  } catch {
    return {
      verificationUrl,
      qrPayload: verificationUrl,
      qrDataUrl: null,
    };
  }
}