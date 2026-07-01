import type {
  Patient,
  Encounter,
  Procedure,
  RiskLevel,
  TimelineEvent as MockTimelineEvent,
  ConsentFormType,
} from "../types/workspace";
import type {
  ProductionPatient,
  ProductionEncounter,
  TimelineEvent as ProductionTimelineEvent,
} from "../types";
import type { ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";

export function toMockPatient(p: ProductionPatient): Patient {
  const gender = p.gender?.toLowerCase();
  return {
    id: p.id,
    mrn: p.mrn,
    name: p.name,
    nameAr: p.name,
    dateOfBirth: p.dateOfBirth ?? "—",
    gender: gender === "male" || gender === "female" ? gender : "male",
    nationalId: p.nationalId ?? p.iqamaNumber ?? undefined,
    mobileNumber: p.mobileNumber ?? "—",
    languagePreference: p.languagePreference ?? "bilingual",
    capacityStatus: p.capacityStatus ?? "competent",
  };
}

export function toMockEncounter(e: ProductionEncounter): Encounter {
  return {
    id: e.id,
    encounterId: e.encounterId,
    admissionDate: e.admissionDate ?? "—",
    department: e.department ?? "—",
    physician: e.physician ?? "—",
    physicianLicense: e.physicianLicense ?? "—",
    diagnosis: e.diagnosis ?? "—",
    procedure: e.procedure ?? "—",
    caseNumber: e.caseNumber ?? "—",
  };
}

function mapConsentFormType(formType: string | undefined): ConsentFormType {
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

function mapRiskLevel(level: string | undefined): RiskLevel {
  switch (level?.toUpperCase()) {
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

export function toMockProcedure(assembly: ClinicalKnowledgeAssembly | undefined): Procedure | undefined {
  if (!assembly) return undefined;
  return {
    id: assembly.procedureId,
    code: assembly.procedureCode,
    nameEn: assembly.procedureNameEn,
    nameAr: assembly.procedureNameAr,
    specialtyId: assembly.procedureCode,
    specialtyName: assembly.procedureCode,
    departmentName: assembly.consentForm?.tenantId ?? "",
    categoryCode: mapConsentFormType(assembly.consentForm?.formType),
    anesthesiaRequired: false,
    typicalDurationMinutes: 0,
    riskLevel: mapRiskLevel(assembly.consentForm?.riskLevel),
  };
}

const timelineTypeMap: Record<ProductionTimelineEvent["type"], MockTimelineEvent["type"]> = {
  consent_dispatched: "CONSENT_DISPATCHED",
  patient_opened: "PATIENT_LANDING_VIEWED",
  otp_verified: "OTP_VERIFIED",
  signed: "SIGNATURE_CAPTURED",
  refused: "DECISION_REFUSED",
  physician_review: "PHYSICIAN_COMPLETION_REVIEWED",
  system: "PDF_FINALIZED",
};

export function toMockTimelineEvents(events: ProductionTimelineEvent[]): MockTimelineEvent[] {
  return events.map((e) => ({
    id: e.id,
    type: timelineTypeMap[e.type] ?? "PDF_FINALIZED",
    actor: e.actor,
    actorName: e.actorName,
    timestamp: e.timestamp,
    status: e.status,
    summaryEn: e.summaryEn,
    summaryAr: e.summaryAr,
    evidenceHash: e.evidenceHash,
  }));
}
