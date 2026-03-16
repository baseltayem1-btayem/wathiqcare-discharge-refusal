import { apiClient } from "@/lib/api/http-client";
import { AuditLog, LegalNote } from "@/lib/api/types";

export type CreateLegalNotePayload = {
    title?: string;
    content: string;
    visibilityScope: "LEGAL_ONLY" | "COMPLIANCE_ONLY" | "LEGAL_AND_COMPLIANCE";
};

export const legalApi = {
    listNotes(caseId: string) {
        return apiClient.get<LegalNote[]>(`/cases/${encodeURIComponent(caseId)}/legal-notes`);
    },

    createNote(caseId: string, payload: CreateLegalNotePayload) {
        return apiClient.post<LegalNote, CreateLegalNotePayload>(
            `/cases/${encodeURIComponent(caseId)}/legal-notes`,
            payload,
        );
    },

    caseAudit(caseId: string) {
        return apiClient.get<AuditLog[]>(`/cases/${encodeURIComponent(caseId)}/audit`);
    },
};
