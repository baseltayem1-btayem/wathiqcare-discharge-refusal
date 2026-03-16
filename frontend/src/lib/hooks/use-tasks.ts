"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    tasksApi,
    type CompleteTaskPayload,
    type ReassignTaskPayload,
    type TaskFilters,
} from "@/lib/api/modules/tasks";
import type { PagedResult, Task } from "@/lib/api/types";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useTasksQuery(filters: TaskFilters, enabled = true) {
    return useQuery({
        queryKey: queryKeys.tasks.list(filters),
        queryFn: () => tasksApi.list(filters),
        enabled,
    });
}

type CompleteTaskMutationInput = CompleteTaskPayload & {
    taskId: string;
};

export function useCompleteTaskMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CompleteTaskMutationInput) =>
            tasksApi.complete(payload.taskId, { comment: payload.comment }),
        onMutate: async (payload) => {
            await queryClient.cancelQueries({ queryKey: ["tasks", "list"] });
            const snapshot = queryClient.getQueriesData<PagedResult<Task>>({ queryKey: ["tasks", "list"] });

            queryClient.setQueriesData<PagedResult<Task>>({ queryKey: ["tasks", "list"] }, (current) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    items: current.items.map((task) =>
                        task.id === payload.taskId
                            ? {
                                ...task,
                                status: "COMPLETED",
                                completedAt: new Date().toISOString(),
                            }
                            : task,
                    ),
                };
            });

            return { snapshot };
        },
        onError: (_error, _payload, context) => {
            if (context?.snapshot) {
                for (const [key, value] of context.snapshot) {
                    queryClient.setQueryData(key, value);
                }
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["tasks", "list"] });
            void queryClient.invalidateQueries({ queryKey: queryKeys.reports.tasksOverdue });
        },
    });
}

export function useReassignTaskMutation(taskId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ReassignTaskPayload) => tasksApi.reassign(taskId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["tasks", "list"] });
        },
    });
}
