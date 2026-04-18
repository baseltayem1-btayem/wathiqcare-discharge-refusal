import { normalizeWorkspaceRole } from "@/components/cases/workspaceGuidance";

export type CaseWorkspaceStepKey =
  | "case_creation"
  | "medical_decision"
  | "patient_decision"
  | "legal_readiness"
  | "legal_documents_bundle"
  | "closure";

export type CaseWorkspaceStepStatus = "completed" | "current" | "upcoming";

export type CaseWorkspaceStep = {
  key: CaseWorkspaceStepKey;
  label: string;
  shortLabel: string;
  description: string;
  ownerLabel: string;
  nextAction: string;
  missingItems: string[];
  includedSections: string[];
  recommendedVisibleRoles: string[];
  status: CaseWorkspaceStepStatus;
};

export type BuildCaseWorkspaceFlowInput = {
  role: string | null;
  mrn: string;
  patientName: string;
  physician: string;
  diagnosis: string;
  caseStatus: string;
  presentationRecorded: boolean;
  patientDecision: "accepted" | "refused" | null;
  patientAcknowledged: boolean;
  witnessRecorded: boolean;
  consentRecorded: boolean;
  readinessReadyForLegal: boolean;
  readinessReason?: string;
  readinessBlockers: string[];
  refusalScenario: boolean;
  financialNoticeAvailable: boolean;
  pdfLatestStatus?: "draft" | "final" | "failed" | null;
  pdfCanFinalize: boolean;
  pdfVersionCount: number;
  legalPackageGenerated: boolean;
  documentCount: number;
};

const STEP_META: Array<
  Omit<CaseWorkspaceStep, "status" | "missingItems" | "nextAction">
> = [
  {
    key: "case_creation",
    label: "Case Creation",
    shortLabel: "Create",
    description: "Confirm the case record is complete before clinical and legal actions start.",
    ownerLabel: "Case coordinator / Operations",
    includedSections: ["Case Summary", "Assignments & SLA"],
    recommendedVisibleRoles: ["Doctor", "Nursing", "Operations", "Tenant Admin", "Legal"],
  },
  {
    key: "medical_decision",
    label: "Medical Decision",
    shortLabel: "Medical",
    description: "Record the physician-led explanation and medical rationale for the discharge path.",
    ownerLabel: "Doctor",
    includedSections: ["Presentation / Proof of Notice", "Physician and diagnosis context"],
    recommendedVisibleRoles: ["Doctor", "Nursing", "Tenant Admin", "Read-only reviewers"],
  },
  {
    key: "patient_decision",
    label: "Patient Decision",
    shortLabel: "Decision",
    description: "Capture the patient response, acknowledgment, witness evidence, and consent trail.",
    ownerLabel: "Doctor with witness / operations support",
    includedSections: ["Patient Decision", "Witness", "Consent & Signatures"],
    recommendedVisibleRoles: ["Doctor", "Operations", "Witness-capable staff", "Tenant Admin", "Legal"],
  },
  {
    key: "legal_readiness",
    label: "Legal Readiness",
    shortLabel: "Readiness",
    description: "Evaluate blockers, compliance requirements, and escalation readiness before document issuance.",
    ownerLabel: "Legal Admin / Legal Officer",
    includedSections: ["Legal Readiness", "Legal Readiness Checklist", "Decision follow-up"],
    recommendedVisibleRoles: ["Legal", "Tenant Admin", "Doctor", "Read-only reviewers"],
  },
  {
    key: "legal_documents_bundle",
    label: "Legal Documents & Bundle",
    shortLabel: "Documents",
    description: "Generate the legal package, PDFs, and supporting evidence bundle.",
    ownerLabel: "Legal",
    includedSections: ["Legal Package", "Legal Case PDF Reports", "Documents"],
    recommendedVisibleRoles: ["Legal", "Authorized Signatory", "Tenant Admin", "Read-only reviewers"],
  },
  {
    key: "closure",
    label: "Closure",
    shortLabel: "Closure",
    description: "Verify final artifacts and confirm the case is ready for authorized closure.",
    ownerLabel: "Authorized Signatory",
    includedSections: ["Final closure checklist", "Latest final PDF", "Download package"],
    recommendedVisibleRoles: ["Authorized Signatory", "Legal", "Tenant Admin", "Auditor"],
  },
];

function buildMissingItems(input: BuildCaseWorkspaceFlowInput): Record<CaseWorkspaceStepKey, string[]> {
  const caseCreationMissing: string[] = [];
  if (!input.mrn || input.mrn === "N/A") {
    caseCreationMissing.push("Medical record number is missing.");
  }
  if (!input.patientName || input.patientName === "Unknown Patient") {
    caseCreationMissing.push("Patient identity is incomplete.");
  }
  if (!input.physician || input.physician === "Not assigned") {
    caseCreationMissing.push("Attending physician is not assigned.");
  }
  if (!input.diagnosis || input.diagnosis === "Discharge refusal workflow") {
    caseCreationMissing.push("Clinical diagnosis / summary still needs to be recorded.");
  }

  const medicalDecisionMissing: string[] = [];
  if (!input.presentationRecorded) {
    medicalDecisionMissing.push("Medical explanation / proof of notice is not recorded.");
  }
  if (!input.physician || input.physician === "Not assigned") {
    medicalDecisionMissing.push("Physician ownership is still unassigned.");
  }

  const patientDecisionMissing: string[] = [];
  if (!input.patientDecision) {
    patientDecisionMissing.push("Patient decision has not been recorded.");
  }
  if (!input.patientAcknowledged) {
    patientDecisionMissing.push("Patient acknowledgment / signer evidence is missing.");
  }
  if (!input.witnessRecorded) {
    patientDecisionMissing.push("Witness details are not recorded yet.");
  }
  if (!input.consentRecorded) {
    patientDecisionMissing.push("Consent evidence has not been saved.");
  }

  const legalReadinessMissing: string[] = [];
  if (!input.readinessReadyForLegal) {
    legalReadinessMissing.push(input.readinessReason || "Legal readiness requirements are still incomplete.");
  }
  for (const blocker of input.readinessBlockers) {
    if (blocker && !legalReadinessMissing.includes(blocker)) {
      legalReadinessMissing.push(blocker);
    }
  }
  if (input.refusalScenario && !input.financialNoticeAvailable) {
    legalReadinessMissing.push("Financial notice is required for the refusal path.");
  }

  const documentMissing: string[] = [];
  if (!input.pdfLatestStatus || input.pdfLatestStatus === "failed") {
    documentMissing.push("A valid legal PDF is not available yet.");
  }
  if (!input.legalPackageGenerated) {
    documentMissing.push("Legal documentation package is not generated.");
  }
  if (input.documentCount === 0) {
    documentMissing.push("No supporting documents are attached to the case yet.");
  }

  const closureMissing: string[] = [];
  if (input.pdfLatestStatus !== "final") {
    closureMissing.push("Authorized final PDF is required before closure.");
  }
  if (!input.pdfCanFinalize) {
    closureMissing.push("PDF finalization checklist still has unresolved requirements.");
  }
  if (!input.legalPackageGenerated) {
    closureMissing.push("Evidence bundle / legal package must be generated before closure.");
  }
  if (String(input.caseStatus || "").toUpperCase() !== "CLOSED") {
    closureMissing.push("Case status is still open.");
  }

  return {
    case_creation: caseCreationMissing,
    medical_decision: medicalDecisionMissing,
    patient_decision: patientDecisionMissing,
    legal_readiness: legalReadinessMissing,
    legal_documents_bundle: documentMissing,
    closure: closureMissing,
  };
}

function buildNextActions(
  input: BuildCaseWorkspaceFlowInput,
  missingItems: Record<CaseWorkspaceStepKey, string[]>,
): Record<CaseWorkspaceStepKey, string> {
  return {
    case_creation:
      missingItems.case_creation.length === 0
        ? "Move the case into Medical Decision."
        : "Complete the case record basics so the clinical workflow can start.",
    medical_decision:
      missingItems.medical_decision.length === 0
        ? "Move to Patient Decision and capture the response."
        : "Doctor should record the discharge explanation and medical rationale.",
    patient_decision:
      missingItems.patient_decision.length === 0
        ? input.patientDecision === "refused"
          ? "Send the refusal path to Legal Readiness."
          : "Advance to Legal Readiness for review and document preparation."
        : "Capture patient response, acknowledgment, witness, and consent evidence.",
    legal_readiness:
      missingItems.legal_readiness.length === 0
        ? "Generate legal documents and the evidence bundle."
        : "Resolve legal blockers before document issuance.",
    legal_documents_bundle:
      missingItems.legal_documents_bundle.length === 0
        ? "Issue the authorized final PDF and prepare the case for closure."
        : "Generate or recover the legal PDF set and the legal package.",
    closure:
      missingItems.closure.length === 0
        ? "Closure prerequisites are satisfied."
        : "Resolve final sign-off and closure blockers in order.",
  };
}

export function buildCaseExecutionWorkspaceFlow(
  input: BuildCaseWorkspaceFlowInput,
): {
  steps: CaseWorkspaceStep[];
  currentStep: CaseWorkspaceStep;
  recommendedStepKey: CaseWorkspaceStepKey;
  roleSummaryLabel: string;
} {
  const missingItems = buildMissingItems(input);
  const nextActions = buildNextActions(input, missingItems);
  const firstIncompleteStep = STEP_META.find((step) => missingItems[step.key].length > 0)?.key;
  const recommendedStepKey = firstIncompleteStep || "closure";

  let currentReached = false;
  const steps = STEP_META.map((step) => {
    let status: CaseWorkspaceStepStatus = "upcoming";

    if (missingItems[step.key].length === 0) {
      status = "completed";
    } else if (!currentReached) {
      status = "current";
      currentReached = true;
    }

    return {
      ...step,
      status,
      missingItems: missingItems[step.key],
      nextAction: nextActions[step.key],
    } satisfies CaseWorkspaceStep;
  });

  const currentStep =
    steps.find((step) => step.key === recommendedStepKey) || steps[steps.length - 1];

  const normalizedRole = normalizeWorkspaceRole(input.role);
  const roleSummaryLabel =
    normalizedRole === "doctor"
      ? "Doctor workspace"
      : normalizedRole === "legal"
        ? "Legal workspace"
        : normalizedRole === "signatory"
          ? "Authorized signatory workspace"
          : normalizedRole === "tenant_admin"
            ? "Tenant admin workspace"
            : "Case workspace";

  return {
    steps,
    currentStep,
    recommendedStepKey,
    roleSummaryLabel,
  };
}
