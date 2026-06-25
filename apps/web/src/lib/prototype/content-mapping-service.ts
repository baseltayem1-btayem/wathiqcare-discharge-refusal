/**
 * Content Mapping Service — Phase 43 prototype integration layer.
 *
 * Connects a clinical procedure to its approved consent form and patient
 * education material using the real IMC approved forms library.
 *
 * This module is intentionally isolated under `/lib/prototype/` so it can be
 * validated without modifying the production informed-consent workflow. When
 * ready, it can be promoted to `/lib/server/` and wired into the issuance flow.
 */

import {
  imcApprovedConsentLibraryGenerated,
  type ImcApprovedConsentLibraryItem,
} from "@/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated";

export type MappedContentFile = {
  fileName: string;
  title: string;
  publicPath: string;
  kind: "CONSENT_FORM" | "EDUCATION_MATERIAL";
};

export type ContentMappingResult = {
  found: true;
  procedureId: string;
  procedureNameEn: string;
  procedureNameAr: string;
  specialty: string;
  department: string;
  categoryCode: string;
  consentType: string;
  language: string;
  version: string;
  anesthesiaRequired: boolean;
  consentForm: MappedContentFile;
  educationMaterial: MappedContentFile | null;
} | {
  found: false;
  procedureName: string;
  availableProcedures: string[];
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

function buildConsentFile(item: ImcApprovedConsentLibraryItem): MappedContentFile {
  return {
    fileName: item.hospitalPdfFilename,
    title: item.titleEn,
    publicPath: toPublicPath(item.hospitalPdfFilename),
    kind: "CONSENT_FORM",
  };
}

function buildEducationFile(item: ImcApprovedConsentLibraryItem): MappedContentFile | null {
  if (!item.patientEducationPdfFilename) return null;
  return {
    fileName: item.patientEducationPdfFilename,
    title: `${item.titleEn} — Patient Education`,
    publicPath: toPublicPath(item.patientEducationPdfFilename),
    kind: "EDUCATION_MATERIAL",
  };
}

export function resolveContentByProcedureName(procedureName: string): ContentMappingResult {
  const normalized = procedureName.trim().toLowerCase();
  const item = imcApprovedConsentLibraryGenerated.find(
    (entry) => entry.titleEn.trim().toLowerCase() === normalized
  );

  if (!item) {
    return {
      found: false,
      procedureName,
      availableProcedures: imcApprovedConsentLibraryGenerated.map((entry) => entry.titleEn).sort(),
    };
  }

  return mapItemToResult(item);
}

export function resolveContentByProcedureId(procedureId: string): ContentMappingResult {
  const item = imcApprovedConsentLibraryGenerated.find(
    (entry) => slugify(entry.titleEn) === procedureId
  );

  if (!item) {
    return {
      found: false,
      procedureName: procedureId,
      availableProcedures: imcApprovedConsentLibraryGenerated.map((entry) => entry.titleEn).sort(),
    };
  }

  return mapItemToResult(item);
}

function mapItemToResult(item: ImcApprovedConsentLibraryItem): ContentMappingResult {
  const consentForm = buildConsentFile(item);
  const educationMaterial = buildEducationFile(item);

  return {
    found: true,
    procedureId: slugify(item.titleEn),
    procedureNameEn: item.titleEn,
    procedureNameAr: item.titleAr,
    specialty: item.specialty,
    department: item.department,
    categoryCode: item.categoryCode,
    consentType: item.consentType,
    language: item.language,
    version: item.version,
    anesthesiaRequired: item.anesthesiaRequired,
    consentForm,
    educationMaterial,
  };
}

export function getProcedureOptions(): Array<{
  procedureId: string;
  procedureNameEn: string;
  specialty: string;
  hasEducation: boolean;
}> {
  return imcApprovedConsentLibraryGenerated
    .map((item) => ({
      procedureId: slugify(item.titleEn),
      procedureNameEn: item.titleEn,
      specialty: item.specialty,
      hasEducation: Boolean(item.patientEducationPdfFilename),
    }))
    .sort((a, b) => a.procedureNameEn.localeCompare(b.procedureNameEn));
}

export function getExampleWithBoth(): ContentMappingResult {
  // First procedure in the library that has both consent and education.
  const item = imcApprovedConsentLibraryGenerated.find((entry) => entry.patientEducationPdfFilename);
  if (!item) {
    return {
      found: false,
      procedureName: "unknown",
      availableProcedures: [],
    };
  }
  return mapItemToResult(item);
}

export function getExampleConsentOnly(): ContentMappingResult {
  // First procedure with consent only.
  const item = imcApprovedConsentLibraryGenerated.find((entry) => !entry.patientEducationPdfFilename);
  if (!item) {
    return {
      found: false,
      procedureName: "unknown",
      availableProcedures: [],
    };
  }
  return mapItemToResult(item);
}
