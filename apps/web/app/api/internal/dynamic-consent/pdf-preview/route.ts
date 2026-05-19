/**
 * Internal-only deterministic PDF binary preview endpoint.
 *
 * Strictly parallel to the existing dynamic-consent preview surface; this
 * route exists ONLY for proof-of-concept and never touches the production
 * informed-consent renderer at `apps/web/src/lib/core/pdf-core.ts` or any
 * `/api/informed-consents/**` route.
 *
 * Hard requirements (all must be present):
 *   - authenticated
 *   - feature flag `ENABLE_DYNAMIC_CONSENT_ENGINE=true` OR `?engine=dynamic-preview`
 *   - `?renderer=legal-grade`
 *   - `?evidence=true`
 *
 * If the binary renderer is unavailable at runtime, returns 501 JSON
 * pointing at the HTML preview / print-to-PDF fallback. No 500s, no
 * uncontrolled errors leaked to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { ENABLE_DYNAMIC_CONSENT_ENGINE } from "@/lib/config/feature-flags";
import { buildExperimentalDynamicConsent } from "@/modules/consent-engine/service";
import type {
  DynamicConsentPayload,
  DynamicConsentLanguage,
} from "@/modules/consent-engine";
import { renderLegalGradeConsentHtml } from "@/modules/consent-engine/legal-grade/legal-grade-renderer";
import { getSpecialtyDemo } from "@/modules/consent-engine/legal-grade/specialty-demos";
import {
  buildLegalEvidencePdfPreview,
  hashJson,
} from "@/modules/consent-engine/pdf-evidence";
import {
  detectPdfBinaryRendererCapability,
  renderHtmlToPdfBinaryPreview,
  PdfBinaryPreviewUnavailableError,
} from "@/modules/consent-engine/pdf-binary";

const HTML_PREVIEW_PATH = "/api/internal/dynamic-consent/preview";

function isEnabled(request: NextRequest): boolean {
  if (ENABLE_DYNAMIC_CONSENT_ENGINE) return true;
  return request.nextUrl.searchParams.get("engine") === "dynamic-preview";
}

function buildSuggestedHtmlPreviewUrl(request: NextRequest): string {
  const sp = new URLSearchParams(request.nextUrl.searchParams);
  sp.set("engine", "dynamic-preview");
  sp.set("renderer", "legal-grade");
  sp.set("evidence", "true");
  return `${HTML_PREVIEW_PATH}?${sp.toString()}`;
}

function unavailableResponse(
  request: NextRequest,
  detail: string,
  reasonCode: string | undefined,
) {
  return NextResponse.json(
    {
      success: false,
      code: "PDF_BINARY_RENDERER_UNAVAILABLE",
      reasonCode: reasonCode ?? "UNKNOWN_ERROR",
      message:
        "No approved PDF binary renderer is available in this environment.",
      detail,
      htmlPreviewAvailable: true,
      printToPdfFallback: true,
      suggestedHtmlPreviewUrl: buildSuggestedHtmlPreviewUrl(request),
    },
    { status: 501 },
  );
}

function buildDefaultSamplePayload(): DynamicConsentPayload {
  return {
    patient: {
      name: "Najib الفلاح",
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
      notesEn:
        "Patient will receive local anesthetic with mild sedation for comfort",
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

export async function GET(request: NextRequest) {
  try {
    if (!isEnabled(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Dynamic consent preview is disabled",
          hint: "Enable with ENABLE_DYNAMIC_CONSENT_ENGINE=true or use ?engine=dynamic-preview",
        },
        { status: 403 },
      );
    }

    const sp = request.nextUrl.searchParams;
    if (sp.get("renderer") !== "legal-grade") {
      return NextResponse.json(
        {
          success: false,
          error: "PDF binary preview requires ?renderer=legal-grade",
        },
        { status: 400 },
      );
    }
    if (sp.get("evidence") !== "true") {
      return NextResponse.json(
        {
          success: false,
          error: "PDF binary preview requires ?evidence=true",
        },
        { status: 400 },
      );
    }

    const auth = await requireAuth(request);
    const generatedBy = auth.email || auth.sub;

    // Build payload (default or specialty demo).
    const demoId = sp.get("demo");
    let payload: DynamicConsentPayload;
    if (demoId) {
      const demo = getSpecialtyDemo(demoId);
      if (!demo) {
        return NextResponse.json(
          { success: false, error: `Unknown demo id: ${demoId}` },
          { status: 400 },
        );
      }
      payload = demo.payload;
    } else {
      payload = buildDefaultSamplePayload();
    }

    const languageParam = sp.get("language");
    if (
      languageParam === "ar" ||
      languageParam === "en" ||
      languageParam === "bilingual"
    ) {
      payload = { ...payload, language: languageParam };
    }

    const result = buildExperimentalDynamicConsent(payload);

    // Always render via legal-grade for this route.
    const html = renderLegalGradeConsentHtml({
      template: result.template,
      payload: result.payload,
      sections: result.sections,
      risks: result.risks,
      alternatives: result.alternatives,
      warnings: result.warnings,
      audit: result.audit,
      generatedAt: result.generatedAt,
      language: payload.language,
    });

    const evidence = buildLegalEvidencePdfPreview({
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

    // Probe capability before attempting render so we can return a clean 501.
    const capability = await detectPdfBinaryRendererCapability();
    if (!capability.available) {
      return unavailableResponse(request, capability.detail, capability.reasonCode);
    }

    try {
      const rendered = await renderHtmlToPdfBinaryPreview({
        html,
        evidencePackage: evidence.evidencePackage,
      });

      // Convert Buffer to a typed array so Next/Edge runtimes accept the body.
      const body = new Uint8Array(
        rendered.buffer.buffer,
        rendered.buffer.byteOffset,
        rendered.buffer.byteLength,
      );

      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": rendered.contentType,
          "Content-Length": String(rendered.byteLength),
          "Content-Disposition": `attachment; filename="${rendered.filename}"`,
          "Cache-Control": "no-store",
          "X-WC-Preview": "dynamic-consent-pdf-binary",
          "X-WC-Renderer": rendered.rendererId,
          "X-WC-Evidence-Id": evidence.evidencePackage.evidenceId,
          "X-WC-Audit-Hash": evidence.evidencePackage.auditHash,
        },
      });
    } catch (err) {
      if (err instanceof PdfBinaryPreviewUnavailableError) {
        return unavailableResponse(
          request,
          err.detail,
          "EXECUTABLE_PATH_UNAVAILABLE",
        );
      }
      // Controlled, internal-only error — do not leak production stack.
      return unavailableResponse(
        request,
        err instanceof Error ? err.message : String(err),
        "UNKNOWN_ERROR",
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
