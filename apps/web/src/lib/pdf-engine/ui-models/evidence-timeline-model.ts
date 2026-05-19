import type { AuditTimelineEntry } from "@/lib/pdf-engine/audit/audit-timeline";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export interface EvidenceTimelineEvent {
  completed: boolean;
  eventType: string;
  reference: string | null;
  timestamp: string;
  title: string;
}

export interface EvidenceTimelineModel {
  evidenceId: string;
  events: EvidenceTimelineEvent[];
}

export function buildEvidenceTimelineModel(input: {
  auditTimeline: AuditTimelineEntry[];
  legalEvidencePackage: LegalEvidencePackage;
}): EvidenceTimelineModel {
  const generatedAt = input.legalEvidencePackage.metadata.generatedAt;
  const otpVerified = input.legalEvidencePackage.otpEvidence.verificationStatus === "verified";
  const baseEvents: EvidenceTimelineEvent[] = [
    { completed: true, eventType: "created", reference: input.legalEvidencePackage.evidenceId, timestamp: generatedAt, title: "Created" },
    { completed: true, eventType: "generated", reference: input.legalEvidencePackage.metadata.auditId, timestamp: generatedAt, title: "Generated" },
    { completed: true, eventType: "otp-sent", reference: input.legalEvidencePackage.otpEvidence.deliveryReference, timestamp: input.legalEvidencePackage.otpEvidence.deliveryTimestamp || generatedAt, title: "OTP sent" },
    { completed: otpVerified, eventType: "otp-verified", reference: input.legalEvidencePackage.otpEvidence.deliveryReference, timestamp: input.legalEvidencePackage.otpEvidence.verificationTimestamp || generatedAt, title: "OTP verified" },
    { completed: true, eventType: "signed", reference: input.legalEvidencePackage.signerDetails.signerReference, timestamp: generatedAt, title: "Signed" },
    { completed: true, eventType: "sealed", reference: input.legalEvidencePackage.immutableSeal.fingerprint, timestamp: input.legalEvidencePackage.immutableSeal.sealedAt, title: "Sealed" },
  ];

  const mappedAuditEvents = input.auditTimeline.map((entry) => ({
    completed: true,
    eventType: entry.kind,
    reference: entry.reference,
    timestamp: entry.timestamp,
    title: entry.title,
  }));

  const archivedPresent = mappedAuditEvents.some((event) => event.eventType === "archive");
  const verifiedPresent = mappedAuditEvents.some((event) => event.eventType === "forensic-verification");

  if (!archivedPresent) {
    mappedAuditEvents.push({
      completed: false,
      eventType: "archived",
      reference: null,
      timestamp: generatedAt,
      title: "Archived",
    });
  }
  if (!verifiedPresent) {
    mappedAuditEvents.push({
      completed: false,
      eventType: "verified",
      reference: null,
      timestamp: generatedAt,
      title: "Verified",
    });
  }

  return {
    evidenceId: input.legalEvidencePackage.evidenceId,
    events: [...baseEvents, ...mappedAuditEvents].sort(
      (left, right) => left.timestamp.localeCompare(right.timestamp) || left.title.localeCompare(right.title),
    ),
  };
}