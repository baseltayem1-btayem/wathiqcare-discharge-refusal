/**
 * Determinism validator. Runs each specialty payload through the engine
 * multiple times and asserts that audit.hash, payloadFingerprint, the
 * legal-grade rendered HTML, and the evidence-package suggestedFilename
 * are byte-identical across iterations.
 */

import { buildExperimentalDynamicConsent } from "../service";
import { renderLegalGradeConsentHtml } from "../legal-grade/legal-grade-renderer";
import { listSpecialtyDemos } from "../legal-grade/specialty-demos";
import { hashJson } from "../pdf-evidence/evidence-hash";
import { buildLegalEvidencePdfPreview } from "../pdf-evidence/pdf-preview-adapter";
import {
  summarizeSection,
  type ValidationCheck,
  type ValidationSection,
} from "./validation-report";

export interface DeterminismValidationInput {
  iterations?: number;
}

export interface DeterminismDriftDetail {
  demoId: string;
  field: "auditHash" | "payloadFingerprint" | "html" | "templateHash" | "suggestedFilename";
  first: string;
  second: string;
}

export interface DeterminismValidationResult {
  section: ValidationSection;
  drifts: DeterminismDriftDetail[];
  iterations: number;
}

function runOnce(payload: Parameters<typeof buildExperimentalDynamicConsent>[0]) {
  const result = buildExperimentalDynamicConsent(payload);
  const html = renderLegalGradeConsentHtml({
    template: result.template,
    payload: result.payload,
    sections: result.sections,
    risks: result.risks,
    alternatives: result.alternatives,
    warnings: result.warnings,
    audit: result.audit,
    generatedAt: result.generatedAt,
    language: result.payload.language,
  });
  const templateHash = hashJson(result.template);
  const evidence = buildLegalEvidencePdfPreview({
    html,
    templateId: result.template.id,
    templateVersion: result.template.version,
    templateHash,
    payloadHash: result.audit.payloadFingerprint,
    auditHash: result.audit.hash,
    patientMrn: result.payload.patient.identifier ?? "",
    encounterNo: result.payload.encounter.encounterNumber ?? "",
    caseNumber: result.payload.encounter.caseNumber ?? "",
    generatedAt: result.generatedAt,
    generatedBy: "validation-suite",
  });
  return {
    auditHash: result.audit.hash,
    payloadFingerprint: result.audit.payloadFingerprint,
    html,
    templateHash,
    suggestedFilename: evidence.suggestedFilename,
  };
}

export function validateDeterminism(
  input: DeterminismValidationInput = {},
): DeterminismValidationResult {
  const iterations = Math.max(2, Math.min(input.iterations ?? 3, 10));
  const demos = listSpecialtyDemos();
  const checks: ValidationCheck[] = [];
  const drifts: DeterminismDriftDetail[] = [];

  for (const demo of demos) {
    let baseline:
      | ReturnType<typeof runOnce>
      | { __failed: true; error: string }
      | null = null;
    try {
      baseline = runOnce(demo.payload);
    } catch (err) {
      baseline = { __failed: true, error: err instanceof Error ? err.message : String(err) };
    }

    if (baseline && "__failed" in baseline) {
      checks.push({
        id: `determinism.${demo.id}.baseline`,
        label: `${demo.id}: baseline run completes`,
        status: "FAIL",
        detail: baseline.error,
      });
      continue;
    }

    const reference = baseline!;
    let driftDetected = false;

    for (let i = 1; i < iterations; i++) {
      let next: ReturnType<typeof runOnce>;
      try {
        next = runOnce(demo.payload);
      } catch (err) {
        driftDetected = true;
        checks.push({
          id: `determinism.${demo.id}.iter-${i}.error`,
          label: `${demo.id}: iteration ${i} did not throw`,
          status: "FAIL",
          detail: err instanceof Error ? err.message : String(err),
        });
        break;
      }

      const fields: Array<keyof typeof reference> = [
        "auditHash",
        "payloadFingerprint",
        "html",
        "templateHash",
        "suggestedFilename",
      ];
      for (const field of fields) {
        if (reference[field] !== next[field]) {
          driftDetected = true;
          drifts.push({
            demoId: demo.id,
            field: field as DeterminismDriftDetail["field"],
            first: shortValue(reference[field]),
            second: shortValue(next[field]),
          });
        }
      }
    }

    checks.push({
      id: `determinism.${demo.id}.stable`,
      label: `${demo.id}: deterministic across ${iterations} runs`,
      status: driftDetected ? "FAIL" : "PASS",
    });
  }

  return {
    section: summarizeSection("determinism", `Deterministic engine (n=${iterations})`, checks),
    drifts,
    iterations,
  };
}

function shortValue(value: string): string {
  if (value.length <= 64) return value;
  return `${value.slice(0, 32)}…(${value.length} chars)`;
}
