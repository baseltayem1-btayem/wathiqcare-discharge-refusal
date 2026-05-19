/**
 * Phase 12 — Evidence panel data model.
 *
 * These types describe the SHAPES that evidence cards render. They are
 * intentionally optional/loose so the panel can be populated
 * incrementally from existing sources (SignatureState, audit tables,
 * pdf-engine manifests) without forcing schema or API contracts to
 * change.
 *
 * No runtime export here — types only. Wired in Phase 12.5.
 */

export type EvidenceSignerSummary = {
  role: "patient" | "guardian" | "physician" | "witness" | "interpreter";
  displayName: string;
  signedAt?: string;
  method?:
    | "otp"
    | "tablet-drawn-signature"
    | "biometric-fingerprint"
    | "combined-tablet-and-otp"
    | "combined-biometric-and-otp";
  acknowledged?: boolean;
  signatureHash?: string;
  deviceLabel?: string;
};

export type EvidenceOtpAttempt = {
  id: string;
  timestamp: string;
  channel: "sms" | "email" | "voice";
  destinationMasked: string;
  status: "sent" | "delivered" | "verified" | "expired" | "failed";
  failureReason?: string;
  ip?: string;
};

export type EvidenceAuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
  severity?: "info" | "warn" | "error";
};

export type EvidenceQrPayload = {
  verificationUrl: string;
  documentHash?: string;
  shortCode?: string;
};

export type EvidenceForensicMetadata = {
  capturedAt?: string;
  ip?: string;
  userAgent?: string;
  geo?: { latitude?: number; longitude?: number; accuracyM?: number };
  signatureManifestHash?: string;
  pdfBinaryHash?: string;
  evidenceBundleId?: string;
  legalSealReference?: string;
};

export type EvidencePanelData = {
  signers?: EvidenceSignerSummary[];
  otp?: EvidenceOtpAttempt[];
  audit?: EvidenceAuditEvent[];
  qr?: EvidenceQrPayload;
  forensic?: EvidenceForensicMetadata;
};
