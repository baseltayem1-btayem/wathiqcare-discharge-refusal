import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { ENABLE_DYNAMIC_CONSENT_ENGINE } from "@/lib/config/feature-flags";
import {
  buildExperimentalDynamicConsent,
  buildExperimentalDynamicConsentPreview,
} from "@/modules/consent-engine/service";
import type {
  DynamicConsentBuildResult,
  DynamicConsentPayload,
  DynamicConsentLanguage,
} from "@/modules/consent-engine";
import { renderLegalGradeConsentHtml } from "@/modules/consent-engine/legal-grade/legal-grade-renderer";
import {
  getSpecialtyDemo,
  listSpecialtyDemos,
} from "@/modules/consent-engine/legal-grade/specialty-demos";
import {
  buildLegalEvidencePdfPreview,
  hashJson,
  type EvidencePackage,
  type LegalEvidencePdfPreviewOutput,
} from "@/modules/consent-engine/pdf-evidence";

type RendererMode = "default" | "legal-grade";

function resolveRendererMode(request: NextRequest): RendererMode {
  return request.nextUrl.searchParams.get("renderer") === "legal-grade"
    ? "legal-grade"
    : "default";
}

function isEvidenceRequested(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get("evidence") === "true";
}

function applyRenderer(
  result: DynamicConsentBuildResult,
  mode: RendererMode,
  language?: DynamicConsentLanguage,
): string {
  if (mode !== "legal-grade") return result.rendered.html;
  return renderLegalGradeConsentHtml({
    template: result.template,
    payload: result.payload,
    sections: result.sections,
    risks: result.risks,
    alternatives: result.alternatives,
    warnings: result.warnings,
    audit: result.audit,
    generatedAt: result.generatedAt,
    language: language ?? result.payload.language,
  });
}

function buildEvidencePreviewForResult(
  result: DynamicConsentBuildResult,
  html: string,
  generatedBy: string,
): LegalEvidencePdfPreviewOutput {
  return buildLegalEvidencePdfPreview({
    html,
    templateId: result.template.id,
    templateVersion: result.template.version,
    templateHash: hashJson(result.template),
    payloadHash: result.audit.payloadFingerprint,
    auditHash: result.audit.hash,
    payloadFingerprint: result.audit.payloadFingerprint,
    patientMrn: result.payload.patient.identifier ?? "",
    encounterNo: result.payload.encounter.encounterNumber ?? "",
    caseNumber: result.payload.encounter.caseNumber ?? "",
    generatedAt: result.generatedAt,
    generatedBy,
    evidenceId: result.payload.audit?.evidenceId ?? null,
  });
}

interface PayloadCustomization {
  patientName?: string;
  patientMrn?: string;
  caseNumber?: string;
  encounterNo?: string;
  diagnosis?: string;
  procedureName?: string;
  specialty?: string;
  physicianName?: string;
  language?: DynamicConsentLanguage;
}

function buildDefaultSamplePayload(): DynamicConsentPayload {
  return {
    patient: {
      name: "نجيب الفلاح",
      identifier: "IMC-2026-02000",
      role: "Patient",
    },
    encounter: {
      encounterNumber: "ENC-UAT-2026-0001",
      caseNumber: "CASE-2026-0001",
      specialty: "CARDIOLOGY",
      diagnosis: "Pre-operative informed consent assessment",
      plannedProcedure: "Diagnostic cardiac catheterization",
      department: "Cardiology",
    },
    physician: {
      name: "Dr. Ahmed Al-Salmi",
      identifier: "LIC-ALH-001",
      role: "Cardiologist",
    },
    diagnosis: "Pre-operative informed consent assessment",
    procedure: "Diagnostic cardiac catheterization",
    specialty: "CARDIOLOGY",
    language: "bilingual" as DynamicConsentLanguage,
    anesthesia: {
      required: true,
      type: "Local with sedation",
      notesEn: "Patient will receive local anesthetic with mild sedation for comfort",
      notesAr: "سيحصل المريض على التخدير الموضعي مع تهدئة خفيفة للراحة",
    },
    risks: [],
    alternatives: [],
    legalStatements: [],
    signatures: {
      patientRequired: true,
      physicianRequired: true,
      interpreterRequired: false,
      witnessRequired: false,
    },
  };
}

function extractPayloadFromQuery(request: NextRequest): PayloadCustomization {
  const searchParams = request.nextUrl.searchParams;
  const payload: PayloadCustomization = {};

  const patientName = searchParams.get("patientName");
  if (patientName) payload.patientName = patientName;

  const patientMrn = searchParams.get("patientMrn");
  if (patientMrn) payload.patientMrn = patientMrn;

  const caseNumber = searchParams.get("caseNumber");
  if (caseNumber) payload.caseNumber = caseNumber;

  const encounterNo = searchParams.get("encounterNo");
  if (encounterNo) payload.encounterNo = encounterNo;

  const diagnosis = searchParams.get("diagnosis");
  if (diagnosis) payload.diagnosis = diagnosis;

  const procedureName = searchParams.get("procedureName");
  if (procedureName) payload.procedureName = procedureName;

  const specialty = searchParams.get("specialty");
  if (specialty) payload.specialty = specialty;

  const physicianName = searchParams.get("physicianName");
  if (physicianName) payload.physicianName = physicianName;

  const lang = searchParams.get("language");
  if (lang === "ar" || lang === "en" || lang === "bilingual") {
    payload.language = lang;
  }

  return payload;
}

function mergePayload(
  defaults: DynamicConsentPayload,
  custom: PayloadCustomization
): DynamicConsentPayload {
  const merged = { ...defaults };

  if (custom.patientName) {
    merged.patient = { ...merged.patient, name: custom.patientName };
  }
  if (custom.patientMrn) {
    merged.patient = { ...merged.patient, identifier: custom.patientMrn };
  }

  if (custom.caseNumber) {
    merged.encounter = { ...merged.encounter, caseNumber: custom.caseNumber };
  }
  if (custom.encounterNo) {
    merged.encounter = { ...merged.encounter, encounterNumber: custom.encounterNo };
  }
  if (custom.diagnosis) {
    merged.diagnosis = custom.diagnosis;
    merged.encounter.diagnosis = custom.diagnosis;
  }
  if (custom.procedureName) {
    merged.procedure = custom.procedureName;
    merged.encounter.plannedProcedure = custom.procedureName;
  }

  if (custom.specialty) {
    merged.specialty = custom.specialty;
    merged.encounter.specialty = custom.specialty;
  }
  if (custom.physicianName) {
    merged.physician = { ...merged.physician, name: custom.physicianName };
  }

  if (custom.language) {
    merged.language = custom.language;
  }

  return merged;
}

function isDynamicConsentPreviewEnabled(request: NextRequest): boolean {
  if (ENABLE_DYNAMIC_CONSENT_ENGINE) {
    return true;
  }
  const searchParams = request.nextUrl.searchParams;
  return searchParams.get("engine") === "dynamic-preview";
}

export async function GET(request: NextRequest) {
  try {
    if (!isDynamicConsentPreviewEnabled(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Dynamic consent preview is disabled",
          hint: "Enable with ENABLE_DYNAMIC_CONSENT_ENGINE=true or use ?engine=dynamic-preview",
        },
        { status: 403 }
      );
    }

    const auth = await requireAuth(request);
    const generatedBy = auth.email || auth.sub;

    const searchParams = request.nextUrl.searchParams;
    const demoId = searchParams.get("demo");
    const rendererMode = resolveRendererMode(request);
    const wantEvidence = isEvidenceRequested(request);

    let basePayload: DynamicConsentPayload;
    if (demoId) {
      const demo = getSpecialtyDemo(demoId);
      if (!demo) {
        return NextResponse.json(
          {
            success: false,
            error: `Unknown demo id: ${demoId}`,
            availableDemos: listSpecialtyDemos().map((d) => d.id),
          },
          { status: 400 },
        );
      }
      basePayload = demo.payload;
    } else {
      basePayload = buildDefaultSamplePayload();
    }

    const customPayload = extractPayloadFromQuery(request);
    const finalPayload = mergePayload(basePayload, customPayload);

    const result = buildExperimentalDynamicConsent(finalPayload);
    const html = applyRenderer(result, rendererMode, finalPayload.language);
    const evidencePreview: LegalEvidencePdfPreviewOutput | null = wantEvidence
      ? buildEvidencePreviewForResult(result, html, generatedBy)
      : null;
    const evidencePackage: EvidencePackage | null = evidencePreview
      ? evidencePreview.evidencePackage
      : null;

    return NextResponse.json({
      success: true,
      engine: "dynamic-consent-preview",
      renderer: rendererMode,
      demo: demoId ?? null,
      templateId: result.template.id,
      templateVersion: result.template.version,
      html,
      titleAr: result.rendered.titleAr,
      titleEn: result.rendered.titleEn,
      warnings: result.warnings,
      audit: {
        hash: result.audit.hash,
        generatedAt: result.audit.generatedAt,
        payloadFingerprint: result.audit.payloadFingerprint,
        templateId: result.audit.templateId,
        templateVersion: result.audit.templateVersion,
      },
      metadata: {
        patientName: result.payload.patient.name,
        patientMrn: result.payload.patient.identifier,
        encounterNo: result.payload.encounter.encounterNumber,
        caseNumber: result.payload.encounter.caseNumber,
        specialty: result.payload.specialty,
        language: result.payload.language,
        generatedAt: result.generatedAt,
      },
      availableDemos: listSpecialtyDemos().map((d) => ({
        id: d.id,
        labelEn: d.labelEn,
        labelAr: d.labelAr,
      })),
      evidence: evidencePackage,
      verificationUrl: evidencePackage?.verificationUrl ?? null,
      suggestedFilename: evidencePreview?.suggestedFilename ?? null,
      contentType: evidencePreview?.contentType ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDynamicConsentPreviewEnabled(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Dynamic consent preview is disabled",
          hint: "Enable with ENABLE_DYNAMIC_CONSENT_ENGINE=true or use ?engine=dynamic-preview",
        },
        { status: 403 }
      );
    }

    const auth = await requireAuth(request);
    const generatedBy = auth.email || auth.sub;

    const body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (typeof parsed === "object" && parsed !== null) {
        Object.assign(body, parsed);
      }
    } catch {
      // If body is not JSON, use defaults
    }

    let result;

    if (body.useDefaults || !body.payload) {
      result = buildExperimentalDynamicConsentPreview();
    } else {
      const payload = body.payload as DynamicConsentPayload;
      result = buildExperimentalDynamicConsent(payload);
    }

    const rendererMode = resolveRendererMode(request);
    const html = applyRenderer(result, rendererMode);
    const wantEvidence = isEvidenceRequested(request);
    const evidencePreview: LegalEvidencePdfPreviewOutput | null = wantEvidence
      ? buildEvidencePreviewForResult(result, html, generatedBy)
      : null;
    const evidencePackage: EvidencePackage | null = evidencePreview
      ? evidencePreview.evidencePackage
      : null;

    return NextResponse.json({
      success: true,
      engine: "dynamic-consent-preview",
      renderer: rendererMode,
      templateId: result.template.id,
      templateVersion: result.template.version,
      html,
      titleAr: result.rendered.titleAr,
      titleEn: result.rendered.titleEn,
      warnings: result.warnings,
      audit: {
        hash: result.audit.hash,
        generatedAt: result.audit.generatedAt,
        payloadFingerprint: result.audit.payloadFingerprint,
        templateId: result.audit.templateId,
        templateVersion: result.audit.templateVersion,
      },
      metadata: {
        patientName: result.payload.patient.name,
        patientMrn: result.payload.patient.identifier,
        encounterNo: result.payload.encounter.encounterNumber,
        caseNumber: result.payload.encounter.caseNumber,
        specialty: result.payload.specialty,
        language: result.payload.language,
        generatedAt: result.generatedAt,
      },
      evidence: evidencePackage,
      verificationUrl: evidencePackage?.verificationUrl ?? null,
      suggestedFilename: evidencePreview?.suggestedFilename ?? null,
      contentType: evidencePreview?.contentType ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
