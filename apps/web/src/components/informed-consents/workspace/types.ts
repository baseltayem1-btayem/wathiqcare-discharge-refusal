import type { AuthContext } from "@/lib/server/auth";

export type StepStatus = "completed" | "active" | "pending";

export interface WorkflowStep {
  id: number;
  title: string;
  status: StepStatus;
}

export interface PatientEncounter {
  name: string;
  mrn: string;
  encounterId: string;
  mobileNumber?: string | null;
  email?: string | null;
}

export interface ProcedurePackage {
  id: string;
  name: string;
  category: string;
  version: string;
  versionId: string;
  riskLevel: string;
  languageSet: string;
  grade: string;
  illustrated: boolean;
  duration: string;
  sections: number;
  keyBenefits: number;
  risks: number;
  alternatives: number;
  lastUpdated: string;
  status: "ready_for_review" | string;
}

export interface ReadinessCheck {
  label: string;
  done: boolean;
}

export interface ConsentReadiness {
  percentage: number;
  completed: number;
  total: number;
  checks: ReadinessCheck[];
}

export interface TimelineEvent {
  label: string;
  time: string;
  done: boolean;
}

export interface AuditEvidenceItem {
  iconName: string;
  title: string;
  description: string;
}

export interface AuditEvidence {
  tamperEvident: boolean;
  items: AuditEvidenceItem[];
}

export interface SendEligibility {
  canSend: boolean;
  reason?: string;
  dryRunPassed: boolean;
  contactAvailable: boolean;
  versionResolved: boolean;
  auditSessionActive: boolean;
}

export interface WorkspaceData {
  auth: AuthContext;
  encounterId: string;
  procedureId: string;
  patient: PatientEncounter;
  procedure: ProcedurePackage;
  readiness: ConsentReadiness;
  timeline: TimelineEvent[];
  audit: AuditEvidence;
  workflowSteps: WorkflowStep[];
  sendEligibility: SendEligibility;
}

export interface ConsentSendResponse {
  ok: boolean;
  dryRun?: boolean;
  message?: string;
  workflow?: {
    sessionId: string;
    documentId: string;
    signingUrl: string;
    recipientMobile: string;
    recipientEmail?: string;
    smsDeliveryStatus: "sent" | "failed";
    emailDeliveryStatus?: "sent" | "failed";
  };
  error?: string;
}

export interface TimelineApiEvent {
  id: string;
  type: string;
  actor: string;
  actorName: string;
  timestamp: string;
  status: string;
  summaryEn: string;
  summaryAr?: string;
}

export interface ConsentMetrics {
  packagesGenerated: number;
  consentsSent: number;
  consentsCompleted: number;
  pendingReview: number;
}
