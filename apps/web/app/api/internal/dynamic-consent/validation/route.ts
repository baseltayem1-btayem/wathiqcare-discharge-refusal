/**
 * Internal-only dynamic consent validation report endpoint.
 *
 * Aggregates static + deterministic validators into a single JSON report
 * for the Phase 6 validation surface. Read-only. Does NOT touch any
 * production code paths or persistent state.
 *
 * Guards:
 *   - authenticated
 *   - ENABLE_DYNAMIC_CONSENT_ENGINE=true OR ?engine=dynamic-preview
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { ENABLE_DYNAMIC_CONSENT_ENGINE } from "@/lib/config/feature-flags";
import { buildExperimentalDynamicConsent } from "@/modules/consent-engine/service";
import { renderLegalGradeConsentHtml } from "@/modules/consent-engine/legal-grade/legal-grade-renderer";
import {
  getSpecialtyDemo,
  type SpecialtyDemoId,
} from "@/modules/consent-engine/legal-grade/specialty-demos";
import type { DynamicConsentLanguage } from "@/modules/consent-engine";
import { detectPdfBinaryRendererCapability } from "@/modules/consent-engine/pdf-binary";
import {
  buildReport,
  validateRtlRendering,
  validateSignatureLayout,
  validatePrintLayout,
  validatePdfLayout,
  validateSpecialtyDemos,
  validateDeterminism,
  listScreenshotManifest,
} from "@/modules/consent-engine/validation";

function isEnabled(request: NextRequest): boolean {
  if (ENABLE_DYNAMIC_CONSENT_ENGINE) return true;
  return request.nextUrl.searchParams.get("engine") === "dynamic-preview";
}

const FALLBACK_DEMO: SpecialtyDemoId = "cardiology";

export async function GET(request: NextRequest) {
  try {
    if (!isEnabled(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Dynamic consent validation is disabled",
          hint: "Enable with ENABLE_DYNAMIC_CONSENT_ENGINE=true or use ?engine=dynamic-preview",
        },
        { status: 403 },
      );
    }

    await requireAuth(request);

    const sp = request.nextUrl.searchParams;
    const demoParam = sp.get("demo");
    const langParam = sp.get("language");
    const language: DynamicConsentLanguage =
      langParam === "ar" || langParam === "en" || langParam === "bilingual"
        ? langParam
        : "bilingual";

    const demo = demoParam
      ? getSpecialtyDemo(demoParam) ?? getSpecialtyDemo(FALLBACK_DEMO)
      : getSpecialtyDemo(FALLBACK_DEMO);

    if (!demo) {
      // Should never happen — cardiology is always defined.
      return NextResponse.json(
        { success: false, error: "Fallback specialty demo unavailable" },
        { status: 500 },
      );
    }

    const payload = { ...demo.payload, language };
    const result = buildExperimentalDynamicConsent(payload);
    const html = renderLegalGradeConsentHtml({
      template: result.template,
      payload: result.payload,
      sections: result.sections,
      risks: result.risks,
      alternatives: result.alternatives,
      warnings: result.warnings,
      audit: result.audit,
      generatedAt: result.generatedAt,
      language,
    });

    const capability = await detectPdfBinaryRendererCapability();

    const rtl = validateRtlRendering({ html, language });
    const signatures = validateSignatureLayout({ html });
    const printSection = validatePrintLayout({ html });
    const layout = validatePdfLayout({
      html,
      expectedEvidenceId: result.audit.hash,
      expectedAuditHash: result.audit.hash,
    });
    const specialty = validateSpecialtyDemos();
    const determinism = validateDeterminism({ iterations: 3 });

    const generatedAt = new Date().toISOString();
    const report = buildReport(
      [
        layout,
        rtl,
        signatures,
        printSection,
        specialty.section,
        determinism.section,
      ],
      [
        "Internal preview-only validation. No production code modified.",
        capability.available
          ? `PDF binary renderer available via ${capability.rendererId ?? "unknown-renderer"}.`
          : `PDF binary renderer unavailable: ${capability.detail}`,
        "Automated Chrome vs Edge cross-browser comparison is NOT performed in this phase.",
        "Arabic typesetting is heuristically checked only; production readiness is NOT claimed.",
      ],
      generatedAt,
    );

    return NextResponse.json(
      {
        success: true,
        renderer: "legal-grade",
        sampledDemo: demo.id,
        sampledLanguage: language,
        rendererCapability: capability,
        report,
        specialtyDemos: specialty.perDemo,
        determinismDrifts: determinism.drifts,
        screenshotManifest: listScreenshotManifest(),
        evidence: {
          templateId: result.template.id,
          templateVersion: result.template.version,
          auditHash: result.audit.hash,
          payloadFingerprint: result.audit.payloadFingerprint,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-WC-Preview": "dynamic-consent-validation",
        },
      },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
