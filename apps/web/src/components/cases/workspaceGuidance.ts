export type WorkspaceRole = "doctor" | "legal" | "signatory" | "tenant_admin" | "other";

export type WorkspaceSectionId =
  | "overview"
  | "medical_decision"
  | "legal_escalation"
  | "documents_pdf"
  | "evidence_bundle"
  | "final_closure";

export type WorkspaceSectionGuidance = {
  id: WorkspaceSectionId;
  title: string;
  ownerRole: string;
  status: "completed" | "in_progress" | "blocked";
  missingItems: string[];
  nextAction: string;
  blockedReason: string | null;
};

export type WorkspaceGuidanceInput = {
  role: string | null;
  canMedicalActions: boolean;
  canLegalApprove: boolean;
  canGeneratePdf: boolean;
  canGenerateBundle: boolean;
  readinessReadyForLegal: boolean;
  readinessReason?: string;
  presentationRecorded: boolean;
  patientDecision: "accepted" | "refused" | null;
  patientAcknowledged: boolean;
  refusalScenario: boolean;
  financialNoticeAvailable: boolean;
  latestPdfStatus?: "draft" | "final" | "failed" | null;
  legalPackageGenerated: boolean;
};

export function normalizeWorkspaceRole(role: string | null): WorkspaceRole {
  const normalized = (role || "").trim().toLowerCase();

  if (!normalized) {
    return "other";
  }

  if (normalized === "doctor" || normalized === "er_doctor" || normalized === "emergency_doctor" || normalized === "physician") {
    return "doctor";
  }

  if (normalized === "legal_admin" || normalized === "legal" || normalized === "legal_officer" || normalized === "lawyer") {
    return "legal";
  }

  if (normalized === "signatory" || normalized === "authorized_signatory") {
    return "signatory";
  }

  if (normalized === "tenant_admin" || normalized === "tenant_owner") {
    return "tenant_admin";
  }

  return "other";
}

export function buildWorkspaceGuidance(input: WorkspaceGuidanceInput): WorkspaceSectionGuidance[] {
  const actorRole = normalizeWorkspaceRole(input.role);
  const decisionIsAccepted = input.patientDecision === "accepted";
  const decisionIsRefused = input.patientDecision === "refused";

  const overviewMissing = [] as string[];
  if (!input.presentationRecorded) {
    overviewMissing.push("Medical explanation is not recorded yet.");
  }
  if (!input.patientDecision) {
    overviewMissing.push("Patient decision (accepted/refused) is not recorded yet.");
  }
  if (!input.patientAcknowledged) {
    overviewMissing.push("Patient acknowledgment (accept/refuse) is not captured.");
  }

  const medicalMissing = [] as string[];
  if (!input.presentationRecorded) {
    medicalMissing.push("Doctor has not recorded the discharge explanation.");
  }
  if (!input.patientDecision) {
    medicalMissing.push("Doctor must record patient decision (accepted/refused).");
  }
  if (!input.patientAcknowledged) {
    medicalMissing.push("Patient acknowledgment is required after medical decision.");
  }

  const legalMissing = [] as string[];
  if (!input.patientDecision) {
    legalMissing.push("Patient decision is not recorded yet.");
  }
  if (!input.readinessReadyForLegal) {
    legalMissing.push(input.readinessReason || "Case is not legally ready yet.");
  }
  if ((decisionIsRefused || input.refusalScenario) && !input.financialNoticeAvailable) {
    legalMissing.push("Finance notification is required for refusal scenarios.");
  }

  const docsMissing = [] as string[];
  if (!input.canGeneratePdf) {
    docsMissing.push("Your role cannot generate legal PDF documents.");
  }
  if (!input.latestPdfStatus || input.latestPdfStatus === "failed") {
    docsMissing.push("A valid discharge PDF is not available.");
  }

  const bundleMissing = [] as string[];
  if (!input.legalPackageGenerated) {
    bundleMissing.push("Legal documentation package is not generated.");
  }
  if (!input.canGenerateBundle) {
    bundleMissing.push("Evidence bundle generation is available to Legal only.");
  }

  const closureMissing = [] as string[];
  if (!input.patientAcknowledged) {
    closureMissing.push("Patient acknowledgment is pending.");
  }
  if (input.latestPdfStatus !== "final") {
    closureMissing.push("Final signed PDF must be available before closure.");
  }
  if (!input.canLegalApprove) {
    closureMissing.push("Case closure is restricted to authorized signatory.");
  }

  return [
    {
      id: "overview",
      title: "Case Overview",
      ownerRole: "Care Team",
      status: overviewMissing.length === 0 ? "completed" : "in_progress",
      missingItems: overviewMissing,
      nextAction: overviewMissing.length === 0 ? "Proceed to Medical Decision." : "Complete missing overview checkpoints.",
      blockedReason: null,
    },
    {
      id: "medical_decision",
      title: "Medical Decision",
      ownerRole: "Doctor",
      status: medicalMissing.length === 0 ? "completed" : input.canMedicalActions ? "in_progress" : "blocked",
      missingItems: medicalMissing,
      nextAction:
        medicalMissing.length === 0
          ? decisionIsAccepted
            ? "Proceed to legal documentation and closure readiness checks."
            : "Escalate refusal path to Legal workflow."
          : "Doctor must complete decision and acknowledgment evidence.",
      blockedReason: input.canMedicalActions ? null : "Awaiting Doctor action.",
    },
    {
      id: "legal_escalation",
      title: "Legal Escalation",
      ownerRole: "Legal Admin / Legal Officer",
      status: legalMissing.length === 0 ? "completed" : input.canLegalApprove ? "in_progress" : "blocked",
      missingItems: legalMissing,
      nextAction:
        legalMissing.length === 0
          ? decisionIsAccepted
            ? "Proceed with final legal documentation and authorized closure preparation."
            : "Proceed with refusal risk handling, legal documentation, and PDF issuance."
          : decisionIsRefused
            ? "Legal team should review refusal blockers and coordinate with medical and finance teams."
            : "Legal team should review blockers and coordinate with medical team.",
      blockedReason: input.canLegalApprove ? null : "Legal owns escalation and documentation.",
    },
    {
      id: "documents_pdf",
      title: "Documents / PDF",
      ownerRole: "Legal",
      status: docsMissing.length === 0 ? "completed" : input.canGeneratePdf ? "in_progress" : "blocked",
      missingItems: docsMissing,
      nextAction:
        docsMissing.length === 0
          ? "Validate final PDF for closure eligibility."
          : "Generate or recover legal PDF artifacts.",
      blockedReason: input.canGeneratePdf ? null : "Legal documentation is available to Legal roles.",
    },
    {
      id: "evidence_bundle",
      title: "Evidence Bundle",
      ownerRole: "Legal",
      status: bundleMissing.length === 0 ? "completed" : input.canGenerateBundle ? "in_progress" : "blocked",
      missingItems: bundleMissing,
      nextAction:
        bundleMissing.length === 0
          ? "Bundle is ready for compliance and legal handoff."
          : "Generate evidence bundle from legal documents.",
      blockedReason: input.canGenerateBundle ? null : "Bundle generation is available to Legal only.",
    },
    {
      id: "final_closure",
      title: "Final Closure",
      ownerRole: "Authorized Signatory",
      status: closureMissing.length === 0 ? "completed" : input.canLegalApprove ? "in_progress" : "blocked",
      missingItems: closureMissing,
      nextAction:
        closureMissing.length === 0
          ? "Authorized signatory may close the case."
          : "Resolve closure blockers in sequence.",
      blockedReason:
        closureMissing.length === 0
          ? null
          : actorRole === "signatory" || actorRole === "tenant_admin" || input.canLegalApprove
            ? null
            : "Case closure is restricted to authorized signatory.",
    },
  ];
}
