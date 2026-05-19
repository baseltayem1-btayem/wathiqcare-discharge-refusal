import { ApiError } from "@/lib/server/http";
import { buildDigitalPersonaEvidenceResult, rejectRawBiometricPayload } from "@/lib/signature/digitalpersona-local-agent";
import type { BiometricSignatureCaptureInput, TabletSignatureCaptureInput } from "@/lib/signature/signature-types";

const TABLET_SIGNATURE_PREFIX = "data:image/png;base64,";
const MIN_TABLET_SIGNATURE_BYTES = 128;

function requiredTrimmed(value: string | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new ApiError(400, `${field} is required`);
  }
  return normalized;
}

export function assertPatientAcknowledgmentAccepted(acknowledgmentAccepted: boolean) {
  if (!acknowledgmentAccepted) {
    throw new ApiError(400, "Patient acknowledgment is required before signature capture");
  }
}

export function validateTabletSignatureCapture(input: TabletSignatureCaptureInput) {
  const signerName = requiredTrimmed(input.signerName, "signerName");
  const signatureDataUrl = requiredTrimmed(input.signatureDataUrl, "signatureDataUrl");
  assertPatientAcknowledgmentAccepted(input.acknowledgmentAccepted);

  if (!signatureDataUrl.startsWith(TABLET_SIGNATURE_PREFIX)) {
    throw new ApiError(400, "Tablet signature must be a PNG data URL");
  }

  const encoded = signatureDataUrl.slice(TABLET_SIGNATURE_PREFIX.length);
  let decoded: Buffer;
  try {
    decoded = Buffer.from(encoded, "base64");
  } catch {
    throw new ApiError(400, "Tablet signature payload is not valid base64");
  }

  if (decoded.byteLength < MIN_TABLET_SIGNATURE_BYTES) {
    throw new ApiError(400, "Tablet signature is empty or incomplete");
  }

  return {
    ...input,
    signerName,
    signatureDataUrl,
    deviceLabel: input.deviceLabel?.trim() || null,
    staffWitnessName: input.staffWitnessName?.trim() || null,
    signerIdNumber: input.signerIdNumber?.trim() || null,
    signerLicense: input.signerLicense?.trim() || null,
  };
}

export function validateBiometricSignatureCapture(input: BiometricSignatureCaptureInput) {
  const signerName = requiredTrimmed(input.signerName, "signerName");
  assertPatientAcknowledgmentAccepted(input.acknowledgmentAccepted);

  try {
    rejectRawBiometricPayload(input as unknown as Record<string, unknown>);
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : "Raw biometric payload is not allowed");
  }

  const verificationResult = buildDigitalPersonaEvidenceResult(input.verificationResult);

  if (!verificationResult.verified) {
    throw new ApiError(400, "Biometric verification must be completed before signature capture");
  }

  if (verificationResult.sdkProvider !== "HID DigitalPersona") {
    throw new ApiError(400, "Biometric verification must come from HID DigitalPersona local agent");
  }

  if (verificationResult.deviceModel !== "DigitalPersona 4500") {
    throw new ApiError(400, "Only DigitalPersona 4500 local agent results are supported");
  }

  return {
    ...input,
    signerName,
    verificationResult,
    signerIdNumber: input.signerIdNumber?.trim() || null,
    signerLicense: input.signerLicense?.trim() || null,
  };
}