import { apiClient } from "@/lib/api/http-client";
import { WorkflowTransition, WorkflowTransitionResult } from "@/lib/api/types";

export type ExecuteTransitionPayload = {
    transitionCode: string;
    comment?: string;
    reason?: string;
    hasRequiredDocument?: boolean;
};

export const workflowApi = {
    listWorkflows() {
        return apiClient.get<Array<Record<string, unknown>>>("/workflows");
    },

    availableTransitions(caseId: string) {
        return apiClient.get<WorkflowTransition[]>(`/cases/${encodeURIComponent(caseId)}/available-transitions`);
    },

    executeTransition(caseId: string, payload: ExecuteTransitionPayload) {
        return apiClient.post<WorkflowTransitionResult, ExecuteTransitionPayload>(
            `/cases/${encodeURIComponent(caseId)}/transition`,
            payload,
        );
    },
};
