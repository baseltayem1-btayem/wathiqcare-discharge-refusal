/**
 * Knowledge Assembly Service
 *
 * Resolves a procedure → effective package → assembled consent experience,
 * including decision-rule evaluation and fallback handling.
 */

import { randomUUID } from "crypto";
import {
  getProcedureByCode,
  searchProcedures,
} from "./procedure-service";
import { getEffectivePackageForProcedure } from "./package-service";
import { getConsentFormsByIds } from "./form-service";
import { getEducationMaterialsByIds } from "./education-service";
import { getRiskDisclosuresByIds } from "./risk-service";
import { evaluateRules } from "./rule-service";
import type {
  ClinicalKnowledgeAssembly,
  ClinicalKnowledgeAssemblyRequest,
} from "@/lib/clinical-knowledge/types";

export { searchProcedures };

export interface AssemblyResult {
  found: boolean;
  assembly?: ClinicalKnowledgeAssembly;
  fallbackReason?: string;
}

export async function assembleKnowledgePackage(
  request: ClinicalKnowledgeAssemblyRequest,
): Promise<AssemblyResult> {
  const { tenantId, procedureCode, patientContext = {}, physicianContext } = request;

  const procedure = await getProcedureByCode(tenantId, procedureCode);
  if (!procedure) {
    return {
      found: false,
      fallbackReason: "PROCEDURE_NOT_FOUND",
    };
  }

  const packageResult = await getEffectivePackageForProcedure({
    tenantId,
    procedureCode,
  });

  if (!packageResult.found || !packageResult.package) {
    return {
      found: false,
      fallbackReason: packageResult.fallbackReason ?? "NO_PUBLISHED_PACKAGE",
    };
  }

  const pkg = packageResult.package;
  const formItem = pkg.items.find((i) => i.itemType === "CONSENT_FORM");
  const educationItems = pkg.items.filter((i) => i.itemType === "EDUCATION_MATERIAL");
  const riskItems = pkg.items.filter((i) => i.itemType === "RISK_DISCLOSURE");

  if (!formItem) {
    return {
      found: false,
      fallbackReason: "PACKAGE_MISSING_CONSENT_FORM",
    };
  }

  const [consentForms, educationMaterials, riskDisclosures] = await Promise.all([
    getConsentFormsByIds(tenantId, [formItem.itemId]),
    getEducationMaterialsByIds(tenantId, educationItems.map((i) => i.itemId)),
    getRiskDisclosuresByIds(tenantId, riskItems.map((i) => i.itemId)),
  ]);

  const consentForm = consentForms[0];
  if (!consentForm) {
    return {
      found: false,
      fallbackReason: "CONSENT_FORM_NOT_FOUND",
    };
  }

  const ruleEvaluation = await evaluateRules(tenantId, {
    anesthesiaRequired: procedure.anesthesiaRequired,
    riskLevel: consentForm.riskLevel,
    specialty: procedure.specialtyId,
    patientCapacityStatus: patientContext.capacityStatus,
    patientLanguagePreference: patientContext.languagePreference,
  });

  const status = ruleEvaluation.blockers.length > 0 ? "blocked" : "ready";

  const assembly: ClinicalKnowledgeAssembly = {
    assemblyId: randomUUID(),
    tenantId,
    procedureId: procedure.id,
    procedureCode: procedure.code,
    procedureNameEn: procedure.nameEn,
    procedureNameAr: procedure.nameAr,
    packageId: pkg.id,
    packageVersion: pkg.version,
    status,
    consentForm,
    educationMaterials,
    riskDisclosures,
    decisionRules: [], // populated on demand by rule-service if needed
    suggestions: ruleEvaluation.suggestions,
    blockers: ruleEvaluation.blockers,
    requiredParticipants: ruleEvaluation.requiredParticipants,
    packageSnapshot: pkg.packageSnapshot,
    assembledAt: new Date().toISOString(),
  };

  return { found: true, assembly };
}
