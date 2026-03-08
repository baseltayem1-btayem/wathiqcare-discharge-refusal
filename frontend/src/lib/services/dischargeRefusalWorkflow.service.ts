import { apiFetch } from "@/utils/api";
import type { CaseDocument } from "@/lib/types/documents";
import type {
  DischargeRefusalWorkflow,
  WorkflowMutationResponse,
} from "@/lib/types/discharge-refusal";

export interface DischargeRefusalWorkflowService {
  getByCaseId(caseId: string): Promise<DischargeRefusalWorkflow>;
  startWorkflow(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  recordDischargeDecision(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  markRefusal(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  recordInitialCommunication(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  referSocialServices(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  generateRefusalForm(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  generateFinancialNotice(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  escalate(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
}

async function postWorkflowAction(
  caseId: string,
  endpoint: string,
  input: Record<string, unknown>
): Promise<WorkflowMutationResponse> {
  return apiFetch<WorkflowMutationResponse>(
    `/api/cases/${encodeURIComponent(caseId)}/discharge-refusal-workflow/${endpoint}`,
    {
      method: "POST",
      body: JSON.stringify({ payload: input }),
    }
  );
}

function withActorPayload(
  input: Record<string, unknown>,
  actor: Record<string, unknown>
): Record<string, unknown> {
  // Keep actor context available for future backend enrichment without changing method signatures.
  return {
    ...input,
    _actor: actor,
  };
}

class ApiDischargeRefusalWorkflowService implements DischargeRefusalWorkflowService {
  async getByCaseId(caseId: string): Promise<DischargeRefusalWorkflow> {
    return apiFetch<DischargeRefusalWorkflow>(
      `/api/cases/${encodeURIComponent(caseId)}/discharge-refusal-workflow`
    );
  }

  async startWorkflow(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "start", withActorPayload(input, actor));
  }

  async recordDischargeDecision(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "record-discharge-decision", withActorPayload(input, actor));
  }

  async markRefusal(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "mark-refusal", withActorPayload(input, actor));
  }

  async recordInitialCommunication(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "record-initial-communication", withActorPayload(input, actor));
  }

  async referSocialServices(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "refer-social-services", withActorPayload(input, actor));
  }

  async generateRefusalForm(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "generate-refusal-form", withActorPayload(input, actor));
  }

  async generateFinancialNotice(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "generate-financial-notice", withActorPayload(input, actor));
  }

  async escalate(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "escalate", withActorPayload(input, actor));
  }

  async listCaseDocuments(caseId: string): Promise<CaseDocument[]> {
    return apiFetch<CaseDocument[]>(`/api/cases/${encodeURIComponent(caseId)}/documents`);
  }

  async closeWorkflow(caseId: string, input: Record<string, unknown>): Promise<{ success: boolean; message: string; todo?: string }> {
    try {
      return await postWorkflowAction(caseId, "close", input) as unknown as { success: boolean; message: string; todo?: string };
    } catch {
      return {
        success: false,
        message: "Close workflow endpoint is not yet connected.",
        todo: "Wire backend close workflow transition.",
      };
    }
  }
}

export const dischargeRefusalWorkflowService: DischargeRefusalWorkflowService =
  new ApiDischargeRefusalWorkflowService();
