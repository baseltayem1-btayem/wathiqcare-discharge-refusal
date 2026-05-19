/**
 * Specialty demo validator. Iterates the published specialty demos through
 * the dynamic-consent engine + legal-grade renderer and reports per-demo
 * structural integrity. Pure / synchronous.
 */

import { buildExperimentalDynamicConsent } from "../service";
import { renderLegalGradeConsentHtml } from "../legal-grade/legal-grade-renderer";
import { listSpecialtyDemos, getSpecialtyDemo } from "../legal-grade/specialty-demos";
import {
  summarizeSection,
  type ValidationCheck,
  type ValidationSection,
} from "./validation-report";

export interface SpecialtyValidationResult {
  section: ValidationSection;
  perDemo: Array<{
    id: string;
    labelEn: string;
    htmlLength: number;
    warnings: string[];
    auditHash: string;
    templateId: string;
    templateVersion: string;
  }>;
}

export function validateSpecialtyDemos(): SpecialtyValidationResult {
  const demos = listSpecialtyDemos();
  const checks: ValidationCheck[] = [];
  const perDemo: SpecialtyValidationResult["perDemo"] = [];

  for (const demoSummary of demos) {
    const demo = getSpecialtyDemo(demoSummary.id);
    if (!demo) {
      checks.push({
        id: `specialty.${demoSummary.id}.exists`,
        label: `Specialty demo "${demoSummary.id}" resolvable`,
        status: "FAIL",
      });
      continue;
    }

    let result;
    try {
      result = buildExperimentalDynamicConsent(demo.payload);
    } catch (err) {
      checks.push({
        id: `specialty.${demoSummary.id}.build`,
        label: `Build engine produces a result for "${demoSummary.id}"`,
        status: "FAIL",
        detail: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    let html: string;
    try {
      html = renderLegalGradeConsentHtml({
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
    } catch (err) {
      checks.push({
        id: `specialty.${demoSummary.id}.render`,
        label: `Legal-grade renderer succeeds for "${demoSummary.id}"`,
        status: "FAIL",
        detail: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    const lengthOk = html.length > 1000;
    const hasSignatures = /lg-signatures/.test(html);
    const hasAuditFooter = /lg-audit-footer/.test(html);

    checks.push({
      id: `specialty.${demoSummary.id}.length`,
      label: `${demoSummary.id}: HTML length above floor (1000)`,
      status: lengthOk ? "PASS" : "WARNING",
      detail: `bytes=${html.length}`,
    });
    checks.push({
      id: `specialty.${demoSummary.id}.signatures`,
      label: `${demoSummary.id}: signature container present`,
      status: hasSignatures ? "PASS" : "FAIL",
    });
    checks.push({
      id: `specialty.${demoSummary.id}.audit`,
      label: `${demoSummary.id}: audit footer present`,
      status: hasAuditFooter ? "PASS" : "FAIL",
    });

    perDemo.push({
      id: demoSummary.id,
      labelEn: demoSummary.labelEn,
      htmlLength: html.length,
      warnings: result.warnings ?? [],
      auditHash: result.audit.hash,
      templateId: result.template.id,
      templateVersion: result.template.version,
    });
  }

  return {
    section: summarizeSection("specialty", "Specialty demo render integrity", checks),
    perDemo,
  };
}
