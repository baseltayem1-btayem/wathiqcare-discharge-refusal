"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    casesApi,
    type CaseFilters,
    type CreateCasePayload,
    type UpdateCasePayload,
} from "@/lib/api/modules/cases";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useCasesQuery(filters: CaseFilters, enabled = true) {
    return useQuery({
        queryKey: queryKeys.cases.list(filters),
        queryFn: () => casesApi.list(filters),
        enabled,
    });
}

export function useCaseQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.cases.detail(caseId),
        queryFn: () => casesApi.getById(caseId),
        enabled: enabled && Boolean(caseId),
    });
}

export function useCaseTimelineQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.cases.timeline(caseId),
        queryFn: () => casesApi.timeline(caseId),
        enabled: enabled && Boolean(caseId),
    });
}

export function useCreateCaseMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateCasePayload) => casesApi.create(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.all });
            void queryClient.invalidateQueries({ queryKey: queryKeys.reports.dashboard });
        },
    });
}

export function useUpdateCaseMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateCasePayload) => casesApi.update(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.all });
        },
    });
}
