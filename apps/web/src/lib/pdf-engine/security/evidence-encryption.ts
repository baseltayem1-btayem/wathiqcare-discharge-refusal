import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface EvidenceEncryptionContext {
  evidenceId: string;
  keyFingerprint: string;
  purpose: string;
  tenantId: string;
}

export interface EncryptedEvidencePayload {
  authTag: string;
  context: EvidenceEncryptionContext;
  ciphertext: string;
  iv: string;
}

function deriveKey(context: EvidenceEncryptionContext): Buffer {
  return createHash("sha256")
    .update([context.evidenceId, context.tenantId, context.purpose].join("|"), "utf8")
    .digest();
}

export function generateEncryptionContext(input: {
  evidenceId: string;
  purpose?: string;
  tenantId: string;
}): EvidenceEncryptionContext {
  const purpose = input.purpose || "local-preview-evidence";
  const keyFingerprint = createHash("sha256")
    .update([input.evidenceId, input.tenantId, purpose].join("|"), "utf8")
    .digest("hex")
    .slice(0, 16);

  return {
    evidenceId: input.evidenceId,
    keyFingerprint,
    purpose,
    tenantId: input.tenantId,
  };
}

export function encryptEvidencePayload(payload: unknown, context: EvidenceEncryptionContext): EncryptedEvidencePayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(context), iv);
  const plaintext = JSON.stringify(payload);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return {
    authTag: cipher.getAuthTag().toString("hex"),
    context,
    ciphertext: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
  };
}

export function decryptEvidencePayload(payload: EncryptedEvidencePayload): unknown {
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(payload.context), Buffer.from(payload.iv, "hex"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "hex")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as unknown;
}