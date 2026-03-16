import { apiClient } from "@/lib/api/http-client";
import { AcknowledgmentRequest, RefusalEvent, RefusalReasonCategory } from "@/lib/api/types";

export type CreateRefusalEventPayload = {
    refusalDate: string;
    refusalTime: string;
    refusingPersonName: string;
    refusingPersonRelationship: string;
    representativeId?: string;
    reasonCategoryId: string;
    detailedReason?: string;
    consequencesExplained: boolean;
    explanationProvidedByUserId?: string;
    immediateEscalationRequired: boolean;
    riskIndicator?: string;
    notes?: string;
};

export type SendAcknowledgmentPayload = {
    recipientType: "PATIENT" | "REPRESENTATIVE";
    patientId?: string;
    representativeId?: string;
    recipientName: string;
    relationshipToPatient?: string;
    deliveryMethod: "SMS" | "EMAIL" | "WHATSAPP" | "IN_PERSON";
    expiresAt?: string;
};

export const refusalApi = {
    listReasonCategories() {
        return apiClient.get<RefusalReasonCategory[]>("/refusal-reason-categories");
    },

    createRefusalEvent(caseId: string, payload: CreateRefusalEventPayload) {
        return apiClient.post<RefusalEvent, CreateRefusalEventPayload>(
            `/cases/${encodeURIComponent(caseId)}/refusal-events`,
            payload,
        );
    },

    listRefusalEvents(caseId: string) {
        return apiClient.get<RefusalEvent[]>(`/cases/${encodeURIComponent(caseId)}/refusal-events`);
    },

    sendAcknowledgment(caseId: string, payload: SendAcknowledgmentPayload) {
        return apiClient.post<AcknowledgmentRequest, SendAcknowledgmentPayload>(
            `/cases/${encodeURIComponent(caseId)}/acknowledgment/send`,
            payload,
        );
    },

    listAcknowledgmentRequests(caseId: string) {
        return apiClient.get<AcknowledgmentRequest[]>(
            `/cases/${encodeURIComponent(caseId)}/acknowledgment-requests`,
        );
    },
};
