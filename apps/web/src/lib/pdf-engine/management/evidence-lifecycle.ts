import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export type EvidenceLifecycleState =
  | "generated"
  | "verified"
  | "signed"
  | "sealed"
  | "archived"
  | "under-review"
  | "legal-hold"
  | "expired"
  | "judicial-exported";

export function buildEvidenceLifecycleTrail(input: {
  archivedEvidence?: ArchivedEvidenceRecord | null;
  expired?: boolean;
  judicialExported?: boolean;
  legalEvidencePackage: LegalEvidencePackage;
  legalHoldState?: boolean;
  underReview?: boolean;
}): EvidenceLifecycleState[] {
  const trail: EvidenceLifecycleState[] = ["generated"];

  if (input.legalEvidencePackage.otpEvidence.verificationStatus === "verified") {
    trail.push("verified");
  }
  if (input.legalEvidencePackage.signerDetails.signerReference) {
    trail.push("signed");
  }
  if (input.legalEvidencePackage.immutableSeal.fingerprint) {
    trail.push("sealed");
  }
  if (input.archivedEvidence) {
    trail.push("archived");
  }
  if (input.underReview) {
    trail.push("under-review");
  }
  if (input.legalHoldState) {
    trail.push("legal-hold");
  }
  if (input.expired) {
    trail.push("expired");
  }
  if (input.judicialExported) {
    trail.push("judicial-exported");
  }

  return trail;
}

export function resolveEvidenceLifecycleState(input: {
  archivedEvidence?: ArchivedEvidenceRecord | null;
  expired?: boolean;
  judicialExported?: boolean;
  legalEvidencePackage: LegalEvidencePackage;
  legalHoldState?: boolean;
  underReview?: boolean;
}): EvidenceLifecycleState {
  const trail = buildEvidenceLifecycleTrail(input);
  return trail[trail.length - 1];
}