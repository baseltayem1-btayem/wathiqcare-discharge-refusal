/**
 * Content Mapping Service — production integration layer.
 *
 * Resolves a clinical procedure to an approved consent template and optional
 * patient education asset. Resolution is fail-closed and uses the following
 * priority:
 * 1. Explicit mapping by procedure id
 * 2. Explicit mapping by procedure/form code
 * 3. Explicit alias mapping
 * 4. Exact title match as a last resort
 */

import { getPrisma } from "@/lib/server/prisma";
import {
  imcApprovedConsentLibraryGenerated,
  type ImcApprovedConsentLibraryItem,
} from "@/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated";

export type ImcConsentCatalogItem = {
  id: string;
  titleEn: string;
  titleAr: string;
  fileName: string;
  publicPath: string;
  specialty: string;
  templateType: string;
  status: "ACTIVE";
  source: string;
  requiresAnesthesia: boolean;
  isPatientCopy: boolean;
  isEducation: boolean;
  isAnesthesia: boolean;
  lengthBytes: number;
};

export type ImcConsentPackage = {
  procedureConsent?: ImcConsentCatalogItem;
  patientEducation?: ImcConsentCatalogItem;
  anesthesiaConsent?: ImcConsentCatalogItem;
  anesthesiaEducation?: ImcConsentCatalogItem;
  matches: ImcConsentCatalogItem[];
};

export type MappedConsentForm = {
  templateId: string;
  templateVersionId: string;
  templateCode: string;
  fileName: string;
  publicPath: string;
  titleEn: string;
  titleAr: string;
  version?: string;
  effectiveDate?: string | null;
  approvalStatus?: "APPROVED" | "ACTIVE";
  sourcePath?: string | null;
  checksum?: string | null;
  sections?: Array<{
    id: string;
    sectionKey: string;
    sectionKind: string;
    titleAr: string;
    titleEn: string;
    contentAr: string;
    contentEn: string;
    isRequired: boolean;
    isEditableByPhysician: boolean;
    sortOrder: number;
  }>;
  kind: "CONSENT_FORM";
  status: "APPROVED";
};

export type MappedEducationMaterial = {
  educationId: string;
  assetId: string;
  fileName: string;
  publicPath: string;
  titleEn: string;
  titleAr: string;
  kind: "EDUCATION_MATERIAL";
  assetType: "PDF";
  durationMinutes: number | null;
};

export type ContentMappingFound = {
  found: true;
  procedureCatalogId: string | null;
  procedureId: string;
  procedureNameEn: string;
  procedureNameAr: string;
  specialty: string;
  department: string;
  categoryCode: string;
  consentType: string;
  consentCategory: string;
  language: string;
  version: string;
  anesthesiaRequired: boolean;
  consentForm: MappedConsentForm;
  educationMaterial: MappedEducationMaterial | null;
};

export type ContentMappingNotFound = {
  found: false;
  procedureName: string;
  availableProcedures: string[];
};

export type ContentMappingResult = ContentMappingFound | ContentMappingNotFound;

export type ContentMappingInput = {
  procedure: string;
  tenantId: string;
  procedureId?: string;
  procedureCode?: string;
  categoryCode?: string;
  preferredLanguage?: "en" | "ar" | "bilingual";
};

type ApprovedTemplateSection = {
  id: string;
  sectionKey: string;
  sectionKind: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  isRequired: boolean;
  isEditableByPhysician: boolean;
  sortOrder: number;
};

export type ApprovedProcedureConsentLink = {
  procedureId: string;
  procedureCode: string;
  procedureNameEn: string;
  procedureNameAr: string;
  approvedConsentFormId: string;
  approvedTemplateId: string;
  approvedTemplateVersionId: string;
  templateCode: string;
  titleEn: string;
  titleAr: string;
  specialty: string;
  department: string;
  language: string;
  approvalStatus: "APPROVED" | "ACTIVE";
  version: string;
  versionNumber: number;
  effectiveDate: string | null;
  sourcePath: string | null;
  checksum: string | null;
  resolutionPriority: "procedureId" | "templateCode" | "alias" | "title";
  matchedRuleId?: string;
  formCode?: string | null;
  sections: ApprovedTemplateSection[];
};

type ApprovedTemplateDirectoryEntry = {
  id: string;
  templateCode: string;
  titleEn: string;
  titleAr: string;
  specialty: string;
  department: string | null;
  status: string;
  metadata: unknown;
  currentVersion: {
    id: string;
    versionLabel: string;
    versionNumber: number;
    approvedAt: Date | null;
    effectiveFrom: Date | null;
    legalHash: string | null;
    sections: ApprovedTemplateSection[];
  } | null;
};

type ResolvedProcedureContext = {
  procedureId: string;
  procedureCode: string;
  procedureNameEn: string;
  procedureNameAr: string;
  categoryCode: string;
  department: string;
  formCode: string | null;
  formId: string | null;
  formTitleEn: string | null;
  formTitleAr: string | null;
  formStatus: string | null;
  formVersion: string | null;
  formEffectiveDate: Date | null;
  pdfTemplateUrl: string | null;
  governanceSnapshot: unknown;
};

type ExplicitApprovedMappingRule = {
  id: string;
  approvedTemplateCode: string;
  procedureIds?: string[];
  procedureCodes?: string[];
  formCodes?: string[];
  categoryCodes?: string[];
  procedureCodeContains?: string[];
  procedureNameContains?: string[];
  aliases?: string[];
};

export type ApprovedProcedureVerificationRow = {
  procedure: ResolvedProcedureContext;
  approvedLink: ApprovedProcedureConsentLink | null;
};

const EXPLICIT_APPROVED_MAPPING_RULES: ExplicitApprovedMappingRule[] = [
  {
    id: "anesthesia-patient-consent",
    approvedTemplateCode: "ANESTHESIA_CONSENT",
    procedureCodes: ["imc-anesthesia-patient-consent"],
    formCodes: ["imc-anesthesia-patient-consent"],
    aliases: ["anesthesia - patient consent", "anesthesia patient consent"],
  },
  {
    id: "blood-transfusion-consent",
    approvedTemplateCode: "BLOOD_AND_PRODUCTS_TRANSFUSION_CONSENT",
    procedureCodes: [
      "imc-blood-and-blood-products-transfusion",
      "imc-blood-and-blood-products-transfusion-consent",
    ],
    formCodes: [
      "imc-blood-and-blood-products-transfusion",
      "imc-blood-and-blood-products-transfusion-consent",
    ],
    aliases: [
      "blood and blood products transfusion",
      "blood and blood products transfusion consent",
    ],
  },
  {
    id: "research-family-consent",
    approvedTemplateCode: "RESEARCH_PARTICIPATION_CONSENT",
    categoryCodes: ["RESEARCH"],
    procedureCodeContains: ["research", "trial"],
    procedureNameContains: ["research", "trial"],
  },
  {
    id: "chemotherapy-family-consent",
    approvedTemplateCode: "CHEMOTHERAPY_CONSENT",
    categoryCodes: ["ONCOLOGY_HEMATOLOGY"],
    procedureCodeContains: ["chemotherapy"],
    procedureNameContains: ["chemotherapy"],
  },
  {
    id: "radiotherapy-family-consent",
    approvedTemplateCode: "RADIOTHERAPY_CONSENT",
    procedureCodeContains: ["radiotherapy"],
    procedureNameContains: ["radiotherapy"],
  },
  {
    id: "procedural-sedation-family-consent",
    approvedTemplateCode: "PROCEDURAL_SEDATION_CONSENT",
    procedureCodeContains: ["sedation"],
    procedureNameContains: ["sedation"],
  },
  {
    id: "contrast-radiology-family-consent",
    approvedTemplateCode: "CONTRAST_MEDIA_RADIOLOGICAL_PROCEDURE_CONSENT",
    procedureCodeContains: ["ct-", "ct-", "mri", "contrast", "radiology", "fluoroscopy", "mammography"],
    procedureNameContains: [
      "computed tomography",
      "ct ",
      "mri",
      "contrast",
      "radiological",
      "radiology",
      "fluoroscopy",
      "mammography",
    ],
  },
  {
    id: "interventional-family-consent",
    approvedTemplateCode: "SPECIAL_INTERVENTIONAL_PROCEDURE_CONSENT",
    categoryCodes: ["INTERVENTIONAL_RADIOLOGY", "GASTRO_ENDOSCOPY", "UROLOGY"],
    procedureCodeContains: [
      "angiogram",
      "angioplasty",
      "stent",
      "thrombectomy",
      "drainage",
      "biopsy",
      "aspiration",
      "endoscopy",
      "colonoscopy",
      "ercp",
      "cystoscopy",
      "ureteroscopy",
      "hysteroscopy",
      "nephrostomy",
      "gastrostomy",
      "catheter",
      "embolization",
      "ablation",
      "fistulogram",
      "pyelogram",
      "puncture",
      "sampling",
    ],
    procedureNameContains: [
      "angiogram",
      "angioplasty",
      "stent",
      "thrombectomy",
      "drainage",
      "biopsy",
      "aspiration",
      "endoscopy",
      "colonoscopy",
      "ercp",
      "cystoscopy",
      "ureteroscopy",
      "hysteroscopy",
      "nephrostomy",
      "gastrostomy",
      "catheter",
      "embolization",
      "ablation",
      "fistulogram",
      "pyelogram",
      "puncture",
      "sampling",
    ],
  },
  {
    id: "general-treatment-family-consent",
    approvedTemplateCode: "GENERAL_TREATMENT_CONSENT",
    categoryCodes: ["ALLERGY_IMMUNOLOGY"],
    procedureCodeContains: ["immunotherapy", "skin-test", "drug-challenge", "telemedicine"],
    procedureNameContains: ["immunotherapy", "skin test", "drug challenge", "telemedicine"],
  },
  {
    id: "surgical-family-consent",
    approvedTemplateCode: "SURGICAL_PROCEDURE_CONSENT",
    categoryCodes: ["GENERAL_SURGERY", "ENT", "OB_GYN", "OPHTHALMOLOGY", "VASCULAR_SURGERY"],
    procedureCodeContains: [
      "ectomy",
      "otomy",
      "oplasty",
      "resection",
      "amputation",
      "thyroidectomy",
      "caesarean",
      "cesarean",
      "mastoidectomy",
      "septoplasty",
      "turbinectomy",
      "microlaryngoscopy",
      "otoplasty",
      "aneurysm",
    ],
    procedureNameContains: [
      "ectomy",
      "otomy",
      "oplasty",
      "resection",
      "amputation",
      "thyroidectomy",
      "caesarean",
      "cesarean",
      "mastoidectomy",
      "septoplasty",
      "turbinectomy",
      "microlaryngoscopy",
      "otoplasty",
      "aneurysm",
      "surgical",
    ],
  },
];

const approvedTemplateDirectoryCache = new Map<string, Promise<ApprovedTemplateDirectoryEntry[]>>();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPublicPath(fileName: string): string {
  return `/imc-consent-library/${encodeURIComponent(fileName)}`;
}

function fileNameFromPublicPath(publicPath: string | null | undefined): string | null {
  const value = (publicPath || "").trim();
  if (!value) return null;
  const lastSegment = value.split("/").pop() || "";
  if (!lastSegment) return null;
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseVersionNumber(version: string | null | undefined): number {
  const match = (version || "").match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function consentTypeToCategory(consentType: string): string {
  switch (consentType) {
    case "ANESTHESIA_CONSENT":
      return "Anesthesia Consent";
    case "BLOOD_TRANSFUSION_CONSENT":
      return "Blood Transfusion Consent";
    case "DIAGNOSTIC_IMAGING_CONSENT":
      return "Radiology Consent";
    case "RESEARCH_CLINICAL_TRIAL_CONSENT":
      return "Research Consent";
    case "PROCEDURE_CONSENT":
    default:
      return "Surgical Consent";
  }
}

function templateCodeToConsentType(templateCode: string): string {
  if (templateCode.includes("ANESTHESIA")) return "ANESTHESIA_CONSENT";
  if (templateCode.includes("BLOOD") || templateCode.includes("TRANSFUSION")) return "BLOOD_TRANSFUSION_CONSENT";
  if (templateCode.includes("RADIOLOGY") || templateCode.includes("CONTRAST")) return "DIAGNOSTIC_IMAGING_CONSENT";
  if (templateCode.includes("RESEARCH")) return "RESEARCH_CLINICAL_TRIAL_CONSENT";
  return "PROCEDURE_CONSENT";
}

function buildMappedConsentForm(
  item: ImcApprovedConsentLibraryItem | null,
  approvedLink: ApprovedProcedureConsentLink,
): MappedConsentForm {
  const fallbackFileName = fileNameFromPublicPath(approvedLink.sourcePath) || `${approvedLink.templateCode}.pdf`;
  return {
    templateId: approvedLink.approvedTemplateId,
    templateVersionId: approvedLink.approvedTemplateVersionId,
    templateCode: approvedLink.templateCode,
    fileName: item?.hospitalPdfFilename || fallbackFileName,
    publicPath: approvedLink.sourcePath || (item?.hospitalPdfFilename ? toPublicPath(item.hospitalPdfFilename) : ""),
    titleEn: approvedLink.titleEn,
    titleAr: approvedLink.titleAr,
    version: approvedLink.version,
    effectiveDate: approvedLink.effectiveDate,
    approvalStatus: approvedLink.approvalStatus,
    sourcePath: approvedLink.sourcePath,
    checksum: approvedLink.checksum,
    sections: approvedLink.sections,
    kind: "CONSENT_FORM",
    status: "APPROVED",
  };
}

function buildEducationMaterial(item: ImcApprovedConsentLibraryItem | null): MappedEducationMaterial | null {
  if (!item?.patientEducationPdfFilename) return null;
  return {
    educationId: `${item.id}-education`,
    assetId: `${item.id}-education-asset`,
    fileName: item.patientEducationPdfFilename,
    publicPath: toPublicPath(item.patientEducationPdfFilename),
    titleEn: `${item.titleEn} — Patient Education`,
    titleAr: item.titleAr ? `${item.titleAr} — نسخة المريض` : "نسخة تثقيف المريض",
    kind: "EDUCATION_MATERIAL",
    assetType: "PDF",
    durationMinutes: null,
  };
}

function buildCatalogItem(
  item: ImcApprovedConsentLibraryItem,
  options: { isEducation?: boolean; isAnesthesia?: boolean } = {},
): ImcConsentCatalogItem {
  const isEducation = options.isEducation ?? false;
  const isAnesthesia = options.isAnesthesia ?? false;
  const fileName = isEducation ? item.patientEducationPdfFilename || item.hospitalPdfFilename : item.hospitalPdfFilename;

  return {
    id: isEducation ? `${item.id}-education` : item.id,
    titleEn: isEducation ? `${item.titleEn} — Patient Education` : item.titleEn,
    titleAr: isEducation && item.titleAr ? `${item.titleAr} — نسخة المريض` : item.titleAr,
    fileName,
    publicPath: toPublicPath(fileName),
    specialty: item.specialty,
    templateType: consentTypeToCategory(item.consentType),
    status: "ACTIVE",
    source: "imc-approved-library",
    requiresAnesthesia: item.anesthesiaRequired,
    isPatientCopy: isEducation,
    isEducation,
    isAnesthesia,
    lengthBytes: 0,
  };
}

async function findActiveProcedureCatalog(
  tenantId: string,
  procedure: string,
): Promise<{ id: string; nameEn: string; nameAr: string } | null> {
  try {
    const prisma = getPrisma();
    const normalized = normalize(procedure);

    const catalog = await prisma.consentProcedureCatalog.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { nameEn: { equals: procedure, mode: "insensitive" } },
          { nameAr: { equals: procedure, mode: "insensitive" } },
          { procedureCode: { equals: procedure, mode: "insensitive" } },
        ],
      },
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { updatedAt: "desc" },
    });

    if (catalog) return catalog;

    const candidates = await prisma.consentProcedureCatalog.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, nameEn: true, nameAr: true },
    });

    return (
      candidates.find((candidate) => normalize(candidate.nameEn) === normalized) ||
      candidates.find((candidate) => normalize(candidate.nameEn).includes(normalized)) ||
      null
    );
  } catch {
    return null;
  }
}

async function resolveClinicalProcedureContext(
  input: ContentMappingInput,
): Promise<ResolvedProcedureContext | null> {
  const prisma = getPrisma();
  const procedure = await prisma.clinicalProcedure.findFirst({
    where: {
      tenantId: input.tenantId,
      OR: [
        ...(input.procedureId ? [{ id: input.procedureId }] : []),
        ...(input.procedureCode ? [{ code: input.procedureCode }] : []),
        { nameEn: { equals: input.procedure, mode: "insensitive" } },
        { nameAr: { equals: input.procedure, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      code: true,
      nameEn: true,
      nameAr: true,
      categoryCode: true,
      departmentName: true,
    },
  });

  if (!procedure) return null;

  const pkg = await prisma.clinicalKnowledgePackage.findFirst({
    where: {
      tenantId: input.tenantId,
      procedureId: procedure.id,
      status: "PUBLISHED",
      OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
    },
    orderBy: { effectiveDate: "desc" },
    include: {
      items: {
        where: { itemType: "CONSENT_FORM" },
        orderBy: { orderIndex: "asc" },
        take: 1,
      },
    },
  });

  let formCode: string | null = null;
  let linkedFormId: string | null = null;
  let formTitleEn: string | null = null;
  let formTitleAr: string | null = null;
  let formStatus: string | null = null;
  let formVersion: string | null = null;
  let formEffectiveDate: Date | null = null;
  let pdfTemplateUrl: string | null = null;
  let governanceSnapshot: unknown = null;
  const packageFormId = pkg?.items[0]?.itemId;
  if (packageFormId) {
    const form = await prisma.consentForm.findFirst({
      where: { tenantId: input.tenantId, id: packageFormId },
      select: {
        id: true,
        code: true,
        titleEn: true,
        titleAr: true,
        status: true,
        version: true,
        effectiveDate: true,
        pdfTemplateUrl: true,
        governanceSnapshot: true,
      },
    });
    linkedFormId = form?.id || null;
    formCode = form?.code || null;
    formTitleEn = form?.titleEn || null;
    formTitleAr = form?.titleAr || null;
    formStatus = form?.status || null;
    formVersion = form?.version || null;
    formEffectiveDate = form?.effectiveDate || null;
    pdfTemplateUrl = form?.pdfTemplateUrl || null;
    governanceSnapshot = form?.governanceSnapshot ?? null;
  }

  return {
    procedureId: procedure.id,
    procedureCode: procedure.code,
    procedureNameEn: procedure.nameEn,
    procedureNameAr: procedure.nameAr,
    categoryCode: procedure.categoryCode,
    department: procedure.departmentName,
    formCode,
    formId: linkedFormId,
    formTitleEn,
    formTitleAr,
    formStatus,
    formVersion,
    formEffectiveDate,
    pdfTemplateUrl,
    governanceSnapshot,
  };
}

function buildPublishedConsentFormLink(
  procedureContext: ResolvedProcedureContext,
): ApprovedProcedureConsentLink | null {
  if (!procedureContext.formId || !procedureContext.formCode || !procedureContext.pdfTemplateUrl) {
    return null;
  }

  const governance = asRecord(procedureContext.governanceSnapshot);
  const source = asString(governance.source);
  if (procedureContext.formStatus !== "PUBLISHED" || source !== "imc-approved-library") {
    return null;
  }

  return {
    procedureId: procedureContext.procedureId,
    procedureCode: procedureContext.procedureCode,
    procedureNameEn: procedureContext.procedureNameEn,
    procedureNameAr: procedureContext.procedureNameAr,
    approvedConsentFormId: procedureContext.formId,
    approvedTemplateId: procedureContext.formId,
    approvedTemplateVersionId: `${procedureContext.formId}:${procedureContext.formVersion || "1.0.0"}`,
    templateCode: procedureContext.formCode,
    titleEn: procedureContext.formTitleEn || procedureContext.procedureNameEn,
    titleAr: procedureContext.formTitleAr || procedureContext.procedureNameAr,
    specialty: "",
    department: procedureContext.department,
    language: "bilingual",
    approvalStatus: "ACTIVE",
    version: procedureContext.formVersion || "1.0.0",
    versionNumber: parseVersionNumber(procedureContext.formVersion),
    effectiveDate: procedureContext.formEffectiveDate?.toISOString() || null,
    sourcePath: procedureContext.pdfTemplateUrl,
    checksum: asString(governance.checksum) || asString(governance.checksumHash),
    resolutionPriority: "procedureId",
    matchedRuleId: "published-clinical-consent-form",
    formCode: procedureContext.formCode,
    sections: [],
  };
}

function resolveStaticItem(args: {
  procedure: string;
  procedureCode?: string;
  formCode?: string | null;
  procedureNameAr?: string;
}): ImcApprovedConsentLibraryItem | undefined {
  const normalizedProcedure = normalize(args.procedure);
  const normalizedProcedureCode = normalize(args.procedureCode || "");
  const normalizedFormCode = normalize(args.formCode || "");
  const normalizedAr = normalize(args.procedureNameAr || "");

  return (
    imcApprovedConsentLibraryGenerated.find((entry) => normalize(entry.id) === normalizedProcedureCode) ||
    imcApprovedConsentLibraryGenerated.find((entry) => normalize(entry.id) === normalizedFormCode) ||
    imcApprovedConsentLibraryGenerated.find((entry) => normalize(entry.titleEn) === normalizedProcedure) ||
    imcApprovedConsentLibraryGenerated.find((entry) => normalizedAr && normalize(entry.titleAr) === normalizedAr) ||
    imcApprovedConsentLibraryGenerated.find((entry) => normalize(entry.titleEn).includes(normalizedProcedure))
  );
}

async function loadApprovedTemplateDirectory(
  tenantId: string,
): Promise<ApprovedTemplateDirectoryEntry[]> {
  const cached = approvedTemplateDirectoryCache.get(tenantId);
  if (cached) return cached;

  const pending = loadApprovedTemplateDirectoryUncached(tenantId);
  approvedTemplateDirectoryCache.set(tenantId, pending);

  try {
    return await pending;
  } catch (error) {
    approvedTemplateDirectoryCache.delete(tenantId);
    throw error;
  }
}

async function loadApprovedTemplateDirectoryUncached(
  tenantId: string,
): Promise<ApprovedTemplateDirectoryEntry[]> {
  const prisma = getPrisma();
  const templateRows = await prisma.consentTemplate.findMany({
    where: {
      tenantId,
      status: { in: ["APPROVED", "ACTIVE"] },
      NOT: { currentVersionId: null },
    },
    select: {
      id: true,
      templateCode: true,
      titleEn: true,
      titleAr: true,
      specialty: true,
      department: true,
      status: true,
      currentVersionId: true,
      metadata: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const versionIds = templateRows
    .map((template) => template.currentVersionId)
    .filter((value): value is string => Boolean(value));

  const versions = await prisma.consentTemplateVersion.findMany({
    where: { tenantId, id: { in: versionIds } },
    select: {
      id: true,
      templateId: true,
      versionLabel: true,
      versionNumber: true,
      approvedAt: true,
      effectiveFrom: true,
      legalHash: true,
      sections: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          sectionKey: true,
          sectionKind: true,
          titleAr: true,
          titleEn: true,
          contentAr: true,
          contentEn: true,
          isRequired: true,
          isEditableByPhysician: true,
          sortOrder: true,
        },
      },
    },
  });

  const versionByTemplateId = new Map(versions.map((version) => [version.templateId, version]));
  return templateRows.map((template) => ({
    ...template,
    currentVersion: versionByTemplateId.get(template.id) || null,
  }));
}

async function loadAllResolvedProcedureContexts(
  tenantId: string,
): Promise<ResolvedProcedureContext[]> {
  const prisma = getPrisma();
  const procedures = await prisma.clinicalProcedure.findMany({
    where: { tenantId },
    select: {
      id: true,
      code: true,
      nameEn: true,
      nameAr: true,
      categoryCode: true,
      departmentName: true,
    },
    orderBy: { nameEn: "asc" },
  });

  const procedureIds = procedures.map((procedure) => procedure.id);
  const packages = await prisma.clinicalKnowledgePackage.findMany({
    where: {
      tenantId,
      procedureId: { in: procedureIds },
      status: "PUBLISHED",
      OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
    },
    orderBy: [{ procedureId: "asc" }, { effectiveDate: "desc" }],
    include: {
      items: {
        where: { itemType: "CONSENT_FORM" },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  const packageByProcedureId = new Map<string, (typeof packages)[number]>();
  for (const pkg of packages) {
    if (!packageByProcedureId.has(pkg.procedureId)) {
      packageByProcedureId.set(pkg.procedureId, pkg);
    }
  }

  const formIds = Array.from(
    new Set(
      Array.from(packageByProcedureId.values())
        .map((pkg) => pkg.items[0]?.itemId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const forms = formIds.length
    ? await prisma.consentForm.findMany({
        where: { tenantId, id: { in: formIds } },
        select: {
          id: true,
          code: true,
          titleEn: true,
          titleAr: true,
          status: true,
          version: true,
          effectiveDate: true,
          pdfTemplateUrl: true,
          governanceSnapshot: true,
        },
      })
    : [];
  const formById = new Map(forms.map((form) => [form.id, form]));

  return procedures.map((procedure) => {
    const pkg = packageByProcedureId.get(procedure.id);
    const formId = pkg?.items[0]?.itemId;
    const form = formId ? formById.get(formId) || null : null;
    return {
      procedureId: procedure.id,
      procedureCode: procedure.code,
      procedureNameEn: procedure.nameEn,
      procedureNameAr: procedure.nameAr,
      categoryCode: procedure.categoryCode,
      department: procedure.departmentName,
      formCode: form?.code || null,
      formId: form?.id || null,
      formTitleEn: form?.titleEn || null,
      formTitleAr: form?.titleAr || null,
      formStatus: form?.status || null,
      formVersion: form?.version || null,
      formEffectiveDate: form?.effectiveDate || null,
      pdfTemplateUrl: form?.pdfTemplateUrl || null,
      governanceSnapshot: form?.governanceSnapshot ?? null,
    };
  });
}

function buildApprovedLink(
  template: ApprovedTemplateDirectoryEntry,
  procedureContext: ResolvedProcedureContext,
  priority: ApprovedProcedureConsentLink["resolutionPriority"],
  matchedRuleId?: string,
): ApprovedProcedureConsentLink | null {
  if (!template.currentVersion || template.currentVersion.sections.length === 0) {
    return null;
  }

  const metadata = asRecord(template.metadata);
  const approvedSource = asRecord(metadata.approvedSource);

  return {
    procedureId: procedureContext.procedureId,
    procedureCode: procedureContext.procedureCode,
    procedureNameEn: procedureContext.procedureNameEn,
    procedureNameAr: procedureContext.procedureNameAr,
    approvedConsentFormId: template.id,
    approvedTemplateId: template.id,
    approvedTemplateVersionId: template.currentVersion.id,
    templateCode: template.templateCode,
    titleEn: template.titleEn,
    titleAr: template.titleAr,
    specialty: template.specialty,
    department: template.department || "",
    language: "bilingual",
    approvalStatus: template.status === "ACTIVE" ? "ACTIVE" : "APPROVED",
    version: template.currentVersion.versionLabel,
    versionNumber: template.currentVersion.versionNumber,
    effectiveDate: (template.currentVersion.effectiveFrom || template.currentVersion.approvedAt)?.toISOString() || null,
    sourcePath:
      asString(approvedSource.storageKey)
      || asString(approvedSource.sourcePath)
      || asString(metadata.sourcePath),
    checksum:
      template.currentVersion.legalHash
      || asString(approvedSource.checksum)
      || asString(metadata.checksum),
    resolutionPriority: priority,
    matchedRuleId,
    formCode: procedureContext.formCode,
    sections: template.currentVersion.sections,
  };
}

function findTemplateByCode(
  templates: ApprovedTemplateDirectoryEntry[],
  templateCode: string,
): ApprovedTemplateDirectoryEntry | null {
  return templates.find((template) => normalize(template.templateCode) === normalize(templateCode)) || null;
}

function matchExplicitRule(
  procedureContext: ResolvedProcedureContext,
): { rule: ExplicitApprovedMappingRule; priority: ApprovedProcedureConsentLink["resolutionPriority"] } | null {
  for (const rule of EXPLICIT_APPROVED_MAPPING_RULES) {
    if (rule.procedureIds?.includes(procedureContext.procedureId)) {
      return { rule, priority: "procedureId" };
    }
  }

  for (const rule of EXPLICIT_APPROVED_MAPPING_RULES) {
    if (
      rule.procedureCodes?.some((value) => normalize(value) === normalize(procedureContext.procedureCode))
      || (procedureContext.formCode && rule.formCodes?.some((value) => normalize(value) === normalize(procedureContext.formCode || "")))
    ) {
      return { rule, priority: "templateCode" };
    }
  }

  const aliases = [
    procedureContext.procedureNameEn,
    procedureContext.procedureNameAr,
    procedureContext.procedureCode,
    procedureContext.formCode || "",
  ].map(normalize);

  const categoryCode = normalize(procedureContext.categoryCode);

  for (const rule of EXPLICIT_APPROVED_MAPPING_RULES) {
    const matchesCategory = rule.categoryCodes?.some((value) => normalize(value) === categoryCode) || false;
    const matchesCodeContains = rule.procedureCodeContains?.some((value) =>
      normalize(procedureContext.procedureCode).includes(normalize(value))
      || normalize(procedureContext.formCode || "").includes(normalize(value)),
    ) || false;
    const matchesNameContains = rule.procedureNameContains?.some((value) =>
      normalize(procedureContext.procedureNameEn).includes(normalize(value))
      || normalize(procedureContext.procedureNameAr).includes(normalize(value)),
    ) || false;
    const matchesAlias = rule.aliases?.some((alias) => aliases.includes(normalize(alias))) || false;

    if (matchesCategory || matchesCodeContains || matchesNameContains || matchesAlias) {
      return { rule, priority: "alias" };
    }
  }

  return null;
}

function pickSingleExactTemplateMatch(
  templates: ApprovedTemplateDirectoryEntry[],
  procedureContext: ResolvedProcedureContext,
  procedureText: string,
): ApprovedProcedureConsentLink | null {
  const normalizedNames = new Set(
    [procedureText, procedureContext.procedureNameEn, procedureContext.procedureNameAr]
      .map(normalize)
      .filter(Boolean),
  );

  const exactMatches = templates.filter((template) => {
    const titleEn = normalize(template.titleEn);
    const titleAr = normalize(template.titleAr);
    return normalizedNames.has(titleEn) || normalizedNames.has(titleAr);
  });

  if (exactMatches.length !== 1) return null;
  return buildApprovedLink(exactMatches[0], procedureContext, "title");
}

function resolveApprovedLinkFromContext(
  procedureContext: ResolvedProcedureContext,
  templates: ApprovedTemplateDirectoryEntry[],
  procedureText: string,
): ApprovedProcedureConsentLink | null {
  const explicit = matchExplicitRule(procedureContext);
  if (explicit) {
    const template = findTemplateByCode(templates, explicit.rule.approvedTemplateCode);
    if (template) {
      const linked = buildApprovedLink(template, procedureContext, explicit.priority, explicit.rule.id);
      if (linked) return linked;
    }
  }

  return pickSingleExactTemplateMatch(templates, procedureContext, procedureText);
}

export async function resolveApprovedProcedureConsentLink(
  input: ContentMappingInput,
): Promise<ApprovedProcedureConsentLink | null> {
  const procedureContext = await resolveClinicalProcedureContext(input);

  if (!procedureContext) {
    return null;
  }

  return buildPublishedConsentFormLink(procedureContext);
}

export async function verifyApprovedProcedureLinks(
  tenantId: string,
): Promise<ApprovedProcedureVerificationRow[]> {
  const procedures = await loadAllResolvedProcedureContexts(tenantId);

  return procedures.map((procedure) => ({
    procedure,
    approvedLink: buildPublishedConsentFormLink(procedure),
  }));
}

export async function resolveContentMapping(
  input: ContentMappingInput,
): Promise<ContentMappingResult> {
  const procedure = input.procedure.trim();
  if (!procedure) {
    return {
      found: false,
      procedureName: input.procedure,
      availableProcedures: listProcedureNames(),
    };
  }

  const [catalog, approvedLink] = await Promise.all([
    findActiveProcedureCatalog(input.tenantId, procedure),
    resolveApprovedProcedureConsentLink(input),
  ]);

  if (!approvedLink) {
    return {
      found: false,
      procedureName: procedure,
      availableProcedures: listProcedureNames(),
    };
  }

  const item = resolveStaticItem({
    procedure,
    procedureCode: approvedLink.procedureCode,
    formCode: approvedLink.formCode,
    procedureNameAr: approvedLink.procedureNameAr,
  }) || null;

  const consentType = item?.consentType || templateCodeToConsentType(approvedLink.templateCode);
  const consentForm = buildMappedConsentForm(item, approvedLink);
  const educationMaterial = buildEducationMaterial(item);

  return {
    found: true,
    procedureCatalogId: catalog?.id ?? null,
    procedureId: approvedLink.procedureId,
    procedureNameEn: approvedLink.procedureNameEn,
    procedureNameAr: approvedLink.procedureNameAr,
    specialty: approvedLink.specialty,
    department: approvedLink.department,
    categoryCode: input.categoryCode || item?.categoryCode || approvedLink.templateCode,
    consentType,
    consentCategory: consentTypeToCategory(consentType),
    language: approvedLink.language,
    version: approvedLink.version,
    anesthesiaRequired: item?.anesthesiaRequired ?? consentType === "ANESTHESIA_CONSENT",
    consentForm,
    educationMaterial,
  };
}

export function buildImcConsentPackage(
  mapping: ContentMappingFound,
): ImcConsentPackage {
  const item = resolveStaticItem({
    procedure: mapping.procedureNameEn,
    procedureCode: mapping.consentForm.templateCode,
    procedureNameAr: mapping.procedureNameAr,
  });

  if (!item) {
    return {
      procedureConsent: {
        id: mapping.consentForm.templateId,
        titleEn: mapping.consentForm.titleEn,
        titleAr: mapping.consentForm.titleAr,
        fileName: mapping.consentForm.fileName,
        publicPath: mapping.consentForm.publicPath,
        specialty: mapping.specialty,
        templateType: mapping.consentCategory,
        status: "ACTIVE",
        source: "approved-consent-template",
        requiresAnesthesia: mapping.anesthesiaRequired,
        isPatientCopy: false,
        isEducation: false,
        isAnesthesia: mapping.consentType === "ANESTHESIA_CONSENT",
        lengthBytes: 0,
      },
      matches: [],
    };
  }

  const procedureConsent = buildCatalogItem(item);
  const patientEducation = mapping.educationMaterial ? buildCatalogItem(item, { isEducation: true }) : undefined;

  return {
    procedureConsent,
    patientEducation,
    matches: [procedureConsent, ...(patientEducation ? [patientEducation] : [])],
  };
}

export function listProcedureNames(): string[] {
  return imcApprovedConsentLibraryGenerated
    .map((entry) => entry.titleEn)
    .sort((a, b) => a.localeCompare(b));
}

export function listContentMappingCatalog(): ImcConsentCatalogItem[] {
  return imcApprovedConsentLibraryGenerated.map((item) => buildCatalogItem(item));
}