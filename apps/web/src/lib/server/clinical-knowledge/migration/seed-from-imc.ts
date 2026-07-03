/**
 * Migration Seed Adapter — IMC Approved Library → Clinical Knowledge Engine.
 *
 * Converts the static IMC approved consent library into tenant-scoped,
 * versioned CKE entities. The adapter is pure: it returns create inputs
 * without touching the database so it can be run inside a Prisma transaction.
 */

import {
  imcApprovedConsentLibraryGenerated,
  type ImcApprovedConsentLibraryItem,
} from "@/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated";
import { normalizeSpecialty, type NormalizedSpecialty } from "./specialty-normalization";
import type {
  Prisma,
  ClinicalKnowledgeStatus,
  ClinicalKnowledgeConsentFormType,
  ClinicalKnowledgePackageItemType,
  ClinicalKnowledgeEducationAssetType,
  ClinicalKnowledgeRiskLevel,
  ClinicalKnowledgeGovernanceEntityType,
  ClinicalKnowledgeGovernanceEventType,
} from "@prisma/client";
import { ClinicalKnowledgeIllustrationStatus } from "@prisma/client";
import { BATCH_1_ILLUSTRATIONS, BATCH_2_GENERATED, BATCH_3_GENERATED, BATCH_4_GENERATED, BATCH_5_GENERATED } from "./figurelabs-batch-data";

const SEED_VERSION = "1.0.0";
const SEED_USER_ID = "system-migration";
const GOVERNANCE_OWNER = "IMC Consent Governance";

export interface ImcSeedPlan {
  tenantId: string;
  createdByUserId: string;
  specialties: Prisma.ClinicalSpecialtyCreateManyInput[];
  procedures: Prisma.ClinicalProcedureCreateManyInput[];
  consentForms: Array<{
    form: Prisma.ConsentFormCreateInput;
    sections: Prisma.ConsentFormSectionCreateManyInput[];
    sourceId: string;
  }>;
  educationMaterials: Prisma.EducationMaterialCreateManyInput[];
  riskDisclosures: Prisma.RiskDisclosureCreateManyInput[];
  illustrations: Prisma.ClinicalKnowledgeIllustrationCreateManyInput[];
  packages: Array<{
    package: Prisma.ClinicalKnowledgePackageCreateInput;
    items: Prisma.PackageItemCreateManyInput[];
    sourceId: string;
  }>;
  governanceEvents: Prisma.GovernanceEventCreateManyInput[];
  warnings: string[];
}

export interface ImcSeedOptions {
  tenantId: string;
  createdByUserId?: string;
  effectiveDate?: Date;
}

export function buildImcSeedPlan(options: ImcSeedOptions): ImcSeedPlan {
  const { tenantId, createdByUserId = SEED_USER_ID, effectiveDate = new Date("2026-06-01") } = options;

  const warnings: string[] = [];
  const specialtyByCode = new Map<string, NormalizedSpecialty>();
  const specialtyIdByCode = new Map<string, string>();
  const procedureByCode = new Map<string, Prisma.ClinicalProcedureCreateManyInput>();
  const formById = new Map<string, { form: Prisma.ConsentFormCreateInput; sections: Prisma.ConsentFormSectionCreateManyInput[]; sourceId: string }>();
  const educationById = new Map<string, Prisma.EducationMaterialCreateManyInput>();
  const riskById = new Map<string, Prisma.RiskDisclosureCreateManyInput>();
  const packages: Array<{ package: Prisma.ClinicalKnowledgePackageCreateInput; items: Prisma.PackageItemCreateManyInput[]; sourceId: string }> = [];
  const governanceEvents: Prisma.GovernanceEventCreateManyInput[] = [];

  // ── Phase 1: specialties ─────────────────────────────────────────────────
  for (const item of imcApprovedConsentLibraryGenerated) {
    const normalized = normalizeSpecialty(item.specialty);
    if (!specialtyByCode.has(normalized.code)) {
      specialtyByCode.set(normalized.code, normalized);
    }
  }

  for (const [code, normalized] of specialtyByCode) {
    const id = generateStableId(tenantId, "specialty", code);
    specialtyIdByCode.set(code, id);
  }

  // ── Phase 2: forms, education, risks, procedures ─────────────────────────
  for (const item of imcApprovedConsentLibraryGenerated) {
    const normalizedSpecialty = normalizeSpecialty(item.specialty);
    const specialtyId = specialtyIdByCode.get(normalizedSpecialty.code);
    if (!specialtyId) {
      warnings.push(`Missing specialty id for ${item.specialty} on ${item.id}`);
      continue;
    }

    const procedureId = generateStableId(tenantId, "procedure", item.id);
    const formId = generateStableId(tenantId, "form", item.id);
    const formVersion = versionFromImc(item.version);

    if (!procedureByCode.has(item.id)) {
      procedureByCode.set(item.id, {
        id: procedureId,
        tenantId,
        code: item.id,
        nameEn: item.titleEn,
        nameAr: item.titleAr || item.titleEn,
        shortNameEn: item.titleEn,
        shortNameAr: item.titleAr || item.titleEn,
        specialtyId,
        departmentName: item.department,
        categoryCode: item.categoryCode,
        anesthesiaRequired: item.anesthesiaRequired,
        keywords: item.keywords,
        externalMappings: { imcId: item.id, categoryCode: item.categoryCode },
        status: "active",
      });
    }

    if (!formById.has(item.id)) {
      const formStatus: ClinicalKnowledgeStatus = item.status === "ACTIVE" ? "PUBLISHED" : "DRAFT";
      formById.set(item.id, {
        sourceId: item.id,
        form: {
          id: formId,
          tenant: { connect: { id: tenantId } },
          code: item.id,
          titleEn: item.titleEn,
          titleAr: item.titleAr || item.titleEn,
          formType: normalizeConsentFormType(item.consentType),
          riskLevel: consentTypeToRiskLevel(item.consentType, item.anesthesiaRequired),
          status: formStatus,
          version: formVersion,
          effectiveDate,
          governanceSnapshot: {
            source: "imc-approved-library",
            imcVersion: item.version,
            owner: GOVERNANCE_OWNER,
          },
          pdfTemplateUrl: item.hospitalPdfFilename
            ? `/imc-consent-library/${encodeURIComponent(item.hospitalPdfFilename)}`
            : null,
          requiresWitness: item.anesthesiaRequired,
          requiresInterpreter: false,
          createdByUserId,
          publishedByUserId: createdByUserId,
        },
        sections: buildDefaultConsentSections(formId, tenantId, item),
      });
    }

    if (item.patientEducationPdfFilename && !educationById.has(item.id)) {
      educationById.set(item.id, {
        id: generateStableId(tenantId, "education", item.id),
        tenantId,
        code: `${item.id}-education`,
        titleEn: `${item.titleEn} — Patient Education`,
        titleAr: item.titleAr
          ? `${item.titleAr} — نسخة المريض`
          : `تثقيف المريض — ${item.titleEn}`,
        assetType: "PDF" as ClinicalKnowledgeEducationAssetType,
        assetUrl: `/imc-consent-library/${encodeURIComponent(item.patientEducationPdfFilename)}`,
        status: "PUBLISHED" as ClinicalKnowledgeStatus,
        version: SEED_VERSION,
        effectiveDate,
        governanceSnapshot: {
          source: "imc-approved-library",
          owner: "IMC Patient Education Governance",
        },
        createdByUserId,
        publishedByUserId: createdByUserId,
      });
    }

    if (!riskById.has(normalizedSpecialty.code)) {
      const riskId = generateStableId(tenantId, "risk", normalizedSpecialty.code);
      riskById.set(normalizedSpecialty.code, {
        id: riskId,
        tenantId,
        code: `${normalizedSpecialty.code}-general-risk`,
        titleEn: `General Risks — ${normalizedSpecialty.nameEn}`,
        titleAr: `المخاطر العامة — ${normalizedSpecialty.nameAr}`,
        descriptionEn:
          "Common risks include bleeding, infection, anesthesia reactions, and unexpected findings requiring additional procedures.",
        descriptionAr:
          "تشمل المخاطر الشائعة النزيف والعدوى وردود فعل التخدير والنتائج غير المتوقعة التي قد تتطلب إجراءات إضافية.",
        riskLevel: "STANDARD" as ClinicalKnowledgeRiskLevel,
        incidenceRate: "Variable by patient factors",
        specialtyIds: [specialtyId],
        status: "PUBLISHED" as ClinicalKnowledgeStatus,
        version: SEED_VERSION,
        effectiveDate,
        governanceSnapshot: {
          source: "imc-approved-library",
          owner: GOVERNANCE_OWNER,
        },
        createdByUserId,
        publishedByUserId: createdByUserId,
      });
    }
  }

  // ── Phase 2.5: approved educational illustrations ─────────────────────────
  const illustrationByProcedureId = buildIllustrationInputs({
    tenantId,
    procedureByCode,
    createdByUserId,
    effectiveDate,
  });

  // ── Phase 3: packages and items ──────────────────────────────────────────
  for (const item of imcApprovedConsentLibraryGenerated) {
    const procedure = procedureByCode.get(item.id);
    const formEntry = formById.get(item.id);
    if (!procedure || !formEntry) {
      warnings.push(`Cannot build package for ${item.id}: missing procedure or form`);
      continue;
    }

    const normalizedSpecialty = normalizeSpecialty(item.specialty);
    const risk = riskById.get(normalizedSpecialty.code);
    const education = educationById.get(item.id);

    const packageId = generateStableId(tenantId, "package", item.id);
    const packageVersion = SEED_VERSION;
    const packageStatus: ClinicalKnowledgeStatus = "PUBLISHED";

    const packageItems: Prisma.PackageItemCreateManyInput[] = [];
    let order = 1;

    packageItems.push({
      id: generateStableId(tenantId, "pi", `${item.id}-form`),
      tenantId,
      packageId,
      itemType: "CONSENT_FORM" as ClinicalKnowledgePackageItemType,
      itemId: formEntry.form.id as string,
      orderIndex: order++,
      isRequired: true,
    });

    if (education?.id) {
      packageItems.push({
        id: generateStableId(tenantId, "pi", `${item.id}-education`),
        tenantId,
        packageId,
        itemType: "EDUCATION_MATERIAL" as ClinicalKnowledgePackageItemType,
        itemId: education.id,
        orderIndex: order++,
        isRequired: false,
      });
    }

    if (risk?.id) {
      packageItems.push({
        id: generateStableId(tenantId, "pi", `${item.id}-risk`),
        tenantId,
        packageId,
        itemType: "RISK_DISCLOSURE" as ClinicalKnowledgePackageItemType,
        itemId: risk.id,
        orderIndex: order++,
        isRequired: true,
      });
    }

    const pkg: Prisma.ClinicalKnowledgePackageCreateInput = {
      id: packageId,
      tenant: { connect: { id: tenantId } },
      procedure: { connect: { id: procedure.id } },
      version: packageVersion,
      versionMajor: 1,
      versionMinor: 0,
      versionPatch: 0,
      effectiveDate,
      status: packageStatus,
      governanceSnapshot: {
        source: "imc-approved-library",
        imcVersion: item.version,
        owner: GOVERNANCE_OWNER,
      },
      requiredParticipantsSnapshot: {
        witness: item.anesthesiaRequired,
        interpreter: false,
        guardian: false,
      },
      packageSnapshot: {
        procedureCode: item.id,
        formIds: [formEntry.form.id as string],
        educationIds: education?.id ? [education.id] : [],
        riskIds: risk?.id ? [risk.id] : [],
      },
      createdByUserId,
      publishedByUserId: createdByUserId,
    };

    packages.push({ package: pkg, items: packageItems, sourceId: item.id });

    governanceEvents.push(buildGovernanceEvent(tenantId, "PACKAGE", packageId, "PUBLISHED", createdByUserId));
  }

  // Governance events for published forms, education, risks
  for (const entry of formById.values()) {
    governanceEvents.push(buildGovernanceEvent(tenantId, "FORM", entry.form.id as string, "PUBLISHED", createdByUserId));
  }
  for (const education of educationById.values()) {
    if (education.id) {
      governanceEvents.push(buildGovernanceEvent(tenantId, "EDUCATION", education.id, "PUBLISHED", createdByUserId));
    }
  }
  for (const risk of riskById.values()) {
    if (risk.id) {
      governanceEvents.push(buildGovernanceEvent(tenantId, "RISK", risk.id, "PUBLISHED", createdByUserId));
    }
  }
  for (const procedure of procedureByCode.values()) {
    governanceEvents.push(buildGovernanceEvent(tenantId, "PROCEDURE", procedure.id as string, "PUBLISHED", createdByUserId));
  }

  return {
    tenantId,
    createdByUserId,
    specialties: Array.from(specialtyByCode.entries()).map(([code, normalized]) => ({
      id: specialtyIdByCode.get(code) as string,
      tenantId,
      code,
      nameEn: normalized.nameEn,
      nameAr: normalized.nameAr,
      status: "active",
    })),
    procedures: Array.from(procedureByCode.values()),
    consentForms: Array.from(formById.values()),
    educationMaterials: Array.from(educationById.values()),
    riskDisclosures: Array.from(riskById.values()),
    illustrations: Array.from(illustrationByProcedureId.values()),
    packages,
    governanceEvents,
    warnings,
  };
}

function buildDefaultConsentSections(
  formId: string,
  tenantId: string,
  item: ImcApprovedConsentLibraryItem,
): Prisma.ConsentFormSectionCreateManyInput[] {
  return [
    {
      id: generateStableId(tenantId, "section", `${item.id}-header`),
      tenantId,
      formId,
      type: "header",
      orderIndex: 1,
      titleEn: item.titleEn,
      titleAr: item.titleAr || item.titleEn,
      contentEn: `Consent for ${item.titleEn}`,
      contentAr: `موافقة على ${item.titleAr || item.titleEn}`,
      isRequired: true,
      isEditableByPhysician: false,
    },
    {
      id: generateStableId(tenantId, "section", `${item.id}-ack`),
      tenantId,
      formId,
      type: "acknowledgment",
      orderIndex: 99,
      titleEn: "Patient Acknowledgment",
      titleAr: "إقرار المريض",
      contentEn:
        "I acknowledge that the procedure, risks, and alternatives have been explained to me.",
      contentAr: "أقر بأنه تم شرح الإجراء والمخاطر والبدائل لي.",
      isRequired: true,
      isEditableByPhysician: false,
    },
  ];
}

function buildGovernanceEvent(
  tenantId: string,
  entityType: ClinicalKnowledgeGovernanceEntityType,
  entityId: string,
  eventType: ClinicalKnowledgeGovernanceEventType,
  actorUserId: string,
): Prisma.GovernanceEventCreateManyInput {
  const now = new Date();
  const payload = `${entityType}:${entityId}:${eventType}:${now.toISOString()}:${actorUserId}`;
  return {
    id: generateStableId(tenantId, "gov", `${entityType}-${entityId}-${eventType}`),
    tenantId,
    entityType,
    entityId,
    eventType,
    actorUserId,
    actorRole: "system-migration",
    comment: "Auto-published from IMC approved library during migration.",
    metadata: { source: "imc-migration", migratedAt: now.toISOString() },
    eventHash: simpleHash(payload),
    createdAt: now,
  };
}

function generateStableId(tenantId: string, entity: string, key: string): string {
  // Deterministic, URL-safe UUID-like identifier. Not cryptographically secure,
  // but stable across re-runs for the same tenant + entity + key.
  const payload = `${tenantId}:${entity}:${key}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${entity}-${hex}-${hashString(key).slice(0, 8)}`;
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function simpleHash(input: string): string {
  return hashString(input).padStart(8, "0");
}

function versionFromImc(imcVersion: string): string {
  const digits = imcVersion.replace(/\D/g, "");
  if (digits.length >= 2) {
    return `${digits[0]}.${digits.slice(1).padStart(1, "0")}.0`;
  }
  return SEED_VERSION;
}

function normalizeConsentFormType(consentType: string): ClinicalKnowledgeConsentFormType {
  switch (consentType) {
    case "PROCEDURE_CONSENT":
      return "PROCEDURE_CONSENT";
    case "ANESTHESIA_CONSENT":
      return "ANESTHESIA_CONSENT";
    case "BLOOD_TRANSFUSION_CONSENT":
      return "BLOOD_TRANSFUSION_CONSENT";
    case "HIGH_RISK_PROCEDURE_CONSENT":
      return "HIGH_RISK_PROCEDURE_CONSENT";
    case "DIAGNOSTIC_IMAGING_CONSENT":
      return "DIAGNOSTIC_IMAGING_CONSENT";
    case "RESEARCH_CLINICAL_TRIAL_CONSENT":
      return "RESEARCH_CLINICAL_TRIAL_CONSENT";
    case "TELEMEDICINE_CONSENT":
      return "TELEMEDICINE_CONSENT";
    case "VACCINATION_CONSENT":
      return "VACCINATION_CONSENT";
    default:
      return "PROCEDURE_CONSENT";
  }
}

function consentTypeToRiskLevel(
  consentType: string,
  anesthesiaRequired: boolean,
): ClinicalKnowledgeRiskLevel {
  if (consentType === "ANESTHESIA_CONSENT") return "HIGH";
  if (anesthesiaRequired) return "HIGH";
  if (consentType === "BLOOD_TRANSFUSION_CONSENT") return "MEDIUM";
  return "STANDARD";
}

interface BuildIllustrationInputsOptions {
  tenantId: string;
  procedureByCode: Map<string, Prisma.ClinicalProcedureCreateManyInput>;
  createdByUserId: string;
  effectiveDate: Date;
}

function buildIllustrationInputs(
  options: BuildIllustrationInputsOptions,
): Map<string, Prisma.ClinicalKnowledgeIllustrationCreateManyInput> {
  const { tenantId, procedureByCode, createdByUserId, effectiveDate } = options;
  const illustrations = new Map<string, Prisma.ClinicalKnowledgeIllustrationCreateManyInput>();

  for (const [key, batch] of Object.entries(BATCH_1_ILLUSTRATIONS)) {
    const procedureCode = key === "laparoscopic-cholecystectomy" ? "imc-cholecystectomy-laparoscopic" : `imc-${key}`;
    const procedure = procedureByCode.get(procedureCode);
    if (!procedure || !procedure.id) continue;

    const publicImageUrl = batch.procedureImageUrl.replace(/^apps\/web\/public/, "");
    const id = generateStableId(tenantId, "illustration", procedureCode);

    illustrations.set(procedure.id as string, {
      id,
      tenantId,
      procedureId: procedure.id as string,
      procedureNameEn: batch.procedureNameEn,
      procedureNameAr: batch.procedureNameAr ?? "",
      specialty: batch.specialty?.nameEn ?? "",
      anatomyRegion: batch.anatomyRegion ?? "",
      anatomyImageUrl: null,
      procedureImageUrl: publicImageUrl,
      imageBaseUrl: batch.imageBaseUrl ? batch.imageBaseUrl.replace(/^apps\/web\/public/, "") : null,
      imageEnUrl: batch.imageEnUrl ? batch.imageEnUrl.replace(/^apps\/web\/public/, "") : null,
      imageArUrl: batch.imageArUrl ? batch.imageArUrl.replace(/^apps\/web\/public/, "") : null,
      labelsEn: batch.labelsEn ?? [],
      labelsAr: batch.labelsAr ?? [],
      languageDirection: batch.languageDirection ?? "both",
      productionStatus: batch.productionStatus ?? "approved",
      integrationStatus: batch.integrationStatus ?? "integrated",
      arabicReviewStatus: batch.arabicReviewStatus ?? "approved",
      synonyms: (batch.aliases ?? [batch.procedureNameEn, batch.procedureNameAr]).filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      ),
      anatomyPromptEn: null,
      anatomyPromptAr: null,
      procedurePromptEn: `${batch.procedureNameEn} — anatomy and procedure overview.`,
      procedurePromptAr: `${batch.procedureNameAr ?? batch.procedureNameEn} — نظرة عامة على التشريح والإجراء.`,
      patientDisplayDisclaimerEn:
        "This illustration is for patient education only and does not replace the physician’s explanation.",
      patientDisplayDisclaimerAr:
        "هذه الصورة لأغراض التثقيف فقط ولا تُغني عن شرح الطبيب المعالج.",
      source: "FigureLabs",
      version: "v1",
      patientFacing: batch.patientFacing,
      imageReviewStatus: ClinicalKnowledgeIllustrationStatus.approved,
      reviewedBy: "FigureLabs Medical Review",
      reviewedAt: effectiveDate,
      effectiveDate,
      createdByUserId,
    });
  }

  for (const [key, batch] of Object.entries(BATCH_2_GENERATED)) {
    const procedureCode = `imc-${key}`;
    const procedure = procedureByCode.get(procedureCode);
    if (!procedure || !procedure.id) continue;
    if (illustrations.has(procedure.id as string)) continue;

    const publicImageUrl = batch.procedureImageUrl.replace(/^apps\/web\/public/, "");
    const id = generateStableId(tenantId, "illustration", procedureCode);

    illustrations.set(procedure.id as string, {
      id,
      tenantId,
      procedureId: procedure.id as string,
      procedureNameEn: batch.procedureNameEn,
      procedureNameAr: batch.procedureNameAr ?? "",
      specialty: batch.specialty?.nameEn ?? "",
      anatomyRegion: batch.anatomyRegion ?? "",
      anatomyImageUrl: null,
      procedureImageUrl: publicImageUrl,
      imageBaseUrl: batch.imageBaseUrl ? batch.imageBaseUrl.replace(/^apps\/web\/public/, "") : publicImageUrl,
      imageEnUrl: batch.imageEnUrl ? batch.imageEnUrl.replace(/^apps\/web\/public/, "") : publicImageUrl,
      imageArUrl: batch.imageArUrl ? batch.imageArUrl.replace(/^apps\/web\/public/, "") : null,
      labelsEn: batch.labelsEn ?? [],
      labelsAr: batch.labelsAr ?? [],
      languageDirection: batch.languageDirection ?? "both",
      productionStatus: batch.productionStatus ?? "generated_by_chatgpt_draft",
      integrationStatus: batch.integrationStatus ?? "provisionally_integrated",
      arabicReviewStatus: batch.arabicReviewStatus ?? "pending_clinical_translation_review",
      synonyms: (batch.aliases ?? [batch.procedureNameEn, batch.procedureNameAr]).filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      ),
      anatomyPromptEn: null,
      anatomyPromptAr: null,
      procedurePromptEn: `${batch.procedureNameEn} — anatomy and procedure overview.`,
      procedurePromptAr: `${batch.procedureNameAr ?? batch.procedureNameEn} — نظرة عامة على التشريح والإجراء.`,
      patientDisplayDisclaimerEn:
        "This illustration is for patient education only and does not replace the physician’s explanation.",
      patientDisplayDisclaimerAr:
        "هذه الصورة لأغراض التثقيف فقط ولا تُغني عن شرح الطبيب المعالج.",
      source: "ChatGPT",
      version: "v1",
      patientFacing: batch.patientFacing,
      imageReviewStatus: ClinicalKnowledgeIllustrationStatus.pending_clinical_review,
      reviewedBy: null,
      reviewedAt: null,
      effectiveDate,
      createdByUserId,
    });
  }

  for (const [key, batch] of Object.entries(BATCH_3_GENERATED)) {
    const procedureCode = `imc-${key}`;
    const procedure = procedureByCode.get(procedureCode);
    if (!procedure || !procedure.id) continue;
    if (illustrations.has(procedure.id as string)) continue;

    const publicImageUrl = batch.procedureImageUrl.replace(/^apps\/web\/public/, "");
    const id = generateStableId(tenantId, "illustration", procedureCode);

    illustrations.set(procedure.id as string, {
      id,
      tenantId,
      procedureId: procedure.id as string,
      procedureNameEn: batch.procedureNameEn,
      procedureNameAr: batch.procedureNameAr ?? "",
      specialty: batch.specialty?.nameEn ?? "",
      anatomyRegion: batch.anatomyRegion ?? "",
      anatomyImageUrl: null,
      procedureImageUrl: publicImageUrl,
      imageBaseUrl: batch.imageBaseUrl ? batch.imageBaseUrl.replace(/^apps\/web\/public/, "") : publicImageUrl,
      imageEnUrl: batch.imageEnUrl ? batch.imageEnUrl.replace(/^apps\/web\/public/, "") : publicImageUrl,
      imageArUrl: batch.imageArUrl ? batch.imageArUrl.replace(/^apps\/web\/public/, "") : null,
      labelsEn: batch.labelsEn ?? [],
      labelsAr: batch.labelsAr ?? [],
      languageDirection: batch.languageDirection ?? "both",
      productionStatus: batch.productionStatus ?? "generated_by_chatgpt_draft",
      integrationStatus: batch.integrationStatus ?? "provisionally_integrated",
      arabicReviewStatus: batch.arabicReviewStatus ?? "pending_clinical_translation_review",
      synonyms: (batch.aliases ?? [batch.procedureNameEn, batch.procedureNameAr]).filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      ),
      anatomyPromptEn: null,
      anatomyPromptAr: null,
      procedurePromptEn: `${batch.procedureNameEn} — anatomy and procedure overview.`,
      procedurePromptAr: `${batch.procedureNameAr ?? batch.procedureNameEn} — نظرة عامة على التشريح والإجراء.`,
      patientDisplayDisclaimerEn:
        "This illustration is for patient education only and does not replace the physician’s explanation.",
      patientDisplayDisclaimerAr:
        "هذه الصورة لأغراض التثقيف فقط ولا تُغني عن شرح الطبيب المعالج.",
      source: "ChatGPT",
      version: "v1",
      patientFacing: batch.patientFacing,
      imageReviewStatus: ClinicalKnowledgeIllustrationStatus.pending_clinical_review,
      reviewedBy: null,
      reviewedAt: null,
      effectiveDate,
      createdByUserId,
    });
  }

  for (const [key, batch] of Object.entries(BATCH_4_GENERATED)) {
    const procedureCode = `imc-${key}`;
    const procedure = procedureByCode.get(procedureCode);
    if (!procedure || !procedure.id) continue;
    if (illustrations.has(procedure.id as string)) continue;

    const publicImageUrl = batch.procedureImageUrl.replace(/^apps\/web\/public/, "");
    const id = generateStableId(tenantId, "illustration", procedureCode);

    illustrations.set(procedure.id as string, {
      id,
      tenantId,
      procedureId: procedure.id as string,
      procedureNameEn: batch.procedureNameEn,
      procedureNameAr: batch.procedureNameAr ?? "",
      specialty: batch.specialty?.nameEn ?? "",
      anatomyRegion: batch.anatomyRegion ?? "",
      anatomyImageUrl: null,
      procedureImageUrl: publicImageUrl,
      imageBaseUrl: batch.imageBaseUrl ? batch.imageBaseUrl.replace(/^apps\/web\/public/, "") : publicImageUrl,
      imageEnUrl: batch.imageEnUrl ? batch.imageEnUrl.replace(/^apps\/web\/public/, "") : publicImageUrl,
      imageArUrl: batch.imageArUrl ? batch.imageArUrl.replace(/^apps\/web\/public/, "") : null,
      labelsEn: batch.labelsEn ?? [],
      labelsAr: batch.labelsAr ?? [],
      languageDirection: batch.languageDirection ?? "both",
      productionStatus: batch.productionStatus ?? "generated_by_chatgpt_draft",
      integrationStatus: batch.integrationStatus ?? "provisionally_integrated",
      arabicReviewStatus: batch.arabicReviewStatus ?? "pending_clinical_translation_review",
      synonyms: (batch.aliases ?? [batch.procedureNameEn, batch.procedureNameAr]).filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      ),
      anatomyPromptEn: null,
      anatomyPromptAr: null,
      procedurePromptEn: `${batch.procedureNameEn} — anatomy and procedure overview.`,
      procedurePromptAr: `${batch.procedureNameAr ?? batch.procedureNameEn} — نظرة عامة على التشريح والإجراء.`,
      patientDisplayDisclaimerEn:
        "This illustration is for patient education only and does not replace the physician’s explanation.",
      patientDisplayDisclaimerAr:
        "هذه الصورة لأغراض التثقيف فقط ولا تُغني عن شرح الطبيب المعالج.",
      source: "ChatGPT",
      version: "v1",
      patientFacing: batch.patientFacing,
      imageReviewStatus: ClinicalKnowledgeIllustrationStatus.pending_clinical_review,
      reviewedBy: null,
      reviewedAt: null,
      effectiveDate,
      createdByUserId,
    });
  }

  for (const [key, batch] of Object.entries(BATCH_5_GENERATED)) {
    const procedureCode = `imc-${key}`;
    const procedure = procedureByCode.get(procedureCode);
    if (!procedure || !procedure.id) continue;
    if (illustrations.has(procedure.id as string)) continue;

    const publicImageUrl = batch.procedureImageUrl.replace(/^apps\/web\/public/, "");
    const id = generateStableId(tenantId, "illustration", procedureCode);

    illustrations.set(procedure.id as string, {
      id,
      tenantId,
      procedureId: procedure.id as string,
      procedureNameEn: batch.procedureNameEn,
      procedureNameAr: batch.procedureNameAr ?? "",
      specialty: batch.specialty?.nameEn ?? "",
      anatomyRegion: batch.anatomyRegion ?? "",
      anatomyImageUrl: null,
      procedureImageUrl: publicImageUrl,
      imageBaseUrl: batch.imageBaseUrl ? batch.imageBaseUrl.replace(/^apps\/web\/public/, "") : publicImageUrl,
      imageEnUrl: batch.imageEnUrl ? batch.imageEnUrl.replace(/^apps\/web\/public/, "") : publicImageUrl,
      imageArUrl: batch.imageArUrl ? batch.imageArUrl.replace(/^apps\/web\/public/, "") : null,
      labelsEn: batch.labelsEn ?? [],
      labelsAr: batch.labelsAr ?? [],
      languageDirection: batch.languageDirection ?? "both",
      productionStatus: batch.productionStatus ?? "generated_by_chatgpt_draft",
      integrationStatus: batch.integrationStatus ?? "provisionally_integrated",
      arabicReviewStatus: batch.arabicReviewStatus ?? "pending_clinical_translation_review",
      synonyms: (batch.aliases ?? [batch.procedureNameEn, batch.procedureNameAr]).filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      ),
      anatomyPromptEn: null,
      anatomyPromptAr: null,
      procedurePromptEn: `${batch.procedureNameEn} — anatomy and procedure overview.`,
      procedurePromptAr: `${batch.procedureNameAr ?? batch.procedureNameEn} — نظرة عامة على التشريح والإجراء.`,
      patientDisplayDisclaimerEn:
        "This illustration is for patient education only and does not replace the physician’s explanation.",
      patientDisplayDisclaimerAr:
        "هذه الصورة لأغراض التثقيف فقط ولا تُغني عن شرح الطبيب المعالج.",
      source: "ChatGPT",
      version: "v1",
      patientFacing: batch.patientFacing,
      imageReviewStatus: ClinicalKnowledgeIllustrationStatus.pending_clinical_review,
      reviewedBy: null,
      reviewedAt: null,
      effectiveDate,
      createdByUserId,
    });
  }

  return illustrations;
}

export function countSeedPlan(plan: ImcSeedPlan): Record<string, number> {
  return {
    specialties: plan.specialties.length,
    procedures: plan.procedures.length,
    consentForms: plan.consentForms.length,
    consentFormSections: plan.consentForms.reduce((sum, f) => sum + f.sections.length, 0),
    educationMaterials: plan.educationMaterials.length,
    riskDisclosures: plan.riskDisclosures.length,
    illustrations: plan.illustrations.length,
    packages: plan.packages.length,
    packageItems: plan.packages.reduce((sum, p) => sum + p.items.length, 0),
    governanceEvents: plan.governanceEvents.length,
    warnings: plan.warnings.length,
  };
}
