/**
 * Coverage Report
 *
 * Computes coverage percentages for consent forms, education materials,
 * risk disclosures, and decision rules across the seeded procedure catalog.
 */

import { buildImcSeedPlan } from "../migration/seed-from-imc";
import { defaultDecisionRules } from "../rules/default-rules";

export interface CoverageReport {
  procedureCount: number;
  consentCoveragePercent: number;
  educationCoveragePercent: number;
  riskCoveragePercent: number;
  ruleCoveragePercent: number;
  overallCoveragePercent: number;
  proceduresWithConsent: number;
  proceduresWithEducation: number;
  proceduresWithRisk: number;
  proceduresWithRules: number;
}

export function generateCoverageReport(tenantId: string): CoverageReport {
  const plan = buildImcSeedPlan({ tenantId });

  const procedureCount = plan.procedures.length;

  let proceduresWithConsent = 0;
  let proceduresWithEducation = 0;
  let proceduresWithRisk = 0;

  for (const pkg of plan.packages) {
    const hasConsent = pkg.items.some((i) => i.itemType === "CONSENT_FORM");
    const hasEducation = pkg.items.some((i) => i.itemType === "EDUCATION_MATERIAL");
    const hasRisk = pkg.items.some((i) => i.itemType === "RISK_DISCLOSURE");

    if (hasConsent) proceduresWithConsent++;
    if (hasEducation) proceduresWithEducation++;
    if (hasRisk) proceduresWithRisk++;
  }

  // Rules are seeded per tenant, not per procedure, so coverage is binary per rule
  // (all active rules are available for evaluation across all procedures).
  const proceduresWithRules = defaultDecisionRules.length > 0 ? procedureCount : 0;

  const consentCoveragePercent = (proceduresWithConsent / procedureCount) * 100;
  const educationCoveragePercent = (proceduresWithEducation / procedureCount) * 100;
  const riskCoveragePercent = (proceduresWithRisk / procedureCount) * 100;
  const ruleCoveragePercent = defaultDecisionRules.length > 0 ? 100 : 0;

  const overallCoveragePercent =
    (consentCoveragePercent +
      educationCoveragePercent +
      riskCoveragePercent +
      ruleCoveragePercent) /
    4;

  return {
    procedureCount,
    consentCoveragePercent: Math.round(consentCoveragePercent * 100) / 100,
    educationCoveragePercent: Math.round(educationCoveragePercent * 100) / 100,
    riskCoveragePercent: Math.round(riskCoveragePercent * 100) / 100,
    ruleCoveragePercent,
    overallCoveragePercent: Math.round(overallCoveragePercent * 100) / 100,
    proceduresWithConsent,
    proceduresWithEducation,
    proceduresWithRisk,
    proceduresWithRules,
  };
}
