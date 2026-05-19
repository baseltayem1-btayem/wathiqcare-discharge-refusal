import type { EvidenceAccessResolution } from "@/lib/pdf-engine/access-control/evidence-access";
import type { EvidenceLifecycleState } from "@/lib/pdf-engine/management/evidence-lifecycle";

export interface LegalOperationsDashboardModel {
  accessGranted: boolean;
  currentLifecycleState: EvidenceLifecycleState;
  requiresAction: boolean;
}

export function buildLegalOperationsDashboard(input: {
  accessEvaluation: EvidenceAccessResolution;
  lifecycleState: EvidenceLifecycleState;
}): LegalOperationsDashboardModel {
  return {
    accessGranted: input.accessEvaluation.allowed,
    currentLifecycleState: input.lifecycleState,
    requiresAction: !input.accessEvaluation.allowed || input.lifecycleState === "under-review" || input.lifecycleState === "legal-hold",
  };
}