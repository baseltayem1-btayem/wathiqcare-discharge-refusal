import { createHash } from "node:crypto";

export type RuntimePrimitive = string | number | boolean | null;
export type RuntimeValue = RuntimePrimitive | RuntimeValue[] | { [key: string]: RuntimeValue };

export interface EvidenceSnapshotSignerData {
  signerReference: string;
  signerName?: string | null;
  signerRole?: string | null;
}

export interface EvidenceSnapshotOtpState {
  verified: boolean;
  verificationMethod?: string | null;
  deliveryReference?: string | null;
  maskedMobileNumber?: string | null;
}

export interface BuildEvidenceSnapshotInput {
  evidenceId: string;
  documentContent: RuntimeValue;
  metadata: RuntimeValue;
  evidenceHash: string;
  signerData: EvidenceSnapshotSignerData;
  otpState: EvidenceSnapshotOtpState | null;
  generatedAt?: string | Date;
  templateVersion: string;
}

export interface EvidenceSnapshot {
  evidenceId: string;
  documentContent: RuntimeValue;
  metadata: RuntimeValue;
  evidenceHash: string;
  signerData: EvidenceSnapshotSignerData;
  otpState: EvidenceSnapshotOtpState | null;
  generatedAt: string;
  templateVersion: string;
  snapshotHash: string;
  serializedSnapshot: string;
}

function normalizeRuntimeValue(value: RuntimeValue): RuntimeValue {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeRuntimeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, RuntimeValue>>((accumulator, key) => {
        accumulator[key] = normalizeRuntimeValue(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function stableSerializeRuntimeValue(value: RuntimeValue): string {
  return JSON.stringify(normalizeRuntimeValue(value));
}

export function buildEvidenceSnapshot(input: BuildEvidenceSnapshotInput): EvidenceSnapshot {
  const generatedAt =
    input.generatedAt instanceof Date ? input.generatedAt.toISOString() : input.generatedAt || new Date().toISOString();
  const normalizedDocumentContent = normalizeRuntimeValue(input.documentContent);
  const normalizedMetadata = normalizeRuntimeValue(input.metadata);
  const snapshotCore = {
    documentContent: normalizedDocumentContent,
    evidenceHash: input.evidenceHash,
    evidenceId: input.evidenceId,
    generatedAt,
    metadata: normalizedMetadata,
    otpState: input.otpState,
    signerData: input.signerData,
    templateVersion: input.templateVersion,
  } satisfies Omit<EvidenceSnapshot, "serializedSnapshot" | "snapshotHash">;
  const serializedSnapshot = stableSerializeRuntimeValue(snapshotCore as unknown as RuntimeValue);
  const snapshotHash = createHash("sha256").update(serializedSnapshot, "utf8").digest("hex");

  return {
    ...snapshotCore,
    serializedSnapshot,
    snapshotHash,
  };
}