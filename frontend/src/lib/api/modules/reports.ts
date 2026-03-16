import { apiClient } from "@/lib/api/http-client";
import { ReportsDashboard } from "@/lib/api/types";

export type ExportReportPayload = {
    reportType: string;
    filtersJson?: Record<string, unknown>;
};

export const reportsApi = {
    dashboard() {
        return apiClient.get<ReportsDashboard>("/reports/dashboard");
    },

    casesSummary() {
        return apiClient.get<Array<Record<string, unknown>>>("/reports/cases-summary");
    },

    tasksOverdue() {
        return apiClient.get<Array<Record<string, unknown>>>("/reports/tasks-overdue");
    },

    legalEscalations() {
        return apiClient.get<Array<Record<string, unknown>>>("/reports/legal-escalations");
    },

    exportReport(payload: ExportReportPayload) {
        return apiClient.post<Record<string, unknown>, ExportReportPayload>("/reports/export", payload);
    },
};
