export type CaseActionType =
  | "OPEN_SECTION"
  | "SCROLL_TO_REQUIREMENT"
  | "OPEN_DOCUMENTS"
  | "UPLOAD_DOCUMENT"
  | "GENERATE_LEGAL_PACKAGE"
  | "GENERATE_FINAL_PDF"
  | "OPEN_CHECKLIST"
  | "OPEN_RELATED_STEP"
  | "COMPLETE_READINESS"
  | "REVIEW_REQUIREMENT"
  | "NEXT_WORKFLOW_STEP"
  | "PREVIOUS_WORKFLOW_STEP";

export type CaseActionAvailability = {
  enabled: boolean;
  reason?: string;
  actionType: "api" | "route" | "scroll" | "modal" | "blocked";
};

export type CaseStateLike = {
  caseId?: string;
  canLegalApprove?: boolean;
  canGeneratePdf?: boolean;
  canMedicalActions?: boolean;
  readinessReady?: boolean;
};

export type WorkflowStateLike = {
  status?: string | null;
  current_stage?: string | null;
  next_action?: string | null;
};

export type RequirementLike = {
  action: CaseActionType;
  sectionId?: string;
  reason?: string;
};

export type CaseActionDispatcherContext = {
  caseState: CaseStateLike;
  workflow: WorkflowStateLike | null;
  routeTo: (path: string) => void;
  scrollToSection: (sectionId: string) => void;
  openPanel: (panelKey: string) => void;
  executeWorkflowAction: (action: string) => Promise<void>;
  generateLegalPackage: () => Promise<void>;
  generateFinalPdf: () => Promise<void>;
  completeReadiness: () => Promise<void>;
  reviewRequirement: (sectionId?: string) => Promise<void>;
  onBlocked: (reason: string) => void;
};

const DEFAULT_BLOCKED_REASON = "This action is blocked because: missing required case context.";

export function getActionAvailability(
  caseState: CaseStateLike,
  workflow: WorkflowStateLike | null,
  requirement: RequirementLike,
): CaseActionAvailability {
  if (!caseState.caseId) {
    return {
      enabled: false,
      actionType: "blocked",
      reason: DEFAULT_BLOCKED_REASON,
    };
  }

  switch (requirement.action) {
    case "GENERATE_LEGAL_PACKAGE":
      if (!caseState.canLegalApprove) {
        return {
          enabled: false,
          actionType: "blocked",
          reason:
            requirement.reason ||
            "This action is blocked because: you do not have permission to generate legal packages.",
        };
      }
      return { enabled: true, actionType: "api" };

    case "GENERATE_FINAL_PDF":
      if (!caseState.canGeneratePdf) {
        return {
          enabled: false,
          actionType: "blocked",
          reason:
            requirement.reason ||
            "This action is blocked because: you do not have permission to generate final PDFs.",
        };
      }
      return { enabled: true, actionType: "api" };

    case "COMPLETE_READINESS":
      if (!caseState.canLegalApprove) {
        return {
          enabled: false,
          actionType: "blocked",
          reason:
            requirement.reason ||
            "This action is blocked because: legal approval permission is required.",
        };
      }
      return { enabled: true, actionType: "api" };

    case "NEXT_WORKFLOW_STEP":
      if (workflow?.status === "closed") {
        return {
          enabled: false,
          actionType: "blocked",
          reason: "This action is blocked because: the workflow is already closed.",
        };
      }
      return { enabled: true, actionType: "api" };

    case "PREVIOUS_WORKFLOW_STEP":
      return { enabled: true, actionType: "scroll" };

    case "UPLOAD_DOCUMENT":
    case "OPEN_DOCUMENTS":
      return { enabled: true, actionType: "route" };

    case "OPEN_SECTION":
    case "OPEN_CHECKLIST":
    case "OPEN_RELATED_STEP":
    case "REVIEW_REQUIREMENT":
    case "SCROLL_TO_REQUIREMENT":
      return { enabled: true, actionType: "scroll" };

    default:
      return {
        enabled: false,
        actionType: "blocked",
        reason: "This action is blocked because: unsupported action type.",
      };
  }
}

export function createCaseActionDispatcher(context: CaseActionDispatcherContext) {
  return async function dispatch(action: RequirementLike): Promise<void> {
    const availability = getActionAvailability(context.caseState, context.workflow, action);

    if (!availability.enabled) {
      context.onBlocked(availability.reason || DEFAULT_BLOCKED_REASON);
      return;
    }

    switch (action.action) {
      case "OPEN_SECTION":
      case "SCROLL_TO_REQUIREMENT":
      case "OPEN_CHECKLIST":
      case "OPEN_RELATED_STEP":
      case "REVIEW_REQUIREMENT": {
        if (action.sectionId) {
          context.scrollToSection(action.sectionId);
        } else {
          await context.reviewRequirement(action.sectionId);
        }
        return;
      }

      case "OPEN_DOCUMENTS":
      case "UPLOAD_DOCUMENT": {
        context.routeTo(`/documents?caseId=${encodeURIComponent(context.caseState.caseId || "")}`);
        return;
      }

      case "GENERATE_LEGAL_PACKAGE":
        await context.generateLegalPackage();
        return;

      case "GENERATE_FINAL_PDF":
        await context.generateFinalPdf();
        return;

      case "COMPLETE_READINESS":
        await context.completeReadiness();
        return;

      case "NEXT_WORKFLOW_STEP": {
        const explicitAction = context.workflow?.next_action;
        const actionKey =
          typeof explicitAction === "string" && explicitAction.trim()
            ? explicitAction
            : "mark_patient_counseled";
        await context.executeWorkflowAction(actionKey);
        return;
      }

      case "PREVIOUS_WORKFLOW_STEP":
        context.openPanel("current-next");
        return;

      default:
        context.onBlocked("This action is blocked because: unsupported dispatcher action.");
    }
  };
}
