/**
 * Clinical Knowledge Engine → Informed Consent integration adapter.
 *
 * Bridges the CKE package assembly output with the existing Informed Consent
 * content-mapping shapes so the physician workflow can consume CKE data
 * without a full UI rewrite. The adapter is pure: it returns audit events and
 * leaves the actual write to the caller, which makes it easy to unit test.
 */

import { assembleKnowledgePackage } from "./services";
import type { AssemblyResult } from "./services/assembly-service";
import type {
  ClinicalKnowledgeAssembly,
  ClinicalKnowledgeAssemblyRequest,
  ClinicalKnowledgeConsentForm,
  ClinicalKnowledgeEducationMaterial,
} from "@/lib/clinical-knowledge/types";
import type {
  ContentMappingFound,
  ImcConsentPackage,
  MappedConsentForm,
  MappedEducationMaterial,
} from "@/lib/server/content-mapping-service";

export type CkeConsentMappingInput = {
  tenantId: string;
  procedureCode: string;
  reviewMode?: boolean;
  patientContext?: ClinicalKnowledgeAssemblyRequest["patientContext"];
  physicianContext?: ClinicalKnowledgeAssemblyRequest["physicianContext"];
};

export type CkeConsentMappingOptions = {
  assemblyResolver?: (
    request: ClinicalKnowledgeAssemblyRequest,
  ) => Promise<AssemblyResult>;
};

export type CkeConsentMappingAuditEvent = {
  action: string;
  summary: string;
  metadata: Record<string, unknown>;
};

export type CkeConsentMappingResult =
  | {
      found: true;
      fallbackReason?: undefined;
      mapping: ContentMappingFound;
      package: ImcConsentPackage;
      clinicalKnowledgeAssembly: ClinicalKnowledgeAssembly;
      educationNotAvailable: boolean;
      auditEvents: CkeConsentMappingAuditEvent[];
    }
  | {
      found: false;
      fallbackReason: string;
      mapping?: undefined;
      package?: undefined;
      clinicalKnowledgeAssembly?: undefined;
      educationNotAvailable: false;
      auditEvents: CkeConsentMappingAuditEvent[];
    };

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
    case "TELEMEDICINE_CONSENT":
      return "Telemedicine Consent";
    case "VACCINATION_CONSENT":
      return "Vaccination Consent";
    case "PROCEDURE_CONSENT":
    default:
      return "Surgical Consent";
  }
}

function buildMappedConsentForm(form: ClinicalKnowledgeConsentForm): MappedConsentForm {
  return {
    templateId: form.id,
    templateVersionId: `${form.id}-v${form.version}`,
    templateCode: form.code,
    fileName: form.pdfTemplateUrl ? form.pdfTemplateUrl.split("/").pop() || `${form.code}.pdf` : `${form.code}.pdf`,
    publicPath: form.pdfTemplateUrl || "",
    titleEn: form.titleEn,
    titleAr: form.titleAr,
    kind: "CONSENT_FORM",
    status: "APPROVED",
  };
}

function buildMappedEducationMaterial(
  material: ClinicalKnowledgeEducationMaterial,
): MappedEducationMaterial {
  return {
    educationId: material.id,
    assetId: material.id,
    fileName: material.assetUrl ? material.assetUrl.split("/").pop() || `${material.code}.pdf` : `${material.code}.pdf`,
    publicPath: material.assetUrl,
    titleEn: material.titleEn,
    titleAr: material.titleAr,
    kind: "EDUCATION_MATERIAL",
    assetType: (material.assetType === "VIDEO" ? "PDF" : material.assetType) as "PDF",
    durationMinutes: material.durationMinutes ?? null,
  };
}

function buildImcConsentCatalogItem(
  form: ClinicalKnowledgeConsentForm,
): {
  id: string;
  titleEn: string;
  titleAr: string;
  fileName: string;
  publicPath: string;
  specialty: string;
  templateType: string;
  status: "ACTIVE";
  source: "cke-assembly";
  requiresAnesthesia: boolean;
  isPatientCopy: boolean;
  isEducation: boolean;
  isAnesthesia: boolean;
  lengthBytes: number;
} {
  return {
    id: form.id,
    titleEn: form.titleEn,
    titleAr: form.titleAr,
    fileName: `${form.code}.pdf`,
    publicPath: form.pdfTemplateUrl || "",
    specialty: "",
    templateType: consentTypeToCategory(form.formType),
    status: "ACTIVE",
    source: "cke-assembly",
    requiresAnesthesia: false,
    isPatientCopy: false,
    isEducation: false,
    isAnesthesia: false,
    lengthBytes: 0,
  };
}

function buildImcEducationCatalogItem(
  material: ClinicalKnowledgeEducationMaterial,
  form: ClinicalKnowledgeConsentForm,
): {
  id: string;
  titleEn: string;
  titleAr: string;
  fileName: string;
  publicPath: string;
  specialty: string;
  templateType: string;
  status: "ACTIVE";
  source: "cke-assembly";
  requiresAnesthesia: boolean;
  isPatientCopy: boolean;
  isEducation: boolean;
  isAnesthesia: boolean;
  lengthBytes: number;
} {
  return {
    id: material.id,
    titleEn: material.titleEn ? `${material.titleEn} — Patient Education` : `${form.titleEn} — Patient Education`,
    titleAr: material.titleAr
      ? `${material.titleAr} — نسخة المريض`
      : form.titleAr
        ? `${form.titleAr} — نسخة المريض`
        : "نسخة تثقيف المريض",
    fileName: material.assetUrl ? material.assetUrl.split("/").pop() || `${material.code}.pdf` : `${material.code}.pdf`,
    publicPath: material.assetUrl,
    specialty: "",
    templateType: consentTypeToCategory(form.formType),
    status: "ACTIVE",
    source: "cke-assembly",
    requiresAnesthesia: false,
    isPatientCopy: true,
    isEducation: true,
    isAnesthesia: false,
    lengthBytes: 0,
  };
}

export async function resolveCkeConsentMapping(
  input: CkeConsentMappingInput,
  options?: CkeConsentMappingOptions,
): Promise<CkeConsentMappingResult> {
  const resolver = options?.assemblyResolver ?? assembleKnowledgePackage;
  const { tenantId, procedureCode, reviewMode, patientContext, physicianContext } = input;

  const auditEvents: CkeConsentMappingAuditEvent[] = [
    {
      action: "cke_assembly_requested",
      summary: `CKE assembly requested for procedure "${procedureCode}"${reviewMode ? " (internal review mode)" : ""}`,
      metadata: {
        tenantId,
        procedureCode,
        reviewMode: Boolean(reviewMode),
        patientContext,
        physicianContext,
      },
    },
  ];

  let assemblyResult: AssemblyResult;
  try {
    assemblyResult = await resolver({
      tenantId,
      procedureCode,
      reviewMode,
      patientContext,
      physicianContext,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    auditEvents.push({
      action: "cke_assembly_failed",
      summary: `CKE assembly failed for "${procedureCode}": ${message}`,
      metadata: {
        tenantId,
        procedureCode,
        error: message,
      },
    });
    return {
      found: false,
      fallbackReason: `CKE_ASSEMBLY_ERROR: ${message}`,
      educationNotAvailable: false,
      auditEvents,
    };
  }

  if (!assemblyResult.found || !assemblyResult.assembly) {
    auditEvents.push({
      action: "cke_assembly_failed",
      summary: `CKE assembly did not resolve for "${procedureCode}" (${assemblyResult.fallbackReason})`,
      metadata: {
        tenantId,
        procedureCode,
        fallbackReason: assemblyResult.fallbackReason,
      },
    });
    return {
      found: false,
      fallbackReason: assemblyResult.fallbackReason ?? "CKE_ASSEMBLY_NOT_FOUND",
      educationNotAvailable: false,
      auditEvents,
    };
  }

  const assembly = assemblyResult.assembly;
  const consentForm = assembly.consentForm;

  if (!consentForm) {
    // This should never happen because assembly-service already validates it,
    // but we keep the adapter defensive.
    auditEvents.push({
      action: "cke_assembly_failed",
      summary: `CKE assembly resolved but consent form was missing for "${procedureCode}"`,
      metadata: { tenantId, procedureCode, packageId: assembly.packageId },
    });
    return {
      found: false,
      fallbackReason: "CKE_ASSEMBLY_MISSING_CONSENT_FORM",
      educationNotAvailable: false,
      auditEvents,
    };
  }

  const mappedConsentForm = buildMappedConsentForm(consentForm);
  const educationMaterial =
    assembly.educationMaterials[0] &&
    assembly.educationMaterials.length > 0
      ? buildMappedEducationMaterial(assembly.educationMaterials[0])
      : null;
  const educationNotAvailable = !educationMaterial;

  auditEvents.push({
    action: "consent_form_loaded_from_library",
    summary: `Consent form resolved from CKE for ${assembly.procedureNameEn}`,
    metadata: {
      tenantId,
      procedureCode,
      procedureNameEn: assembly.procedureNameEn,
      procedureNameAr: assembly.procedureNameAr,
      packageId: assembly.packageId,
      packageVersion: assembly.packageVersion,
      templateId: consentForm.id,
      templateVersionId: `${consentForm.id}-v${consentForm.version}`,
      templateCode: consentForm.code,
      version: consentForm.version,
      language: "bilingual",
      specialty: "",
    },
  });

  if (educationMaterial) {
    auditEvents.push({
      action: "education_material_loaded",
      summary: `Education material resolved from CKE for ${assembly.procedureNameEn}`,
      metadata: {
        tenantId,
        procedureCode,
        procedureNameEn: assembly.procedureNameEn,
        procedureNameAr: assembly.procedureNameAr,
        educationId: educationMaterial.educationId,
        assetId: educationMaterial.assetId,
        fileName: educationMaterial.fileName,
        assetType: educationMaterial.assetType,
        language: "bilingual",
        specialty: "",
      },
    });
  } else {
    auditEvents.push({
      action: "education_not_available",
      summary: `No education material available in CKE for ${assembly.procedureNameEn}`,
      metadata: {
        tenantId,
        procedureCode,
        procedureNameEn: assembly.procedureNameEn,
        procedureNameAr: assembly.procedureNameAr,
        packageId: assembly.packageId,
        specialty: "",
      },
    });
  }

  const mapping: ContentMappingFound = {
    found: true,
    procedureCatalogId: assembly.procedureId,
    procedureId: assembly.procedureCode,
    procedureNameEn: assembly.procedureNameEn,
    procedureNameAr: assembly.procedureNameAr,
    specialty: "",
    department: "",
    categoryCode: consentForm.code,
    consentType: consentForm.formType,
    consentCategory: consentTypeToCategory(consentForm.formType),
    language: "bilingual",
    version: consentForm.version,
    anesthesiaRequired: assembly.requiredParticipants.includes("witness") ? true : false, // best-effort signal
    consentForm: mappedConsentForm,
    educationMaterial,
  };

  const pkg: ImcConsentPackage = {
    procedureConsent: buildImcConsentCatalogItem(consentForm),
    patientEducation: educationMaterial
      ? buildImcEducationCatalogItem(assembly.educationMaterials[0], consentForm)
      : undefined,
    matches: [buildImcConsentCatalogItem(consentForm)],
  };

  return {
    found: true,
    mapping,
    package: pkg,
    clinicalKnowledgeAssembly: assembly,
    educationNotAvailable,
    auditEvents,
  };
}
