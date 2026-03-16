"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { reportsApi, type ExportReportPayload } from "@/lib/api/modules/reports";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useReportsDashboardQuery(enabled = true) {
    return useQuery({
        queryKey: queryKeys.reports.dashboard,
        queryFn: () => reportsApi.dashboard(),
        enabled,
    });
}

export function useCasesSummaryQuery(enabled = true) {
    return useQuery({
        queryKey: queryKeys.reports.casesSummary,
        queryFn: () => reportsApi.casesSummary(),
        enabled,
    });
}

export function useTasksOverdueQuery(enabled = true) {
    return useQuery({
        queryKey: queryKeys.reports.tasksOverdue,
        queryFn: () => reportsApi.tasksOverdue(),
        enabled,
    });
}

export function useLegalEscalationsQuery(enabled = true) {
    return useQuery({
        queryKey: queryKeys.reports.legalEscalations,
        queryFn: () => reportsApi.legalEscalations(),
        enabled,
    });
}

export function useExportReportMutation() {
    return useMutation({
        mutationFn: (payload: ExportReportPayload) => reportsApi.exportReport(payload),
    });
}
