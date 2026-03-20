import { apiFetch } from "@/utils/api";

export type RefusalQualityMetrics = {
  total_refusal_cases: number;
  active_refusal_cases: number;
  cases_escalated_after_24_hours: number;
  average_resolution_time_hours: number;
  refusal_reasons_distribution: Record<string, number>;
  cases_by_department: Record<string, number>;
  monthly_review_reports: Record<string, number>;
  quarterly_reports: Record<string, number>;
};

export type WorkflowActionResult = {
  workflow: Record<string, unknown>;
  generatedDocument?: Record<string, unknown> | null;
};

export async function fetchRefusalCases(limit = 200) {
  return apiFetch<Array<Record<string, unknown>>>(
    `/api/discharge/cases?limit=${encodeURIComponent(String(limit))}`,
  );
}

export async function fetchRefusalCaseWorkflow(caseId: string) {
  return apiFetch<Record<string, unknown>>(`/api/discharge/cases/${encodeURIComponent(caseId)}/workflow`);
}

export async function postRefusalWorkflowAction(
  caseId: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<WorkflowActionResult> {
  return apiFetch<WorkflowActionResult>(`/api/discharge/cases/${encodeURIComponent(caseId)}/workflow/actions`, {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

export async function fetchRefusalQualityMetrics(): Promise<RefusalQualityMetrics> {
  return apiFetch<RefusalQualityMetrics>("/api/discharge/reports/refusal-quality");
}

export async function fetchMedicalFormsLibrary() {
  return apiFetch<{ library: string; templates: Array<Record<string, unknown>> }>(
    "/api/discharge/forms-library/medical-legal/templates",
  );
}
