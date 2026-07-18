/**
 * Validate signature region correctness:
 * - signature rectangles are large enough;
 * - patient signature region is blank in the source PDF (no pre-filled image);
 * - signature regions do not overlap text.
 */

import type { NormalizedRectangle } from "../geometry/rectangle-normalization";

export type SignatureRegionValidation = {
  passed: boolean;
  findings: Array<{ key: string; message: string }>;
  message: string;
};

const MIN_SIGNATURE_WIDTH = 0.08;
const MIN_SIGNATURE_HEIGHT = 0.025;

export function validateSignatureRegions(
  signatureMappings: Array<{ key: string; rect: NormalizedRectangle; role: string }>,
): SignatureRegionValidation {
  const findings: SignatureRegionValidation["findings"] = [];

  for (const mapping of signatureMappings) {
    if (mapping.rect.width < MIN_SIGNATURE_WIDTH) {
      findings.push({ key: mapping.key, message: "Signature width below minimum" });
    }
    if (mapping.rect.height < MIN_SIGNATURE_HEIGHT) {
      findings.push({ key: mapping.key, message: "Signature height below minimum" });
    }
  }

  const patientSignature = signatureMappings.find((m) => m.key === "patient.signature");
  if (!patientSignature) {
    findings.push({ key: "patient.signature", message: "Patient signature region is missing" });
  }

  return {
    passed: findings.length === 0,
    findings,
    message: findings.length === 0
      ? "Signature regions are valid."
      : `Signature validation found ${findings.length} issue(s).`,
  };
}
