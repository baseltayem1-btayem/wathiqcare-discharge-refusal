import { buildEvidenceVerificationUrl } from "@/lib/pdf-engine/evidence/verification-token";

export interface QrVerificationPayload {
  evidenceId: string;
  verificationToken: string | null;
  verificationUrl: string;
}

export function generateQrVerificationPayload(input: {
  evidenceId: string;
  verificationToken?: string | null;
}): QrVerificationPayload {
  return {
    evidenceId: input.evidenceId,
    verificationToken: input.verificationToken ?? null,
    verificationUrl: buildEvidenceVerificationUrl(input.evidenceId, { baseUrl: "https://wathiqcare.online" }),
  };
}

export function resolveQrVerification(payload: string | QrVerificationPayload): QrVerificationPayload {
  if (typeof payload !== "string") {
    return payload;
  }

  if (payload.startsWith("https://")) {
    const evidenceId = payload.split("/").at(-1) || "";
    return {
      evidenceId,
      verificationToken: null,
      verificationUrl: payload,
    };
  }

  return JSON.parse(payload) as QrVerificationPayload;
}

export function validateQrVerification(
  payload: string | QrVerificationPayload,
  expectedEvidenceId: string,
): boolean {
  const resolved = resolveQrVerification(payload);
  return resolved.evidenceId === expectedEvidenceId && resolved.verificationUrl.endsWith(`/${encodeURIComponent(expectedEvidenceId)}`);
}