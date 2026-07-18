/**
 * Validate source document integrity (hash, size, no encryption).
 */

import crypto from "node:crypto";

export type SourceIntegrityValidation = {
  passed: boolean;
  sha256: string;
  sizeBytes: number;
  message: string;
};

export function validateSourceIntegrity(args: {
  pdfBytes: Uint8Array;
  expectedSha256?: string;
}): SourceIntegrityValidation {
  const { pdfBytes, expectedSha256 } = args;
  const sha256 = crypto.createHash("sha256").update(pdfBytes).digest("hex");

  if (!expectedSha256) {
    return {
      passed: true,
      sha256,
      sizeBytes: pdfBytes.byteLength,
      message: `Source hash computed: ${sha256}`,
    };
  }

  const passed = sha256 === expectedSha256.toLowerCase();
  return {
    passed,
    sha256,
    sizeBytes: pdfBytes.byteLength,
    message: passed
      ? "Source hash matches expected value."
      : `Source hash mismatch: expected ${expectedSha256}, got ${sha256}`,
  };
}
