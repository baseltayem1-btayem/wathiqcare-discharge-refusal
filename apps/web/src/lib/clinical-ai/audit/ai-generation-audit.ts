import crypto from "node:crypto";

import type { ClinicalAiAuditRecord, ClinicalAiGenerationRequest, ClinicalAiProviderResponse } from "@/lib/clinical-ai/types/clinical-ai-types";
import { summarizeMinimizedConsentInput } from "@/lib/clinical-ai/safety/phi-minimization";

export function buildAiGenerationAuditRecord(input: {
  accepted: boolean | null;
  physicianEditsPlaceholder?: string;
  request: ClinicalAiGenerationRequest;
  response: ClinicalAiProviderResponse;
}): ClinicalAiAuditRecord {
  const timestamp = new Date().toISOString();
  const generationId = crypto
    .createHash("sha256")
    .update([input.request.physicianUserId, input.request.promptVersion, timestamp].join("|"), "utf8")
    .digest("hex")
    .slice(0, 24);
  const outputHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(input.response.draft), "utf8")
    .digest("hex");

  return {
    accepted: input.accepted,
    generationId,
    inputSummary: summarizeMinimizedConsentInput(input.request),
    model: input.response.model,
    outputHash,
    physicianEditsPlaceholder: input.physicianEditsPlaceholder || "Physician edits pending capture.",
    physicianUserId: input.request.physicianUserId,
    promptVersion: input.request.promptVersion,
    provider: input.response.provider,
    status: input.accepted === null ? "pending-review" : input.accepted ? "accepted" : "rejected",
    timestamp,
  };
}