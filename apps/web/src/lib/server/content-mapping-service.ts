/**
 * Content Mapping Service — production integration layer.
 *
 * Resolves a clinical procedure to its approved consent form and optional
 * patient education material. The implementation is intentionally defensive:
 *
 * 1. It first tries to find an active tenant-scoped `ConsentProcedureCatalog`
 *    record so audit metadata can reference a real database id when available.
 * 2. The approved content itself is resolved from the static IMC approved forms
 *    library (`imcApprovedConsentLibraryGenerated`). This avoids requiring a
 *    new schema relation between the catalog and consent templates before the
 *    feature can be safely validated in production.
 * 3. If the procedure is not present in the approved library, the caller falls
 *    back to the existing manual workflow.
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
  source: "imc-approved-library";
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
  preferredLanguage?: "en" | "ar" | "bilingual";
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPublicPath(fileName: string): string {
  return `/imc-consent-library/${encodeURIComponent(fileName)}`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function consentTypeToCategory(consentType: string): string {
  switch (consentType) {
    case "PROCEDURE_CONSENT":
      return "Surgical Consent";
    case "ANESTHESIA_CONSENT":
      return "Anesthesia Consent";
    case "BLOOD_TRANSFUSION_CONSENT":
      return "Blood Transfusion Consent";
    case "DIAGNOSTIC_IMAGING_CONSENT":
      return "Radiology Consent";
    case "RESEARCH_CLINICAL_TRIAL_CONSENT":
      return "Research Consent";
    default:
      return "Surgical Consent";
  }
}

function buildConsentForm(item: ImcApprovedConsentLibraryItem): MappedConsentForm {
  return {
    templateId: item.id,
    templateVersionId: `${item.id}-v${item.version}`,
    templateCode: item.categoryCode,
    fileName: item.hospitalPdfFilename,
    publicPath: toPublicPath(item.hospitalPdfFilename),
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    kind: "CONSENT_FORM",
    status: "APPROVED",
  };
}

function buildEducationMaterial(
  item: ImcApprovedConsentLibraryItem,
): MappedEducationMaterial | null {
  if (!item.patientEducationPdfFilename) return null;
  return {
    educationId: `${item.id}-education`,
    assetId: `${item.id}-education-asset`,
    fileName: item.patientEducationPdfFilename,
    publicPath: toPublicPath(item.patientEducationPdfFilename),
    titleEn: `${item.titleEn} — Patient Education`,
    titleAr: item.titleAr
      ? `${item.titleAr} — نسخة المريض`
      : "نسخة تثقيف المريض",
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
  const fileName = isEducation
    ? item.patientEducationPdfFilename || item.hospitalPdfFilename
    : item.hospitalPdfFilename;

  return {
    id: isEducation ? `${item.id}-education` : item.id,
    titleEn: isEducation
      ? `${item.titleEn} — Patient Education`
      : item.titleEn,
    titleAr: isEducation && item.titleAr
      ? `${item.titleAr} — نسخة المريض`
      : item.titleAr,
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

    // Fuzzy fallback: any catalog entry whose English name contains the query.
    const candidates = await prisma.consentProcedureCatalog.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: { id: true, nameEn: true, nameAr: true },
    });

    return (
      candidates.find((candidate) => normalize(candidate.nameEn) === normalized) ||
      candidates.find((candidate) =>
        normalize(candidate.nameEn).includes(normalized),
      ) ||
      null
    );
  } catch {
    // Database is not required for the fallback path; swallow errors so the
    // static library can still resolve content.
    return null;
  }
}

function resolveStaticItem(procedure: string): ImcApprovedConsentLibraryItem | undefined {
  const normalized = normalize(procedure);

  return (
    imcApprovedConsentLibraryGenerated.find(
      (entry) => normalize(entry.titleEn) === normalized,
    ) ||
    imcApprovedConsentLibraryGenerated.find((entry) =>
      normalize(entry.titleEn).includes(normalized),
    )
  );
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

  const catalog = await findActiveProcedureCatalog(input.tenantId, procedure);
  const item = resolveStaticItem(procedure);

  if (!item) {
    return {
      found: false,
      procedureName: procedure,
      availableProcedures: listProcedureNames(),
    };
  }

  const consentForm = buildConsentForm(item);
  const educationMaterial = buildEducationMaterial(item);

  return {
    found: true,
    procedureCatalogId: catalog?.id ?? null,
    procedureId: slugify(item.titleEn),
    procedureNameEn: catalog?.nameEn ?? item.titleEn,
    procedureNameAr: catalog?.nameAr ?? item.titleAr,
    specialty: item.specialty,
    department: item.department,
    categoryCode: item.categoryCode,
    consentType: item.consentType,
    consentCategory: consentTypeToCategory(item.consentType),
    language: item.language,
    version: item.version,
    anesthesiaRequired: item.anesthesiaRequired,
    consentForm,
    educationMaterial,
  };
}

export function buildImcConsentPackage(
  mapping: ContentMappingFound,
): ImcConsentPackage {
  const item = imcApprovedConsentLibraryGenerated.find(
    (entry) => slugify(entry.titleEn) === mapping.procedureId,
  );

  if (!item) {
    return { matches: [] };
  }

  const procedureConsent = buildCatalogItem(item);
  const patientEducation = mapping.educationMaterial
    ? buildCatalogItem(item, { isEducation: true })
    : undefined;

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
