export type InformedConsentSupportedSignatureMethod =
  | "otp"
  | "tablet-drawn-signature"
  | "biometric-fingerprint"
  | "combined-tablet-and-otp"
  | "combined-biometric-and-otp";

export type InformedConsentSignerRole =
  | "PATIENT"
  | "GUARDIAN"
  | "PHYSICIAN"
  | "WITNESS"
  | "INTERPRETER";

export interface SignatureEvidenceEnvelope {
  evidenceId: string;
  evidenceHash: string;
  method: InformedConsentSupportedSignatureMethod;
  consentMethod: "ELECTRONIC_SIGNATURE" | "OTP";
  capturedAt: string;
  summary: string;
  metadata: Record<string, unknown>;
}

export interface TabletSignatureCaptureInput {
  signerRole: InformedConsentSignerRole;
  signerName: string;
  signatureDataUrl: string;
  acknowledgmentAccepted: boolean;
  otpVerified?: boolean;
  deviceLabel?: string;
  staffWitnessName?: string;
  signerIdNumber?: string;
  signerLicense?: string;
}

export interface BiometricSignatureCaptureInput {
  signerRole: InformedConsentSignerRole;
  signerName: string;
  acknowledgmentAccepted: boolean;
  verificationResult: DigitalPersonaEvidenceResult;
  otpVerified?: boolean;
  signerIdNumber?: string;
  signerLicense?: string;
  rawFingerprintImage?: unknown;
  rawFingerprintTemplate?: unknown;
  fingerprintTemplate?: unknown;
  biometricSample?: unknown;
  minutiaeData?: unknown;
}

export interface DigitalPersonaEvidenceResult {
  verified: boolean;
  deviceReference: string;
  transactionId: string;
  timestamp: string;
  verificationHash: string;
  method: "biometric-fingerprint" | "combined-biometric-and-otp";
  sdkProvider: "HID DigitalPersona";
  deviceModel: "DigitalPersona 4500";
}