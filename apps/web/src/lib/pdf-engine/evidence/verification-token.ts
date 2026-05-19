import { enforceServerOnly } from "@/lib/server/enforce-server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { PdfEvidenceVerificationOptions } from "@/lib/pdf-engine/core/pdf-types";

enforceServerOnly();

const DEFAULT_VERIFY_BASE_URL = "https://wathiqcare.online";

function resolveVerificationSecret(): string {
  return (
    process.env.WATHIQCARE_PDF_VERIFY_SECRET?.trim() ||
    process.env.JWT_SECRET_KEY?.trim() ||
    "wathiqcare-pdf-preview-secret"
  );
}

export interface VerificationTokenPayload {
  evidenceId: string;
  documentHash: string;
  auditId?: string | null;
}

export function buildEvidenceVerificationUrl(
  evidenceId: string,
  options: PdfEvidenceVerificationOptions = {},
): string {
  const baseUrl = (options.baseUrl || DEFAULT_VERIFY_BASE_URL).replace(/\/$/, "");
  return `${baseUrl}/verify/${encodeURIComponent(evidenceId)}`;
}

export function buildDeterministicVerificationToken(payload: VerificationTokenPayload): string {
  const input = [payload.evidenceId, payload.documentHash, payload.auditId || ""].join("|");
  return createHmac("sha256", resolveVerificationSecret()).update(input, "utf8").digest("hex");
}

export function verifyDeterministicVerificationToken(
  payload: VerificationTokenPayload,
  token: string,
): boolean {
  const expected = buildDeterministicVerificationToken(payload);
  const tokenBuffer = Buffer.from(token, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}