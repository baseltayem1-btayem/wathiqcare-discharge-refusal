import { apiClient } from "@/lib/api/http-client";
import { PagedResult, RefusalCase, RefusalCaseTimeline } from "@/lib/api/types";

export type CaseFilters = {
    status?: string;
    department?: string;
    facility?: string;
    patient?: string;
    case_type?: string;
    escalated_to_legal?: boolean;
    overdue?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreateCasePayload = {
    caseType: "DISCHARGE_REFUSAL" | "OTHER";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    facilityId: string;
    departmentId: string;
    patientId: string;
    encounterId: string;
    summary?: string;
};

export type UpdateCasePayload = Partial<{
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    summary: string;
    escalatedToLegal: boolean;
}>;

export const casesApi = {
    list(filters: CaseFilters = {}) {
        return apiClient.get<PagedResult<RefusalCase>>("/cases", {
            ...filters,
            escalated_to_legal:
                typeof filters.escalated_to_legal === "boolean"
                    ? String(filters.escalated_to_legal)
                    : undefined,
            overdue: typeof filters.overdue === "boolean" ? String(filters.overdue) : undefined,
        });
    },

    create(payload: CreateCasePayload) {
        return apiClient.post<RefusalCase, CreateCasePayload>("/cases", payload);
    },

    getById(caseId: string) {
        return apiClient.get<RefusalCase>(`/cases/${encodeURIComponent(caseId)}`);
    },

    update(caseId: string, payload: UpdateCasePayload) {
        return apiClient.patch<RefusalCase, UpdateCasePayload>(
            `/cases/${encodeURIComponent(caseId)}`,
            payload,
        );
    },

    timeline(caseId: string) {
        return apiClient.get<RefusalCaseTimeline>(`/cases/${encodeURIComponent(caseId)}/timeline`);
    },
};
