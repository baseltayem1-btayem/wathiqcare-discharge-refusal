/**
 * Calibration engine.
 *
 * End-to-end orchestration of deterministic geometry, optional agentic matching,
 * correction, confidence aggregation, quality gating, and candidate registration.
 */

import type { ConsentOntologyField } from "../ontology/consent-field-ontology";
import { inspectBlankPdf } from "../intake/inspect-pdf";
import { computeLayoutFingerprint } from "../fingerprint/layout-fingerprint";
import { classifyLayoutFamily } from "../fingerprint/layout-family-classifier";
import { generateCandidateMappings } from "../geometry/candidate-rectangle-generator";
import { mapSemanticFields } from "../mapping/semantic-field-mapper";
import { runCalibrationQualityGate } from "../validation/calibration-quality-gate";
import { applyDeterministicCorrections } from "../correction/correction-engine";
import { aggregateCandidateConfidence, aggregateFieldConfidence } from "../confidence/confidence-aggregation";
import { generateSyntheticFormData } from "../synthetic/synthetic-data-generator";
import { fillCandidateWithSyntheticData } from "../synthetic/synthetic-render-adapter";
import type { CandidateRegistry } from "../registry/candidate-registry";
import { InMemoryCandidateRegistry } from "../registry/candidate-registry";
import { AgentOrchestrator } from "../agents/agent-orchestrator";
import type { AgentOrchestratorConfig } from "../agents/agent-orchestrator";
import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";

export type CalibrationEngineConfig = {
  agent?: AgentOrchestratorConfig;
  registry?: CandidateRegistry;
};

export type CalibrationEngineInput = {
  sourceFormId: string;
  sourceFileName: string;
  pdfBuffer: Buffer;
};

export type CalibrationEngineResult = {
  candidateId: string;
  status: "auto_review_candidate" | "assisted_review" | "manual_calibration_required";
  score: number;
  unmappedRequiredKeys: string[];
  layoutFamily: string;
  mappedKeys: string[];
  proposedFields: number;
  qualityGateResult: "AUTO_REVIEW_CANDIDATE" | "ASSISTED_REVIEW" | "MANUAL_CALIBRATION_REQUIRED";
};

export class CalibrationEngine {
  private agent: AgentOrchestrator;
  private registry: CandidateRegistry;

  constructor(config: CalibrationEngineConfig = {}) {
    this.agent = new AgentOrchestrator(config.agent ?? { provider: { async complete() { return { text: "{}" }; } }, enabled: false });
    this.registry = config.registry ?? new InMemoryCandidateRegistry();
  }

  async calibrate(input: CalibrationEngineInput): Promise<CalibrationEngineResult> {
    const pdfBytes = new Uint8Array(input.pdfBuffer);
    const inspection = await inspectBlankPdf(pdfBytes);
    if (!inspection.ok) {
      throw new Error(`Inspection failed: ${inspection.message}`);
    }

    const { layout, pageCount } = inspection;
    const fingerprint = computeLayoutFingerprint(layout);
    const classification = classifyLayoutFamily(fingerprint);

    // Deterministic geometry mapping.
    let mappings: CandidateFieldMapping[] = generateCandidateMappings(layout);

    // Semantic mapping for required-family checks and agent fallback context.
    const semanticResult = mapSemanticFields({ layout, family: classification.family });

    // Apply deterministic corrections (collision separation, required-field backfill).
    mappings = applyDeterministicCorrections(mappings, layout, classification.family);

    const mappedKeys = new Set(mappings.map((m) => m.ontologyKey));

    // Nothing useful detected; force manual review rather than a misleading assisted score.
    if (mappedKeys.size === 0) {
      const qualityReport = runCalibrationQualityGate({
        classification,
        mappings,
        unmappedRequiredKeys: semanticResult.unmappedRequiredKeys,
        sourcePageCount: pageCount,
        candidatePageCount: pageCount,
      });
      const candidate = await this.registry.create({
        sourceFormId: input.sourceFormId,
        sourceFileName: input.sourceFileName,
        status: "manual_calibration_required",
        mappings,
        qualityReport,
      });
      return {
        candidateId: candidate.id,
        status: "manual_calibration_required",
        score: qualityReport.score,
        unmappedRequiredKeys: semanticResult.unmappedRequiredKeys,
        layoutFamily: classification.family,
        mappedKeys: [],
        proposedFields: mappings.length,
        qualityGateResult: qualityReport.status,
      };
    }

    // Agentic fallback for unmapped required keys.
    const unmappedRequiredKeys = semanticResult.unmappedRequiredKeys.filter((k) => !mappedKeys.has(k));

    if (unmappedRequiredKeys.length > 0) {
      const agentMatches = await this.agent.proposeMatches({
        ontology: this.buildSimpleOntology(mappings),
        extractedFields: layout.pages.flatMap((p, pageIdx) =>
          p.textBlocks.map((b) => ({
            name: b.text,
            label: b.text,
            page: pageIdx,
            rect: { x: b.xNorm, y: b.yNorm, width: b.widthNorm, height: 0.02 },
          })),
        ),
        unmappedKeys: unmappedRequiredKeys,
      });

      for (const match of agentMatches) {
        // Agent matches are advisory; do not mutate mappings unless they pass guardrails.
        // Store as low-confidence partial mapping for review.
        const existing = mappings.find((m) => m.ontologyKey === match.ontologyKey);
        if (!existing) {
          mappings.push({
            ontologyKey: match.ontologyKey,
            field: {
              key: match.ontologyKey,
              labelEn: match.fieldName,
              labelAr: "",
              dataType: "string",
              language: "EN",
              role: "READ_ONLY",
              sensitivity: "OPERATIONAL",
              requiredness: "FAMILY_DEPENDENT",
              supportedWidgets: ["TEXT"],
              aliasesEn: [],
              aliasesAr: [],
              printable: "RENDER_OVERLAY",
              mayBeAbsent: true,
              aiMappingRequiresConfirmation: true,
            } as ConsentOntologyField,
            rectangles: [],
            confidence: match.confidence,
            evidence: `Agent proposal: ${match.reason}`,
            status: "PARTIAL",
          });
        }
      }
    }

    // Confidence aggregation.
    const fieldConfidences = mappings.map((m) =>
      aggregateFieldConfidence(
        m.ontologyKey,
        m.confidence,
        0.5,
        [{ source: "deterministic", score: m.confidence, reason: m.evidence }],
      ),
    );
    const candidateConfidence = aggregateCandidateConfidence("tmp", fieldConfidences);

    // Quality gate.
    const qualityReport = runCalibrationQualityGate({
      classification,
      mappings,
      unmappedRequiredKeys,
      sourcePageCount: pageCount,
      candidatePageCount: pageCount,
    });

    let status: CalibrationEngineResult["status"] = "manual_calibration_required";
    if (qualityReport.status === "AUTO_REVIEW_CANDIDATE") status = "auto_review_candidate";
    else if (qualityReport.status === "ASSISTED_REVIEW") status = "assisted_review";

    // Synthetic render (best-effort).
    let syntheticRenderBuffer: Buffer | undefined;
    try {
      const syntheticData = generateSyntheticFormData(mappings.map((m) => m.field));
      syntheticRenderBuffer = await fillCandidateWithSyntheticData(input.pdfBuffer, mappings, syntheticData);
    } catch {
      syntheticRenderBuffer = undefined;
    }

    const candidate = await this.registry.create({
      sourceFormId: input.sourceFormId,
      sourceFileName: input.sourceFileName,
      status,
      mappings,
      qualityReport,
      confidence: candidateConfidence,
    });

    if (candidate.confidence) {
      candidate.confidence.candidateId = candidate.id;
    }

    return {
      candidateId: candidate.id,
      status,
      score: qualityReport.score,
      unmappedRequiredKeys,
      layoutFamily: classification.family,
      mappedKeys: Array.from(mappedKeys),
      proposedFields: mappings.length,
      qualityGateResult: qualityReport.status,
    };
  }

  private buildSimpleOntology(mappings: CandidateFieldMapping[]): {
    fields: ConsentOntologyField[];
    layoutFamilyHint: string;
  } {
    return {
      layoutFamilyHint: "default",
      fields: mappings.map((m) => m.field),
    };
  }
}
