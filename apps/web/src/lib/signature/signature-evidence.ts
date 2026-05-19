import crypto from "node:crypto";
import type {
  BiometricSignatureCaptureInput,
  InformedConsentSupportedSignatureMethod,
  SignatureEvidenceEnvelope,
  TabletSignatureCaptureInput,
} from "@/lib/signature/signature-types";
import { validateBiometricSignatureCapture, validateTabletSignatureCapture } from "@/lib/signature/signature-validation";

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildEvidenceId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function buildEvidenceEnvelope(args: {
  capturedAt?: string;
  consentMethod: "ELECTRONIC_SIGNATURE" | "OTP";
  metadata: Record<string, unknown>;
  method: InformedConsentSupportedSignatureMethod;
  prefix: string;
  summary: string;
}): SignatureEvidenceEnvelope {
  const capturedAt = args.capturedAt || new Date().toISOString();
  const metadata = {
    ...args.metadata,
    capturedAt,
    consentMethod: args.consentMethod,
    method: args.method,
  };

  return {
    evidenceId: buildEvidenceId(args.prefix),
    evidenceHash: sha256(metadata),
    method: args.method,
    consentMethod: args.consentMethod,
    capturedAt,
    summary: args.summary,
    metadata,
  };
}

export function buildTabletSignatureEvidence(input: TabletSignatureCaptureInput): SignatureEvidenceEnvelope {
  const validated = validateTabletSignatureCapture(input);
  const method: InformedConsentSupportedSignatureMethod = validated.otpVerified
    ? "combined-tablet-and-otp"
    : "tablet-drawn-signature";

  return buildEvidenceEnvelope({
    consentMethod: validated.otpVerified ? "OTP" : "ELECTRONIC_SIGNATURE",
    method,
    prefix: "sig-tbl",
    summary: `Tablet signature captured for ${validated.signerRole.toLowerCase()}`,
    metadata: {
      signerRole: validated.signerRole,
      signerName: validated.signerName,
      acknowledgmentAccepted: true,
      otpVerified: validated.otpVerified === true,
      deviceLabel: validated.deviceLabel,
      staffWitnessName: validated.staffWitnessName,
      signerIdNumber: validated.signerIdNumber,
      signerLicense: validated.signerLicense,
      imageHash: sha256(validated.signatureDataUrl),
      signatureImageDataUrl: validated.signatureDataUrl,
    },
  });
}

export function buildBiometricSignatureEvidence(input: BiometricSignatureCaptureInput): SignatureEvidenceEnvelope {
  const validated = validateBiometricSignatureCapture(input);
  const method: InformedConsentSupportedSignatureMethod = validated.otpVerified
    ? "combined-biometric-and-otp"
    : "biometric-fingerprint";
  const verificationResult = {
    ...validated.verificationResult,
    method,
  };

  return buildEvidenceEnvelope({
    consentMethod: validated.otpVerified ? "OTP" : "ELECTRONIC_SIGNATURE",
    method,
    prefix: "sig-bio",
    summary: `Biometric verification recorded for ${validated.signerRole.toLowerCase()}`,
    metadata: {
      signerRole: validated.signerRole,
      signerName: validated.signerName,
      acknowledgmentAccepted: true,
      otpVerified: validated.otpVerified === true,
      verificationPassed: true,
      deviceReference: verificationResult.deviceReference,
      transactionId: verificationResult.transactionId,
      verificationHash: verificationResult.verificationHash,
      verificationTimestamp: verificationResult.timestamp,
      sdkProvider: verificationResult.sdkProvider,
      deviceModel: verificationResult.deviceModel,
      signerIdNumber: validated.signerIdNumber,
      signerLicense: validated.signerLicense,
      biometricEvidenceType: "verification-only",
    },
  });
}

export function buildConsentSignaturePersistencePayload(evidence: SignatureEvidenceEnvelope) {
  return {
    signatureMethod: evidence.consentMethod,
    metadata: {
      signatureEvidence: {
        evidenceId: evidence.evidenceId,
        evidenceHash: evidence.evidenceHash,
        method: evidence.method,
        summary: evidence.summary,
        capturedAt: evidence.capturedAt,
      },
      signatureCapture: evidence.metadata,
    },
  };
}

export function buildSignatureEvidenceSummary(metadata: unknown): Array<{ label: string; value: string }> {
  const source = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  const signatureEvidence = source.signatureEvidence && typeof source.signatureEvidence === "object"
    ? (source.signatureEvidence as Record<string, unknown>)
    : {};
  const signatureCapture = source.signatureCapture && typeof source.signatureCapture === "object"
    ? (source.signatureCapture as Record<string, unknown>)
    : {};

  const rows = [
    { label: "Method", value: String(signatureEvidence.method || "-") },
    { label: "Evidence ID", value: String(signatureEvidence.evidenceId || "-") },
    { label: "Evidence Hash", value: String(signatureEvidence.evidenceHash || "-") },
    { label: "Captured At", value: String(signatureEvidence.capturedAt || "-") },
  ];

  if (signatureCapture.transactionId) {
    rows.push({ label: "Transaction ID", value: String(signatureCapture.transactionId) });
  }
  if (signatureCapture.deviceReference) {
    rows.push({ label: "Device Reference", value: String(signatureCapture.deviceReference) });
  }
  if (signatureCapture.verificationHash) {
    rows.push({ label: "Verification Hash", value: String(signatureCapture.verificationHash) });
  }
  if (signatureCapture.sdkProvider) {
    rows.push({ label: "SDK Provider", value: String(signatureCapture.sdkProvider) });
  }
  if (signatureCapture.deviceModel) {
    rows.push({ label: "Device Model", value: String(signatureCapture.deviceModel) });
  }

  return rows;
}