"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workflowApi, type ExecuteTransitionPayload } from "@/lib/api/modules/workflow";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useAvailableTransitionsQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.workflow.transitions(caseId),
        queryFn: () => workflowApi.availableTransitions(caseId),
        enabled: enabled && Boolean(caseId),
    });
}

export function useExecuteTransitionMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ExecuteTransitionPayload) => workflowApi.executeTransition(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.workflow.transitions(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
            void queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}
