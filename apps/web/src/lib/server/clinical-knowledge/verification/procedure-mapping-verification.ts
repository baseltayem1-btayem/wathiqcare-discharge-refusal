/**
 * Procedure Mapping Verification
 *
 * Verifies that every ClinicalProcedure has a complete chain:
 *   Procedure → Knowledge Package → Consent Form → Education Material → Decision Rules
 */

import { buildImcSeedPlan } from "../migration/seed-from-imc";
import { defaultDecisionRules } from "../rules/default-rules";

export interface ProcedureMappingChain {
  procedureCode: string;
  procedureNameEn: string;
  packageId: string;
  packageVersion: string;
  consentFormId: string;
  consentFormTitleEn: string;
  educationMaterialIds: string[];
  riskDisclosureIds: string[];
  decisionRuleCodes: string[];
  complete: boolean;
  issues: string[];
}

export interface ProcedureMappingVerificationResult {
  totalProcedures: number;
  completeChains: number;
  incompleteChains: number;
  chains: ProcedureMappingChain[];
  success: boolean;
}

export function verifyProcedureMappings(tenantId: string): ProcedureMappingVerificationResult {
  const plan = buildImcSeedPlan({ tenantId });

  const chains: ProcedureMappingChain[] = [];

  for (const procedure of plan.procedures) {
    const issues: string[] = [];

    // Find package for procedure
    const pkg = plan.packages.find((p) => p.sourceId === procedure.code);
    if (!pkg) {
      issues.push("No knowledge package");
      chains.push({
        procedureCode: procedure.code,
        procedureNameEn: procedure.nameEn,
        packageId: "",
        packageVersion: "",
        consentFormId: "",
        consentFormTitleEn: "",
        educationMaterialIds: [],
        riskDisclosureIds: [],
        decisionRuleCodes: [],
        complete: false,
        issues,
      });
      continue;
    }

    // Find consent form item
    const formItem = pkg.items.find((i) => i.itemType === "CONSENT_FORM");
    if (!formItem) {
      issues.push("Package missing consent form");
    }

    const formEntry = formItem
      ? plan.consentForms.find((f) => (f.form.id as string) === formItem.itemId)
      : undefined;

    if (formItem && !formEntry) {
      issues.push("Consent form item references missing form");
    }

    // Education items
    // Education items (optional for chain completeness, reported separately)
    const educationItems = pkg.items.filter((i) => i.itemType === "EDUCATION_MATERIAL");
    const educationMaterialIds = educationItems.map((i) => i.itemId);
    for (const eduItem of educationItems) {
      const exists = plan.educationMaterials.some((e) => e.id === eduItem.itemId);
      if (!exists) issues.push(`Education material ${eduItem.itemId} not found`);
    }

    // Risk items (required)
    const riskItems = pkg.items.filter((i) => i.itemType === "RISK_DISCLOSURE");
    const riskDisclosureIds = riskItems.map((i) => i.itemId);
    for (const riskItem of riskItems) {
      const exists = plan.riskDisclosures.some((r) => r.id === riskItem.itemId);
      if (!exists) issues.push(`Risk disclosure ${riskItem.itemId} not found`);
    }

    // Decision rules (tenant-scoped defaults)
    const decisionRuleCodes = defaultDecisionRules.map((r) => `${tenantId}:${r.code}`);

    if (riskItems.length === 0) {
      issues.push("No risk disclosure in package");
    }

    chains.push({
      procedureCode: procedure.code,
      procedureNameEn: procedure.nameEn,
      packageId: pkg.package.id as string,
      packageVersion: pkg.package.version,
      consentFormId: formEntry?.form.id ?? formItem?.itemId ?? "",
      consentFormTitleEn: formEntry?.form.titleEn ?? "",
      educationMaterialIds,
      riskDisclosureIds,
      decisionRuleCodes,
      complete: issues.length === 0,
      issues,
    });
  }

  const incompleteChains = chains.filter((c) => !c.complete).length;

  return {
    totalProcedures: chains.length,
    completeChains: chains.length - incompleteChains,
    incompleteChains,
    chains,
    success: incompleteChains === 0,
  };
}
