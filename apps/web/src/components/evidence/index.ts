/**
 * Phase 12 — Evidence panel barrel.
 * Additive placeholder architecture. Not yet wired into production
 * consent or signing routes; see PHASE_12_ENTERPRISE_UX_PLAN.md.
 */
export { default as EvidencePanel } from "./EvidencePanel";
export type { EvidencePanelProps } from "./EvidencePanel";

export { default as SignerEvidenceCard } from "./SignerEvidenceCard";
export { default as OtpLogCard } from "./OtpLogCard";
export { default as AuditTrailCard } from "./AuditTrailCard";
export { default as QrVerificationCard } from "./QrVerificationCard";
export { default as ForensicMetadataCard } from "./ForensicMetadataCard";

export type {
  EvidencePanelData,
  EvidenceSignerSummary,
  EvidenceOtpAttempt,
  EvidenceAuditEvent,
  EvidenceQrPayload,
  EvidenceForensicMetadata,
} from "./types";
