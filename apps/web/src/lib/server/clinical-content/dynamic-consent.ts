/**
 * Dynamic Consent Generator
 *
 * Assembles a consent package from clinical content, approved forms, patient
 * context, and physician input. Does not generate PDFs itself — it produces
 * a structured assembly payload that the existing PDF engine may consume.
 */

import {
  type ConsentAssembly,
  type ConsentAssemblyRequest,
  type ConsentBlocker,
  type ClinicalSuggestion,
} from "@/lib/clinical-content/types";
import { resolveProcedureMapping } from "./procedure-mapping";
import { evaluateDecisionSupport } from "./decision-support";
import { findEducationMaterialForProcedure } from "./education";

function generateAssemblyId(): string {
  return `asm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function assembleConsent(input: ConsentAssemblyRequest): ConsentAssembly {
  const mapping = resolveProcedureMapping({ procedure: input.procedureName });

  const blockers: ConsentBlocker[] = [];
  const suggestions: ClinicalSuggestion[] = [];

  if (!mapping.found || mapping.consentForms.length === 0) {
    blockers.push({
      key: "no-approved-form",
      messageEn: `No approved consent form found for "${input.procedureName}".`,
      messageAr: `لم يتم العثور على نموذج موافقة معتمد لـ "${input.procedureName}".`,
      severity: "blocking",
    });

    return {
      assemblyId: generateAssemblyId(),
      tenantId: input.tenantId,
      procedureName: input.procedureName,
      status: "blocked",
      consentForm: undefined as never,
      disclosedRisks: [],
      disclosedAlternatives: [],
      patientContext: input.patientContext,
      physicianContext: input.physicianContext,
      generatedAt: new Date().toISOString(),
      version: "v2.0",
      blockers,
      suggestions,
    };
  }

  const consentForm = mapping.consentForms[0];

  // Validate patient capacity
  if (
    (input.patientContext.capacityStatus === "minor" ||
      input.patientContext.capacityStatus === "incapacitated") &&
    !input.patientContext.guardianName
  ) {
    blockers.push({
      key: "guardian-required",
      messageEn: "A legal guardian is required for this patient.",
      messageAr: "يلزم وجود ولي أمر قانوني لهذا المريض.",
      severity: "blocking",
    });
  }

  // Validate physician context
  if (!input.physicianContext.licenseNumber || !input.physicianContext.specialty) {
    blockers.push({
      key: "physician-context-incomplete",
      messageEn: "Physician license and specialty are required.",
      messageAr: "رخصة الطبيب وتخصصه مطلوبان.",
      severity: "blocking",
    });
  }

  // Include education if requested and available
  const educationMaterial = input.includeEducation
    ? findEducationMaterialForProcedure(input.procedureName)
    : undefined;

  // Decision support
  const decisionSupportResult = input.includeDecisionSupport
    ? evaluateDecisionSupport({
        procedure: mapping.procedure,
        disclosedRiskIds: mapping.risks.map((r) => r.id),
        disclosedAlternativeIds: mapping.alternatives.map((a) => a.id),
        patientContext: input.patientContext,
        includeEducation: Boolean(educationMaterial),
      })
    : undefined;

  if (decisionSupportResult) {
    suggestions.push(...decisionSupportResult.suggestions);
  }

  // Build disclosed content lists
  const disclosedRisks = mapping.risks;
  const disclosedAlternatives = mapping.alternatives;

  // Warnings from decision support
  if (decisionSupportResult?.riskLevel === "high" || decisionSupportResult?.riskLevel === "critical") {
    blockers.push({
      key: "high-risk-procedure",
      messageEn: "This is a high-risk procedure. Additional review and witness signature are recommended.",
      messageAr: "هذا إجراء عالي المخاطر. يُنصح بالمراجعة الإضافية وتوقيع الشاهد.",
      severity: "warning",
    });
  }

  const status = blockers.some((b) => b.severity === "blocking") ? "blocked" : educationMaterial ? "draft" : "ready";

  return {
    assemblyId: generateAssemblyId(),
    tenantId: input.tenantId,
    procedureName: input.procedureName,
    status,
    consentForm,
    educationMaterial,
    disclosedRisks,
    disclosedAlternatives,
    physicianNotes: input.physicianContext.notes,
    patientContext: input.patientContext,
    physicianContext: input.physicianContext,
    generatedAt: new Date().toISOString(),
    version: "v2.0",
    blockers,
    suggestions,
  };
}
