import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export interface AuditTimelineEntry {
  details: string;
  kind: string;
  reference: string | null;
  timestamp: string;
  title: string;
}

export function buildAuditTimeline(input: {
  archivedEvidence?: ArchivedEvidenceRecord | null;
  forensicVerificationReference?: string | null;
  legalEvidencePackage: LegalEvidencePackage;
}): AuditTimelineEntry[] {
  const timeline: AuditTimelineEntry[] = [
    {
      details: `Evidence package created for ${input.legalEvidencePackage.metadata.sourceModule}.`,
      kind: "package-built",
      reference: input.legalEvidencePackage.auditChain.currentChainHash,
      timestamp: input.legalEvidencePackage.metadata.generatedAt,
      title: "Legal evidence package built",
    },
    {
      details: `Immutable seal ${input.legalEvidencePackage.immutableSeal.fingerprint} generated.`,
      kind: "immutable-seal",
      reference: input.legalEvidencePackage.immutableSeal.fingerprint,
      timestamp: input.legalEvidencePackage.immutableSeal.sealedAt,
      title: "Immutable evidence sealed",
    },
  ];

  if (input.archivedEvidence) {
    timeline.push({
      details: `Archived under reference ${input.archivedEvidence.archiveId}.`,
      kind: "archive",
      reference: input.archivedEvidence.archiveId,
      timestamp: input.archivedEvidence.archivedAt,
      title: "Evidence archived",
    });
  }

  if (input.forensicVerificationReference) {
    timeline.push({
      details: `Forensic verification completed with reference ${input.forensicVerificationReference}.`,
      kind: "forensic-verification",
      reference: input.forensicVerificationReference,
      timestamp: input.legalEvidencePackage.metadata.generatedAt,
      title: "Forensic verification",
    });
  }

  return timeline.sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.title.localeCompare(right.title));
}

export function serializeAuditTimeline(timeline: AuditTimelineEntry[]): string {
  return JSON.stringify(timeline);
}