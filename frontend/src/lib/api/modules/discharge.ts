import { apiClient } from "@/lib/api/http-client";
import {
    DischargeDecision,
    DischargePlan,
    DischargePlanBundle,
    DischargePlanItem,
} from "@/lib/api/types";

export type CreateDischargeDecisionPayload = {
    decisionStatus: string;
    dischargeMedicallyAppropriate: boolean;
    decisionDate: string;
    decisionTime: string;
    clinicalRemarks?: string;
};

export type UpdateDischargeDecisionPayload = Partial<CreateDischargeDecisionPayload>;

export type CreateDischargePlanPayload = {
    destination: string;
    instructionsProvided: boolean;
    notes?: string;
};

export type CreateDischargePlanItemPayload = {
    dischargePlanId: string;
    itemType: string;
    status?: string;
    required?: boolean;
    notes?: string;
    dueAt?: string;
};

export type UpdateDischargePlanItemPayload = {
    status?: string;
    notes?: string;
    completedAt?: string;
};

export const dischargeApi = {
    getPlan(caseId: string) {
        return apiClient.get<DischargePlanBundle>(`/cases/${encodeURIComponent(caseId)}/discharge-plan`);
    },

    getDecision(caseId: string) {
        return apiClient.get<DischargeDecision | null>(`/cases/${encodeURIComponent(caseId)}/discharge-decision`);
    },

    createDecision(caseId: string, payload: CreateDischargeDecisionPayload) {
        return apiClient.post<DischargeDecision, CreateDischargeDecisionPayload>(
            `/cases/${encodeURIComponent(caseId)}/discharge-decision`,
            payload,
        );
    },

    updateDecision(caseId: string, payload: UpdateDischargeDecisionPayload) {
        return apiClient.patch<DischargeDecision, UpdateDischargeDecisionPayload>(
            `/cases/${encodeURIComponent(caseId)}/discharge-decision`,
            payload,
        );
    },

    createPlan(caseId: string, payload: CreateDischargePlanPayload) {
        return apiClient.post<DischargePlan, CreateDischargePlanPayload>(
            `/cases/${encodeURIComponent(caseId)}/discharge-plan`,
            payload,
        );
    },

    createPlanItem(caseId: string, payload: CreateDischargePlanItemPayload) {
        return apiClient.post<DischargePlanItem, CreateDischargePlanItemPayload>(
            `/cases/${encodeURIComponent(caseId)}/discharge-plan/items`,
            payload,
        );
    },

    updatePlanItem(caseId: string, itemId: string, payload: UpdateDischargePlanItemPayload) {
        return apiClient.patch<DischargePlanItem, UpdateDischargePlanItemPayload>(
            `/cases/${encodeURIComponent(caseId)}/discharge-plan/items/${encodeURIComponent(itemId)}`,
            payload,
        );
    },
};
