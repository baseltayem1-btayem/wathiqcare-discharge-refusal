import { enforceServerOnly } from "@/lib/server/enforce-server-only";

import { createHash } from "node:crypto";

enforceServerOnly();

export interface GenerateImmutableEvidenceSealInput {
  sha256Hash: string;
  timestamp?: string | Date;
  evidenceId: string;
  signerReference: string;
}

export interface ImmutableEvidenceSeal {
  algorithm: "SHA-256";
  evidenceId: string;
  fingerprint: string;
  sealedAt: string;
  sha256Hash: string;
  signerReference: string;
}

// This is preparatory infrastructure for future court-grade document sealing.
export function generateImmutableEvidenceSeal(
  input: GenerateImmutableEvidenceSealInput,
): ImmutableEvidenceSeal {
  const sealedAt = input.timestamp instanceof Date ? input.timestamp.toISOString() : input.timestamp || new Date().toISOString();
  const fingerprint = createHash("sha256")
    .update([input.sha256Hash, sealedAt, input.evidenceId, input.signerReference].join("|"), "utf8")
    .digest("hex");

  return {
    algorithm: "SHA-256",
    evidenceId: input.evidenceId,
    fingerprint,
    sealedAt,
    sha256Hash: input.sha256Hash,
    signerReference: input.signerReference,
  };
}