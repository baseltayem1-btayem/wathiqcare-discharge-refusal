function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export type ConsentSignaturePresentation = {
  deviceReference: string | null;
  evidenceHash: string | null;
  evidenceId: string | null;
  method: string;
  signatureImageDataUrl: string | null;
  signedAt: string | null;
  signerName: string;
  summary: string | null;
  transactionId: string | null;
};

export function resolveConsentSignaturePresentation(input: {
  metadata: unknown;
  signatureMethod?: string | null;
  signedAt?: Date | string | null;
  signerName: string;
}): ConsentSignaturePresentation {
  const metadata = asRecord(input.metadata) || {};
  const signatureEvidence = asRecord(metadata.signatureEvidence) || {};
  const signatureCapture = asRecord(metadata.signatureCapture) || {};

  return {
    signerName: input.signerName,
    signedAt: input.signedAt instanceof Date
      ? input.signedAt.toISOString()
      : (typeof input.signedAt === "string" ? input.signedAt : null),
    method: String(signatureEvidence.method || input.signatureMethod || "ELECTRONIC_SIGNATURE"),
    evidenceId: typeof signatureEvidence.evidenceId === "string" ? signatureEvidence.evidenceId : null,
    evidenceHash: typeof signatureEvidence.evidenceHash === "string" ? signatureEvidence.evidenceHash : null,
    summary: typeof signatureEvidence.summary === "string" ? signatureEvidence.summary : null,
    signatureImageDataUrl: typeof signatureCapture.signatureImageDataUrl === "string" ? signatureCapture.signatureImageDataUrl : null,
    deviceReference: typeof signatureCapture.deviceReference === "string" ? signatureCapture.deviceReference : null,
    transactionId: typeof signatureCapture.transactionId === "string" ? signatureCapture.transactionId : null,
  };
}