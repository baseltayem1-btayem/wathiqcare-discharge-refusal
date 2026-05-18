import { createHash } from "crypto";
import type {
  DynamicConsentAuditSnapshot,
  DynamicConsentPayload,
  DynamicConsentSection,
  DynamicConsentTemplateDefinition,
} from "@/modules/consent-engine/engine/types";

function stableFingerprint(payload: DynamicConsentPayload, sections: DynamicConsentSection[]): string {
  const serialized = JSON.stringify({ payload, sections });
  return createHash("sha256").update(serialized).digest("hex");
}

export function buildDynamicConsentAuditSnapshot(input: {
  payload: DynamicConsentPayload;
  sections: DynamicConsentSection[];
  template: DynamicConsentTemplateDefinition;
  generatedAt: string;
}): DynamicConsentAuditSnapshot {
  const payloadFingerprint = stableFingerprint(input.payload, input.sections);

  return {
    hash: createHash("sha256")
      .update(`${input.template.id}:${input.template.version}:${payloadFingerprint}`)
      .digest("hex"),
    generatedAt: input.generatedAt,
    templateId: input.template.id,
    templateVersion: input.template.version,
    payloadFingerprint,
  };
}