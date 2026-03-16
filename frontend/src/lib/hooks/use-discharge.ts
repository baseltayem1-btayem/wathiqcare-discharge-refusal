"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    dischargeApi,
    type CreateDischargeDecisionPayload,
    type CreateDischargePlanItemPayload,
    type CreateDischargePlanPayload,
    type UpdateDischargeDecisionPayload,
    type UpdateDischargePlanItemPayload,
} from "@/lib/api/modules/discharge";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useDischargeDecisionQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.discharge.decision(caseId),
        queryFn: () => dischargeApi.getDecision(caseId),
        enabled: enabled && Boolean(caseId),
        retry: false,
    });
}

export function useDischargePlanQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.discharge.plan(caseId),
        queryFn: () => dischargeApi.getPlan(caseId),
        enabled: enabled && Boolean(caseId),
        retry: false,
    });
}

export function useCreateDischargeDecisionMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateDischargeDecisionPayload) => dischargeApi.createDecision(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.discharge.decision(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
        },
    });
}

export function useUpdateDischargeDecisionMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateDischargeDecisionPayload) => dischargeApi.updateDecision(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.discharge.decision(caseId) });
        },
    });
}

export function useCreateDischargePlanMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateDischargePlanPayload) => dischargeApi.createPlan(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.discharge.plan(caseId) });
        },
    });
}

export function useCreateDischargePlanItemMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateDischargePlanItemPayload) => dischargeApi.createPlanItem(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.discharge.plan(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.discharge.planItems(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
        },
    });
}

export function useUpdateDischargePlanItemMutation(caseId: string, itemId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateDischargePlanItemPayload) =>
            dischargeApi.updatePlanItem(caseId, itemId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.discharge.plan(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.discharge.planItems(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
        },
    });
}
