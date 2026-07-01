import type { ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";
import type {
  MockClinicalKnowledgeAssembly,
  MockConsentForm,
  AnesthesiaDecision,
  RiskLevel,
} from "../types/workspace";

export function mapAssemblyToMock(
  assembly: ClinicalKnowledgeAssembly | undefined,
): MockClinicalKnowledgeAssembly | undefined {
  if (!assembly) return undefined;

  return {
    assemblyId: assembly.assemblyId,
    procedureId: assembly.procedureId,
    procedureCode: assembly.procedureCode,
    procedureNameEn: assembly.procedureNameEn,
    procedureNameAr: assembly.procedureNameAr,
    status: assembly.status,
    consentForm: assembly.consentForm
      ? {
          id: assembly.consentForm.id,
          code: assembly.consentForm.code,
          titleEn: assembly.consentForm.titleEn,
          titleAr: assembly.consentForm.titleAr,
          formType: mapFormType(assembly.consentForm.formType),
          riskLevel: mapRiskLevel(assembly.consentForm.riskLevel),
          version: assembly.consentForm.version,
          requiresWitness: assembly.requiredParticipants.includes("witness"),
          requiresInterpreter: assembly.requiredParticipants.includes("interpreter"),
        }
      : undefined,
    educationMaterials: assembly.educationMaterials.map((m) => ({
      id: m.id,
      code: m.code,
      titleEn: m.titleEn,
      titleAr: m.titleAr,
      assetType: (m.assetType === "VIDEO" ? "VIDEO" : m.assetType === "INTERACTIVE" ? "INTERACTIVE" : "PDF") as
        | "PDF"
        | "VIDEO"
        | "INTERACTIVE"
        | "TEXT",
      assetUrl: m.assetUrl || "",
      durationMinutes: m.durationMinutes ?? undefined,
    })),
    riskDisclosures: assembly.riskDisclosures.map((r) => ({
      id: r.id,
      code: r.code,
      titleEn: r.titleEn,
      titleAr: r.titleAr,
      riskLevel: mapRiskLevel(r.riskLevel),
      incidenceRate: r.incidenceRate ?? undefined,
    })),
    suggestions: assembly.suggestions.map((s) => ({
      id: s.id,
      type: mapSuggestionType(s.type),
      messageEn: s.messageEn,
      messageAr: s.messageAr,
      severity: mapSeverity(s.severity),
    })),
    blockers: assembly.blockers.map((b) => ({
      key: b.key,
      severity: mapBlockerSeverity(b.severity),
      messageEn: b.messageEn,
      messageAr: b.messageAr,
    })),
    requiredParticipants: assembly.requiredParticipants,
    assembledAt: assembly.assembledAt,
  };
}

function mapFormType(formType: string): MockConsentForm["formType"] {
  switch (formType) {
    case "ANESTHESIA_CONSENT":
      return "ANESTHESIA_CONSENT";
    case "BLOOD_TRANSFUSION_CONSENT":
      return "BLOOD_TRANSFUSION_CONSENT";
    case "RESEARCH_CLINICAL_TRIAL_CONSENT":
      return "RESEARCH_CLINICAL_TRIAL_CONSENT";
    case "HIGH_RISK_PROCEDURE_CONSENT":
      return "HIGH_RISK_PROCEDURE_CONSENT";
    case "PROCEDURE_CONSENT":
    default:
      return "PROCEDURE_CONSENT";
  }
}

function mapRiskLevel(riskLevel: string | null | undefined): RiskLevel {
  switch (riskLevel?.toUpperCase()) {
    case "HIGH":
      return "HIGH";
    case "CRITICAL":
      return "CRITICAL";
    case "LOW":
    case "STANDARD":
      return "STANDARD";
    case "MEDIUM":
    default:
      return "MEDIUM";
  }
}

function mapSuggestionType(
  type: string,
): "witness-required" | "interpreter-required" | "education-recommended" | "guardian-required" | "risk-highlight" {
  switch (type) {
    case "witness-required":
      return "witness-required";
    case "interpreter-required":
      return "interpreter-required";
    case "education-recommended":
      return "education-recommended";
    case "guardian-required":
      return "guardian-required";
    case "missing-risk":
    case "missing-alternative":
    case "procedure-match":
    case "risk-highlight":
    default:
      return "risk-highlight";
  }
}

function mapSeverity(severity: string): "info" | "warning" | "critical" {
  switch (severity?.toLowerCase()) {
    case "warning":
      return "warning";
    case "critical":
      return "critical";
    case "info":
    default:
      return "info";
  }
}

function mapBlockerSeverity(severity: string): "blocking" | "warning" {
  switch (severity?.toLowerCase()) {
    case "warning":
      return "warning";
    case "blocking":
    default:
      return "blocking";
  }
}

export function mapAnesthesiaDecision(
  decision: AnesthesiaDecision | undefined,
): "NONE" | "LOCAL" | "SEDATION" | "REGIONAL" | "GENERAL" | undefined {
  return decision;
}
