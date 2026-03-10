export type LegalEscalationStatus = 
  | "active" 
  | "under-review" 
  | "resolved" 
  | "high-risk";

export type LegalEscalationPriority = "low" | "medium" | "high" | "critical";

export type LegalEscalationNote = {
  id: string;
  caseId: string;
  note: string;
  author: string;
  authorRole?: string;
  createdAt: string;
};

export type LegalEscalationCase = {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  status: LegalEscalationStatus;
  priority: LegalEscalationPriority;
  escalatedAt: string;
  assignedCounsel?: string | null;
  reason: string;
  riskLevel?: string | null;
  followUpDate?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  notes: LegalEscalationNote[];
  auditTrail?: Array<{
    action: string;
    details?: string;
    timestamp: string;
    actor?: string;
  }>;
};
