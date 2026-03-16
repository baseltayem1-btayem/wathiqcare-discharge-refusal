export type CaseDocumentType = "discharge_refusal_form" | "financial_responsibility_notice";

export type CaseDocumentStatus = "draft" | "preview" | "generated" | "signed" | "archived";

export interface CaseDocument {
  id: string;
  caseId: string;
  workflowId?: string | null;
  documentType: CaseDocumentType;
  documentCode?: string | null;
  titleEn: string;
  titleAr?: string | null;
  templateKey: string;
  languageCode?: string;
  version: string;
  fileName: string;
  mimeType: string;
  storagePath?: string | null;
  previewHtml?: string | null;
  payloadJson: Record<string, unknown>;
  status: CaseDocumentStatus;
  generatedBy: string;
  generatedAt: string;
  signedBy?: string | null;
  signedAt?: string | null;
}

export interface WorkflowAuditLog {
  id: string;
  caseId: string;
  workflowId?: string | null;
  actionName: string;
  actionLabel: string;
  actionStatus: "success" | "warning" | "error";
  actorName: string;
  actorId?: string | null;
  actorRole?: string | null;
  notes?: string | null;
  documentType?: string | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt: string;
}
