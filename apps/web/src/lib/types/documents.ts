export type CaseDocument = {
    id: string;
    caseId: string;
    workflowId: string | null;
    documentType: string;
    documentCode: string | null;
    titleEn: string;
    titleAr: string | null;
    templateKey: string;
    version: string;
    fileName: string;
    mimeType: string;
    storagePath: string | null;
    previewHtml: string | null;
    payloadJson: Record<string, any>;
    status: string;
    generatedBy: string | null;
    generatedAt: string | null;
    signedBy: string | null;
    signedAt: string | null;
};

export type WorkflowAuditLog = {
    id: string;
    caseId: string;
    workflowId: string | null;
    actionName: string;
    actionLabel: string;
    actionStatus: string;
    actorName: string;
    actorId: string | null;
    actorRole: string | null;
    notes: string | null;
    documentType: string | null;
    metadataJson: Record<string, any> | null;
    createdAt: string;
};