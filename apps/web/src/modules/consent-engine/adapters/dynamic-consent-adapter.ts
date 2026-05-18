import type {
  DynamicConsentBuildResult,
  DynamicConsentPayload,
  DynamicConsentTemplateDefinition,
} from "@/modules/consent-engine/engine/types";
import { isDynamicConsentEngineEnabled } from "@/modules/consent-engine/engine/feature-gates";
import { buildExperimentalDynamicConsent } from "@/modules/consent-engine/service";

export interface DynamicConsentAdapter {
  isEnabled(): boolean;
  build(template: DynamicConsentTemplateDefinition, payload: DynamicConsentPayload): DynamicConsentBuildResult;
}

export class ExperimentalDynamicConsentAdapter implements DynamicConsentAdapter {
  isEnabled(): boolean {
    return isDynamicConsentEngineEnabled();
  }

  build(template: DynamicConsentTemplateDefinition, payload: DynamicConsentPayload): DynamicConsentBuildResult {
    return buildExperimentalDynamicConsent(payload, template);
  }
}

export const DynamicConsentAdapter = new ExperimentalDynamicConsentAdapter();