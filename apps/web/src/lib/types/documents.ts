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
<<<<<<< HEAD
    payloadJson: Record<string, unknown>;
=======
    payloadJson: Record<string, any>;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
    metadataJson: Record<string, unknown> | null;
    createdAt: string;
};
=======
    metadataJson: Record<string, any> | null;
    createdAt: string;
};
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
