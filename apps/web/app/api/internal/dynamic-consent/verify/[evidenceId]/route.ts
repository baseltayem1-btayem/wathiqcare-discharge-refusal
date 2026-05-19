/**
 * Internal-only Verification Preview API.
 *
 * Returns a synthetic verification payload for evidence IDs that start
 * with `EV-`. No database lookups, no writes, no real legal verification.
 *
 * Hard guards:
 *   - authenticated (`requireAuth`)
 *   - feature flag `ENABLE_DYNAMIC_CONSENT_ENGINE=true` OR `?engine=dynamic-preview`
 *
 * Production verification portal at `/verify/<evidenceId>` is NOT created
 * by this route; this is the internal preview shape only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { ENABLE_DYNAMIC_CONSENT_ENGINE } from "@/lib/config/feature-flags";
import { buildExperimentalDynamicConsent } from "@/modules/consent-engine/service";
import { getSpecialtyDemo } from "@/modules/consent-engine/legal-grade/specialty-demos";
import {
  buildLegalEvidencePdfPreview,
  hashJson,
} from "@/modules/consent-engine/pdf-evidence";

function isEnabled(request: NextRequest): boolean {
  if (ENABLE_DYNAMIC_CONSENT_ENGINE) return true;
  return request.nextUrl.searchParams.get("engine") === "dynamic-preview";
}

function maskMrn(mrn: string): string {
  if (!mrn) return "";
  if (mrn.length <= 4) return "****";
  return `${mrn.slice(0, 3)}***${mrn.slice(-2)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  try {
    if (!isEnabled(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification preview is disabled",
          hint: "Enable with ENABLE_DYNAMIC_CONSENT_ENGINE=true or use ?engine=dynamic-preview",
        },
        { status: 403 },
      );
    }

    await requireAuth(request);

    const { evidenceId } = await params;

    if (!evidenceId || !evidenceId.startsWith("EV-")) {
      return NextResponse.json(
        {
          success: false,
          status: "NOT_FOUND",
          error:
            "Verification preview only resolves sample evidence IDs prefixed with EV-.",
          evidenceId: evidenceId ?? null,
        },
        { status: 404 },
      );
    }

    // Build a deterministic sample package from the cardiology demo.
    const demo = getSpecialtyDemo("cardiology");
    if (!demo) {
      return NextResponse.json(
        { success: false, status: "INTERNAL_ERROR", error: "Sample demo unavailable" },
        { status: 500 },
      );
    }

    const result = buildExperimentalDynamicConsent(demo.payload);
    const preview = buildLegalEvidencePdfPreview({
      html: "",
      templateId: result.template.id,
      templateVersion: result.template.version,
      templateHash: hashJson(result.template),
      payloadHash: result.audit.payloadFingerprint,
      auditHash: result.audit.hash,
      patientMrn: result.payload.patient.identifier ?? "",
      encounterNo: result.payload.encounter.encounterNumber ?? "",
      caseNumber: result.payload.encounter.caseNumber ?? "",
      generatedAt: result.generatedAt,
      generatedBy: "verification-preview",
      evidenceId,
    });

    const evidence = preview.evidencePackage;

    return NextResponse.json(
      {
        success: true,
        status: "PREVIEW_ONLY",
        evidenceId,
        verification: {
          authenticity: "preview-not-legally-binding",
          hashStatus: "not-validated-against-database",
          signerChainStatus: "placeholder",
          qrStatus: "placeholder",
        },
        metadata: {
          templateId: evidence.templateId,
          templateVersion: evidence.templateVersion,
          patientMrnMasked: maskMrn(evidence.patientMrn),
          encounterNo: evidence.encounterNo,
          caseNumber: evidence.caseNumber,
          generatedAt: evidence.generatedAt,
          generatedBy: evidence.generatedBy,
          auditHash: evidence.auditHash,
          templateHash: evidence.templateHash,
          payloadHash: evidence.payloadHash,
          verificationUrl: evidence.verificationUrl,
          qrPlaceholder: evidence.qrPlaceholder,
          legalFooter: evidence.legalFooter,
        },
        warning:
          "This is an internal verification preview and is NOT final legal verification.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-WC-Preview": "dynamic-consent-verification",
        },
      },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
