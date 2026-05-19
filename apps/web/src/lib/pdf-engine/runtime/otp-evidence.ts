export interface BuildOtpEvidenceRecordInput {
  verified: boolean;
  deliveryTimestamp?: string | Date | null;
  verificationTimestamp?: string | Date | null;
  maskedMobileNumber?: string | null;
  deliveryProvider?: string | null;
  deliveryReference?: string | null;
  verificationMethod?: string | null;
}

export interface OtpEvidenceRecord {
  deliveryProvider: string | null;
  deliveryReference: string | null;
  deliveryTimestamp: string | null;
  maskedMobileNumber: string | null;
  verificationMethod: string | null;
  verificationStatus: "verified" | "pending";
  verificationTimestamp: string | null;
}

function normalizeTimestamp(value?: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

export function buildOtpEvidenceRecord(
  input: BuildOtpEvidenceRecordInput,
): OtpEvidenceRecord {
  return {
    deliveryProvider: input.deliveryProvider ?? null,
    deliveryReference: input.deliveryReference ?? null,
    deliveryTimestamp: normalizeTimestamp(input.deliveryTimestamp),
    maskedMobileNumber: input.maskedMobileNumber ?? null,
    verificationMethod: input.verificationMethod ?? null,
    verificationStatus: input.verified ? "verified" : "pending",
    verificationTimestamp: normalizeTimestamp(input.verificationTimestamp),
  };
}