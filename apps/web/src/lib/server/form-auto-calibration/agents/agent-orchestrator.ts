/**
 * Guarded agent orchestrator.
 *
 * Wraps LLM calls in deterministic guardrails. It is always allowed to fail
 * gracefully: if the agent returns bad output, the engine falls back to the
 * deterministic mapping.
 */

import type { ConsentOntologyField } from "../ontology/consent-field-ontology";
import type { ExtractedDocumentLayout } from "../extraction/document-layout-types";
import type { CalibrationQualityReport } from "../mapping/mapping-schema";
import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";
import type { LLMProvider } from "./llm-provider";
import { buildLabelMatchPrompt, buildQualityReviewPrompt } from "./prompts";
import { safeJsonParse, validateAgentMatches, validateAgentReview } from "./guardrails";

export type AgentOrchestratorConfig = {
  provider: LLMProvider;
  enabled: boolean;
  maxRetries?: number;
};

export type AgentMatch = {
  ontologyKey: string;
  fieldName: string;
  reason: string;
  confidence: number;
};

export type AgentReviewItem = {
  ontologyKey: string;
  severity: "error" | "warning" | "info";
  message: string;
};

export class AgentOrchestrator {
  constructor(private config: AgentOrchestratorConfig) {}

  async proposeMatches(params: {
    ontology: { fields: ConsentOntologyField[]; layoutFamilyHint: string };
    extractedFields: Array<{
      name: string;
      label?: string;
      page: number;
      rect: { x: number; y: number; width: number; height: number };
    }>;
    unmappedKeys: string[];
  }): Promise<AgentMatch[]> {
    if (!this.config.enabled || params.unmappedKeys.length === 0) return [];

    const allowedFieldNames = new Set(params.extractedFields.map((f) => f.name));
    const allowedOntologyKeys = new Set(params.ontology.fields.map((f) => f.key));

    for (let attempt = 0; attempt < (this.config.maxRetries ?? 2); attempt++) {
      try {
        const response = await this.config.provider.complete([
          { role: "user", content: buildLabelMatchPrompt(params) },
        ]);
        const parsed = safeJsonParse<unknown>(response.text);
        if (!parsed.ok) continue;
        const validated = validateAgentMatches(parsed.data, allowedFieldNames, allowedOntologyKeys);
        if (validated.ok && validated.data) return validated.data;
      } catch {
        // Ignore and retry / fall back.
      }
    }

    return [];
  }

  async reviewMapping(params: {
    ontology: { fields: ConsentOntologyField[]; layoutFamilyHint: string };
    mappings: CandidateFieldMapping[];
    qualityReport: CalibrationQualityReport;
  }): Promise<AgentReviewItem[]> {
    if (!this.config.enabled) return [];

    for (let attempt = 0; attempt < (this.config.maxRetries ?? 2); attempt++) {
      try {
        const response = await this.config.provider.complete([
          { role: "user", content: buildQualityReviewPrompt(params) },
        ]);
        const parsed = safeJsonParse<unknown>(response.text);
        if (!parsed.ok) continue;
        const validated = validateAgentReview(parsed.data);
        if (validated.ok && validated.data) return validated.data;
      } catch {
        // Ignore and retry / fall back.
      }
    }

    return [];
  }
}
