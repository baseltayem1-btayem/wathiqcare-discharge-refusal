"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    refusalApi,
    type CreateRefusalEventPayload,
    type SendAcknowledgmentPayload,
} from "@/lib/api/modules/refusal";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useRefusalReasonCategoriesQuery(enabled = true) {
    return useQuery({
        queryKey: queryKeys.refusal.reasonCategories,
        queryFn: () => refusalApi.listReasonCategories(),
        enabled,
    });
}

export function useRefusalEventsQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.refusal.events(caseId),
        queryFn: () => refusalApi.listRefusalEvents(caseId),
        enabled: enabled && Boolean(caseId),
    });
}

export function useAcknowledgmentRequestsQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.refusal.acknowledgments(caseId),
        queryFn: () => refusalApi.listAcknowledgmentRequests(caseId),
        enabled: enabled && Boolean(caseId),
    });
}

export function useCreateRefusalEventMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateRefusalEventPayload) => refusalApi.createRefusalEvent(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.refusal.events(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
        },
    });
}

export function useSendAcknowledgmentMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: SendAcknowledgmentPayload) => refusalApi.sendAcknowledgment(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.refusal.acknowledgments(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
        },
    });
}
