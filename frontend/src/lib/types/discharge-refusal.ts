import type { CaseDocument, WorkflowAuditLog } from "@/lib/types/documents";

export type DischargeRefusalStage =
  | "medical_discharge_decision"
  | "initial_communication"
  | "support_and_intervention"
  | "refusal_form"
  | "official_notification"
  | "escalation"
  | "closed";

export type DischargeRefusalStatus =
  | "draft"
  | "active"
  | "pending_notification"
  | "escalation_required"
  | "escalated"
  | "closed";

export type InsuranceCoverageStatus =
  | "covered"
  | "partially_covered"
  | "uncovered"
  | "unknown";

export interface DischargeRefusalWorkflow {
  id: string;
  caseId: string;
  workflowType: "discharge_refusal";
  status: DischargeRefusalStatus;
  currentStage: DischargeRefusalStage;

  patientName: string;
  legalRepresentativeName?: string | null;
  patientIdNumber: string;
  patientIdType?: string | null;
  medicalRecordNumber: string;
  roomNumber: string;

  attendingPhysicianName: string;
  attendingPhysicianId?: string | null;
  caseManagerName?: string | null;

  dischargeDecisionAt?: string | null;
  refusalStartedAt?: string | null;
  initialCommunicationAt?: string | null;
  supportInterventionAt?: string | null;
  socialServicesReferredAt?: string | null;
  refusalFormGeneratedAt?: string | null;
  financialNoticeGeneratedAt?: string | null;
  escalationDueAt?: string | null;
  escalatedAt?: string | null;
  closedAt?: string | null;

  dischargeDecisionSummary?: string | null;
  discussionSummary?: string | null;
  refusalReason?: string | null;
  supportProvided?: string | null;
  insuranceCoverageStatus?: InsuranceCoverageStatus | null;
  guarantorName?: string | null;

  refusalPersists: boolean;
  escalationRequired: boolean;
  escalatedToLegal: boolean;
  escalatedToCompliance: boolean;

  patientAcknowledged: boolean;
  patientSignedAt?: string | null;

  witness1Name?: string | null;
  witness1Title?: string | null;
  witness1SignedAt?: string | null;
  witness2Name?: string | null;
  witness2Title?: string | null;
  witness2SignedAt?: string | null;

  patientAffairsContacted: boolean;
  socialServicesContacted: boolean;
  legalSensitiveCase: boolean;

  documents: CaseDocument[];
  auditTrail: WorkflowAuditLog[];

  createdBy: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowMutationResponse {
  workflow: DischargeRefusalWorkflow;
  generatedDocument?: CaseDocument | null;
}
