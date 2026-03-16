import { apiClient } from "@/lib/api/http-client";
import { CaseDocumentsResult } from "@/lib/api/types";

export type UploadCaseDocumentPayload = {
    category: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    confidentialityLevel?: string;
    contentBase64?: string;
};

export type GenerateDocumentPayload = {
    templateId: string;
    documentType: string;
    fileName: string;
    mimeType?: string;
    metadataJson?: Record<string, unknown>;
};

export type DownloadDescriptor = {
    id: string;
    type: string;
    fileName: string;
    mimeType: string;
    downloadUrl: string;
    expiresAt: string;
};

export const documentsApi = {
    listCaseDocuments(caseId: string) {
        return apiClient.get<CaseDocumentsResult>(`/cases/${encodeURIComponent(caseId)}/documents`);
    },

    uploadCaseDocument(caseId: string, payload: UploadCaseDocumentPayload) {
        return apiClient.post<Record<string, unknown>, UploadCaseDocumentPayload>(
            `/cases/${encodeURIComponent(caseId)}/documents/upload`,
            payload,
        );
    },

    generateCaseDocument(caseId: string, payload: GenerateDocumentPayload) {
        return apiClient.post<Record<string, unknown>, GenerateDocumentPayload>(
            `/cases/${encodeURIComponent(caseId)}/documents/generate`,
            payload,
        );
    },

    getDownloadDescriptor(documentId: string) {
        return apiClient.get<DownloadDescriptor>(`/documents/${encodeURIComponent(documentId)}/download`);
    },

    deleteDocument(documentId: string) {
        return apiClient.delete<Record<string, unknown>>(`/documents/${encodeURIComponent(documentId)}`);
    },
};
