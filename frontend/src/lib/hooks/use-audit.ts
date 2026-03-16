"use client";

import { useQuery } from "@tanstack/react-query";

import { auditApi, type AuditFilters } from "@/lib/api/modules/audit";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useAuditLogsQuery(filters: AuditFilters, enabled = true) {
    return useQuery({
        queryKey: queryKeys.audit.logs(filters),
        queryFn: () => auditApi.listLogs(filters),
        enabled,
    });
}
