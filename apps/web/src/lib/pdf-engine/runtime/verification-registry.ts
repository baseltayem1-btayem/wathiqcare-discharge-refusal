import { buildEvidenceVerificationUrl } from "@/lib/pdf-engine/evidence/verification-token";

export interface EvidenceVerificationRegistryRecord {
  evidenceHash: string;
  evidenceId: string;
  immutableSeal: string | null;
  registeredAt: string;
  verificationUrl: string;
}

export interface RegisterEvidenceVerificationInput {
  evidenceHash: string;
  evidenceId: string;
  immutableSeal?: string | null;
}

export interface EvidenceIntegrityVerificationResult {
  evidenceId: string;
  expectedHash: string | null;
  integrityValid: boolean;
  registered: boolean;
  verificationUrl: string;
}

const verificationRegistry = new Map<string, EvidenceVerificationRegistryRecord>();

export function resolveEvidenceVerificationUrl(evidenceId: string): string {
  return buildEvidenceVerificationUrl(evidenceId, { baseUrl: "https://wathiqcare.online" });
}

export function registerEvidenceVerification(
  input: RegisterEvidenceVerificationInput,
): EvidenceVerificationRegistryRecord {
  const record: EvidenceVerificationRegistryRecord = {
    evidenceHash: input.evidenceHash,
    evidenceId: input.evidenceId,
    immutableSeal: input.immutableSeal ?? null,
    registeredAt: new Date().toISOString(),
    verificationUrl: resolveEvidenceVerificationUrl(input.evidenceId),
  };

  verificationRegistry.set(input.evidenceId, record);
  return record;
}

export function verifyEvidenceIntegrity(
  evidenceId: string,
  evidenceHash: string,
): EvidenceIntegrityVerificationResult {
  const record = verificationRegistry.get(evidenceId) || null;

  return {
    evidenceId,
    expectedHash: record?.evidenceHash || null,
    integrityValid: Boolean(record && record.evidenceHash === evidenceHash),
    registered: Boolean(record),
    verificationUrl: record?.verificationUrl || resolveEvidenceVerificationUrl(evidenceId),
  };
}