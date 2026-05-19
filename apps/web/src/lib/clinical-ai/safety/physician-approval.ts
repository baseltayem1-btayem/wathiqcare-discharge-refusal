import type { ClinicalAiApprovalState, ClinicalAiStructuredDraft } from "@/lib/clinical-ai/types/clinical-ai-types";

export function markAiDraftPendingReview(): ClinicalAiApprovalState {
  return {
    approvedAt: null,
    approvedBy: null,
    comparedEdits: [],
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    status: "pending-physician-review",
  };
}

export function approveAiDraftByPhysician(physicianUserId: string): ClinicalAiApprovalState {
  return {
    approvedAt: new Date().toISOString(),
    approvedBy: physicianUserId,
    comparedEdits: [],
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    status: "approved",
  };
}

export function rejectAiDraftByPhysician(physicianUserId: string, reason?: string): ClinicalAiApprovalState {
  return {
    approvedAt: null,
    approvedBy: null,
    comparedEdits: [],
    rejectedAt: new Date().toISOString(),
    rejectedBy: physicianUserId,
    rejectionReason: reason || "Physician rejected AI draft.",
    status: "rejected",
  };
}

export function comparePhysicianEdits(
  original: ClinicalAiStructuredDraft,
  revised: ClinicalAiStructuredDraft,
): ClinicalAiApprovalState["comparedEdits"] {
  const entries: ClinicalAiApprovalState["comparedEdits"] = [];
  for (const key of Object.keys(original) as Array<keyof ClinicalAiStructuredDraft>) {
    const previousValue = Array.isArray(original[key]) ? original[key].join(" | ") : original[key];
    const nextValue = Array.isArray(revised[key]) ? revised[key].join(" | ") : revised[key];
    if (previousValue !== nextValue) {
      entries.push({ field: key, nextValue, previousValue });
    }
  }
  return entries;
}