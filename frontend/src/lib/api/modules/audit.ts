import { apiClient } from "@/lib/api/http-client";
import { AuditLog, PagedResult } from "@/lib/api/types";

export type AuditFilters = {
    entityType?: string;
    entityId?: string;
    page?: number;
    pageSize?: number;
};

export const auditApi = {
    listLogs(filters: AuditFilters = {}) {
        return apiClient.get<PagedResult<AuditLog>>("/audit/logs", filters);
    },
};
