/**
 * Clinical Content Registry
 *
 * In-memory, versioned registry for the next-generation Clinical Content Platform.
 * All content is additive; it supplements (never replaces) the production
 * consent library and IMC approved forms.
 */

import {
  type ApprovedFormV2,
  type ClinicalContentItem,
  type ClinicalContentKind,
  type ContentSearchFilters,
  type ContentSearchResult,
  type DecisionRule,
  type EducationMaterial,
  type RiskDisclosure,
  type AlternativeDisclosure,
  type ClinicalProcedure,
  type ConsentFormCategory,
  type RiskLevel,
} from "@/lib/clinical-content/types";
import {
  imcApprovedConsentLibraryGenerated,
  type ImcApprovedConsentLibraryItem,
} from "@/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated";

const now = new Date().toISOString();

function consentTypeToCategory(consentType: string): ConsentFormCategory {
  switch (consentType) {
    case "PROCEDURE_CONSENT":
      return "general-surgery";
    case "ANESTHESIA_CONSENT":
      return "anesthesia";
    case "BLOOD_TRANSFUSION_CONSENT":
      return "blood-transfusion";
    case "DIAGNOSTIC_IMAGING_CONSENT":
      return "diagnostic";
    case "RESEARCH_CLINICAL_TRIAL_CONSENT":
      return "research";
    default:
      return "special-procedure";
  }
}

function consentTypeToRiskLevel(consentType: string, anesthesiaRequired: boolean): RiskLevel {
  if (consentType === "ANESTHESIA_CONSENT") return "high";
  if (anesthesiaRequired) return "high";
  if (consentType === "BLOOD_TRANSFUSION_CONSENT") return "medium";
  return "standard";
}

function buildApprovedFormV2(item: ImcApprovedConsentLibraryItem): ApprovedFormV2 {
  return {
    kind: "approved-form",
    id: item.id,
    version: item.version,
    status: item.status === "ACTIVE" ? "approved" : "draft",
    language: item.language,
    createdAt: now,
    updatedAt: now,
    governanceOwner: "IMC Consent Governance",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    tags: item.keywords,
    titleEn: item.titleEn,
    titleAr: item.titleAr || item.titleEn,
    source: "imc-approved-library",
    metadata: {
      consentType: item.consentType,
      categoryCode: item.categoryCode,
      templateType: item.templateType,
    },
    category: consentTypeToCategory(item.consentType),
    specialty: item.specialty,
    procedure: item.titleEn,
    procedureCode: item.categoryCode,
    riskLevel: consentTypeToRiskLevel(item.consentType, item.anesthesiaRequired),
    pdfUrl: `/imc-consent-library/${encodeURIComponent(item.hospitalPdfFilename)}`,
    summaryEn: `Approved bilingual consent template for ${item.titleEn}.`,
    summaryAr: item.titleAr
      ? `نموذج موافقة ثنائي اللغة معتمد لـ ${item.titleAr}.`
      : `نموذج موافقة ثنائي اللغة معتمد لـ ${item.titleEn}.`,
    keywords: item.keywords,
    requiresAnesthesia: item.anesthesiaRequired,
    witnessRequired: item.anesthesiaRequired,
    interpreterRequired: false,
    sections: [
      {
        id: `${item.id}-header`,
        type: "header",
        titleEn: item.titleEn,
        titleAr: item.titleAr || item.titleEn,
        contentEn: `Consent for ${item.titleEn}`,
        contentAr: `موافقة على ${item.titleAr || item.titleEn}`,
        required: true,
        order: 1,
      },
      {
        id: `${item.id}-ack`,
        type: "acknowledgment",
        titleEn: "Patient Acknowledgment",
        titleAr: "إقرار المريض",
        contentEn: "I acknowledge that the procedure, risks, and alternatives have been explained to me.",
        contentAr: "أقر بأنه تم شرح الإجراء والمخاطر والبدائل لي.",
        required: true,
        order: 99,
      },
    ],
  };
}

function buildEducationMaterial(item: ImcApprovedConsentLibraryItem): EducationMaterial | null {
  if (!item.patientEducationPdfFilename) return null;
  return {
    kind: "education-material",
    id: `${item.id}-education`,
    version: item.version,
    status: item.status === "ACTIVE" ? "approved" : "draft",
    language: item.language,
    createdAt: now,
    updatedAt: now,
    governanceOwner: "IMC Patient Education Governance",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    tags: [...item.keywords, "patient-education"],
    titleEn: `${item.titleEn} — Patient Education`,
    titleAr: item.titleAr
      ? `${item.titleAr} — نسخة المريض`
      : `تثقيف المريض — ${item.titleEn}`,
    source: "imc-approved-library",
    metadata: {
      procedure: item.titleEn,
      specialty: item.specialty,
    },
    assetType: "pdf",
    assetUrl: `/imc-consent-library/${encodeURIComponent(item.patientEducationPdfFilename)}`,
    durationMinutes: null,
    comprehensionChecks: [
      {
        id: `${item.id}-q1`,
        questionEn: `What is the main purpose of the ${item.titleEn} procedure?`,
        questionAr: `ما هو الغرض الرئيسي من إجراء ${item.titleAr || item.titleEn}؟`,
        options: [
          { id: "a", labelEn: "To diagnose a condition", labelAr: " لتشخيص حالة" },
          { id: "b", labelEn: "To treat a diagnosed condition", labelAr: "لعلاج حالة تم تشخيصها" },
          { id: "c", labelEn: "Preventive screening", labelAr: "فحص وقائي" },
        ],
        correctOptionId: "b",
        explanationEn: "The procedure is performed to treat a condition that has already been diagnosed.",
        explanationAr: "يتم إجراء العملية لعلاج حالة تم تشخيصها مسبقًا.",
      },
    ],
    procedureIds: [item.id],
  };
}

function buildRiskDisclosure(item: ImcApprovedConsentLibraryItem): RiskDisclosure {
  return {
    kind: "risk-disclosure",
    id: `${item.id}-risk-general`,
    version: item.version,
    status: "approved",
    language: item.language,
    createdAt: now,
    updatedAt: now,
    governanceOwner: "IMC Clinical Governance",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    tags: item.keywords,
    titleEn: `General Risks — ${item.titleEn}`,
    titleAr: `المخاطر العامة — ${item.titleAr || item.titleEn}`,
    source: "imc-approved-library",
    metadata: { procedure: item.titleEn, specialty: item.specialty },
    riskLevel: consentTypeToRiskLevel(item.consentType, item.anesthesiaRequired),
    descriptionEn: `Common risks include bleeding, infection, anesthesia reactions, and unexpected findings requiring additional procedures.`,
    descriptionAr: `تشمل المخاطر الشائعة النزيف والعدوى وردود فعل التخدير والنتائج غير المتوقعة التي قد تتطلب إجراءات إضافية.`,
    incidenceRate: "Variable by patient factors",
    specialties: [item.specialty],
    procedures: [item.titleEn],
  };
}

function buildAlternativeDisclosure(item: ImcApprovedConsentLibraryItem): AlternativeDisclosure {
  return {
    kind: "alternative-disclosure",
    id: `${item.id}-alt-general`,
    version: item.version,
    status: "approved",
    language: item.language,
    createdAt: now,
    updatedAt: now,
    governanceOwner: "IMC Clinical Governance",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    tags: item.keywords,
    titleEn: `Alternatives — ${item.titleEn}`,
    titleAr: `البدائل — ${item.titleAr || item.titleEn}`,
    source: "imc-approved-library",
    metadata: { procedure: item.titleEn, specialty: item.specialty },
    descriptionEn: `Alternatives include non-surgical management, observation, or other procedural approaches depending on clinical judgment.`,
    descriptionAr: `تشمل البدائل العلاج غير الجراحي أو المراقبة أو المناهج الإجرائية الأخرى حسب التقدير السريري.`,
    specialties: [item.specialty],
    procedures: [item.titleEn],
  };
}

function buildProcedureDefinition(item: ImcApprovedConsentLibraryItem): ClinicalProcedure {
  return {
    kind: "procedure-definition",
    id: `proc-${item.id}`,
    version: item.version,
    status: item.status === "ACTIVE" ? "approved" : "draft",
    language: item.language,
    createdAt: now,
    updatedAt: now,
    governanceOwner: "IMC Procedure Catalog",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    tags: item.keywords,
    titleEn: item.titleEn,
    titleAr: item.titleAr || item.titleEn,
    source: "imc-approved-library",
    metadata: {
      consentType: item.consentType,
      categoryCode: item.categoryCode,
      templateType: item.templateType,
    },
    procedureCode: item.categoryCode,
    specialty: item.specialty,
    department: item.department,
    categoryCode: item.categoryCode,
    anesthesiaRequired: item.anesthesiaRequired,
    typicalDurationMinutes: undefined,
    mappedFormIds: [item.id],
    mappedEducationIds: item.patientEducationPdfFilename ? [`${item.id}-education`] : [],
    mappedRiskIds: [`${item.id}-risk-general`],
    mappedAlternativeIds: [`${item.id}-alt-general`],
  };
}

// ── Decision Rules ─────────────────────────────────────────────────────────

const decisionRules: DecisionRule[] = [
  {
    kind: "decision-rule",
    id: "rule-anesthesia-high-risk",
    version: "v1.0",
    status: "approved",
    language: "bilingual",
    createdAt: now,
    updatedAt: now,
    governanceOwner: "IMC Clinical Decision Support",
    tags: ["anesthesia", "high-risk"],
    titleEn: "Anesthesia requires high-risk pathway",
    titleAr: "التخدير يتطلب مسار المخاطر العالية",
    source: "clinical-content-engine",
    metadata: {},
    condition: { anesthesiaRequired: true },
    action: {
      requireWitness: true,
      educationRecommended: true,
    },
    priority: 100,
  },
  {
    kind: "decision-rule",
    id: "rule-minor-guardian",
    version: "v1.0",
    status: "approved",
    language: "bilingual",
    createdAt: now,
    updatedAt: now,
    governanceOwner: "IMC Legal Governance",
    tags: ["guardian", "minor", "capacity"],
    titleEn: "Minor or incapacitated patient requires guardian",
    titleAr: "المريض القاصر أو غير المؤهل يتطلب ولي أمر",
    source: "clinical-content-engine",
    metadata: {},
    condition: {},
    action: {
      requireGuardian: true,
      requireWitness: true,
    },
    priority: 200,
  },
  {
    kind: "decision-rule",
    id: "rule-interpreter-non-arabic",
    version: "v1.0",
    status: "approved",
    language: "bilingual",
    createdAt: now,
    updatedAt: now,
    governanceOwner: "IMC Patient Communication",
    tags: ["interpreter", "language"],
    titleEn: "Non-Arabic speaker may require interpreter",
    titleAr: "المتحدث غير العربي قد يحتاج مترجمًا",
    source: "clinical-content-engine",
    metadata: {},
    condition: {},
    action: {
      requireInterpreter: true,
    },
    priority: 50,
  },
];

// ── Registry Index ─────────────────────────────────────────────────────────

class ClinicalContentRegistry {
  private approvedForms: Map<string, ApprovedFormV2> = new Map();
  private educationMaterials: Map<string, EducationMaterial> = new Map();
  private riskDisclosures: Map<string, RiskDisclosure> = new Map();
  private alternativeDisclosures: Map<string, AlternativeDisclosure> = new Map();
  private procedures: Map<string, ClinicalProcedure> = new Map();
  private rules: DecisionRule[] = [...decisionRules];

  constructor() {
    this.seedFromImcLibrary();
  }

  private seedFromImcLibrary() {
    for (const item of imcApprovedConsentLibraryGenerated) {
      const form = buildApprovedFormV2(item);
      this.approvedForms.set(form.id, form);

      const education = buildEducationMaterial(item);
      if (education) {
        this.educationMaterials.set(education.id, education);
      }

      const risk = buildRiskDisclosure(item);
      this.riskDisclosures.set(risk.id, risk);

      const alternative = buildAlternativeDisclosure(item);
      this.alternativeDisclosures.set(alternative.id, alternative);

      const procedure = buildProcedureDefinition(item);
      this.procedures.set(procedure.id, procedure);
    }
  }

  // ── Generic accessors ───────────────────────────────────────────────────

  getApprovedForm(id: string): ApprovedFormV2 | undefined {
    return this.approvedForms.get(id);
  }

  getEducationMaterial(id: string): EducationMaterial | undefined {
    return this.educationMaterials.get(id);
  }

  getRiskDisclosure(id: string): RiskDisclosure | undefined {
    return this.riskDisclosures.get(id);
  }

  getAlternativeDisclosure(id: string): AlternativeDisclosure | undefined {
    return this.alternativeDisclosures.get(id);
  }

  getProcedure(id: string): ClinicalProcedure | undefined {
    return this.procedures.get(id);
  }

  getDecisionRules(): DecisionRule[] {
    return [...this.rules].sort((a, b) => b.priority - a.priority);
  }

  listApprovedForms(): ApprovedFormV2[] {
    return Array.from(this.approvedForms.values());
  }

  listEducationMaterials(): EducationMaterial[] {
    return Array.from(this.educationMaterials.values());
  }

  listProcedures(): ClinicalProcedure[] {
    return Array.from(this.procedures.values());
  }

  // ── Search ──────────────────────────────────────────────────────────────

  search<T extends ClinicalContentItem>(
    kind: ClinicalContentKind,
    filters: ContentSearchFilters,
  ): ContentSearchResult<T> {
    let items: ClinicalContentItem[];
    switch (kind) {
      case "approved-form":
        items = this.listApprovedForms();
        break;
      case "education-material":
        items = this.listEducationMaterials();
        break;
      case "risk-disclosure":
        items = Array.from(this.riskDisclosures.values());
        break;
      case "alternative-disclosure":
        items = Array.from(this.alternativeDisclosures.values());
        break;
      case "procedure-definition":
        items = this.listProcedures();
        break;
      case "decision-rule":
        items = this.getDecisionRules();
        break;
      default:
        items = [];
    }

    const filtered = items.filter((item) => this.matchesFilters(item, filters));
    const scored = filtered.map((item) => ({
      item,
      score: filters.q ? scoreContent(item, filters.q) : 1,
    }));

    const results = scored
      .filter((entry) => !filters.q || entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.titleEn.localeCompare(b.item.titleEn))
      .map((entry) => entry.item);

    return {
      items: results as T[],
      total: results.length,
      filters,
      facets: buildFacets(items),
    };
  }

  private matchesFilters(item: ClinicalContentItem, filters: ContentSearchFilters): boolean {
    if (filters.category && "category" in item) {
      const category = (item as unknown as { category: string }).category;
      if (category !== filters.category) return false;
    }
    if (filters.specialty && "specialty" in item) {
      const specialty = (item as unknown as { specialty: string }).specialty;
      if (specialty !== filters.specialty) return false;
    }
    if (filters.riskLevel && "riskLevel" in item) {
      const riskLevel = (item as unknown as { riskLevel: RiskLevel }).riskLevel;
      if (riskLevel !== filters.riskLevel) return false;
    }
    if (filters.status && item.status !== filters.status) return false;
    if (filters.language && item.language !== filters.language) return false;
    return true;
  }
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreContent(item: ClinicalContentItem, query: string): number {
  const q = normalize(query);
  if (!q) return 1;

  const haystack = normalize(
    [item.titleEn, item.titleAr, item.governanceOwner, ...(item.tags || [])].join(" "),
  );

  const terms = q.split(" ").filter(Boolean);
  let score = 0;
  for (const term of terms) {
    if (normalize(item.titleEn).includes(term)) score += 10;
    if (normalize(item.titleAr).includes(term)) score += 10;
    if (haystack.includes(term)) score += 4;
  }
  return score;
}

function buildFacets(items: ClinicalContentItem[]) {
  const specialties = Array.from(
    new Set(
      items
        .filter((i): i is ClinicalContentItem & { specialty: string } => "specialty" in i)
        .map((i) => i.specialty),
    ),
  ).sort();

  const categories = Array.from(
    new Set(
      items
        .filter((i): i is ClinicalContentItem & { category: string } => "category" in i)
        .map((i) => i.category),
    ),
  ).sort();

  const riskLevels = Array.from(
    new Set(
      items
        .filter((i): i is ClinicalContentItem & { riskLevel: RiskLevel } => "riskLevel" in i)
        .map((i) => i.riskLevel),
    ),
  ).sort();

  const statuses = Array.from(new Set(items.map((i) => i.status))).sort();

  return { specialties, categories, riskLevels, statuses };
}

export const clinicalContentRegistry = new ClinicalContentRegistry();
