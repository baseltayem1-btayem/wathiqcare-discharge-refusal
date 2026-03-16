import { apiClient } from "@/lib/api/http-client";
import { PagedResult, Task, TaskComment } from "@/lib/api/types";

export type TaskFilters = {
    page?: number;
    pageSize?: number;
    status?: string;
    refusalCaseId?: string;
};

export type CompleteTaskPayload = {
    comment?: string;
};

export type ReassignTaskPayload = {
    assignedToUserId?: string;
    assignedToRoleId?: string;
    assignedToDepartmentId?: string;
    reason?: string;
};

export const tasksApi = {
    list(filters: TaskFilters = {}) {
        return apiClient.get<PagedResult<Task>>("/tasks", filters);
    },

    getById(taskId: string) {
        return apiClient.get<Task>(`/tasks/${encodeURIComponent(taskId)}`);
    },

    complete(taskId: string, payload: CompleteTaskPayload) {
        return apiClient.post<Task, CompleteTaskPayload>(
            `/tasks/${encodeURIComponent(taskId)}/complete`,
            payload,
        );
    },

    reassign(taskId: string, payload: ReassignTaskPayload) {
        return apiClient.post<Task, ReassignTaskPayload>(
            `/tasks/${encodeURIComponent(taskId)}/reassign`,
            payload,
        );
    },

    addComment(taskId: string, comment: string) {
        return apiClient.post<TaskComment, { comment: string }>(
            `/tasks/${encodeURIComponent(taskId)}/comments`,
            { comment },
        );
    },
};
