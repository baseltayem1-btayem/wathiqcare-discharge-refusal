/**
 * Internal Signed Informed Consent PDF Preview Endpoint.
 *
 * Returns either a deterministic PDF binary or a controlled 501
 * envelope pointing at the HTML print-to-PDF fallback. Also supports
 * `?format=html` which returns a JSON shape with `{ html, evidence,
 * signatures, suggestedFilename }` for client-side embedding on the
 * internal signed preview page.
 *
 * Strict UAT/sample data only. Default-deny. No production renderer
 * is replaced. No production informed-consent route is touched. No
 * database access. No external services.
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
import {
  buildLegalEvidencePdfPreview,
  hashJson,
} from "@/modules/consent-engine/pdf-evidence";
import {
  detectPdfBinaryRendererCapability,
  renderHtmlToPdfBinaryPreview,
  PdfBinaryPreviewUnavailableError,
} from "@/modules/consent-engine/pdf-binary";

const HTML_FALLBACK_PATH = "/internal/dynamic-consent-signed-preview";

/* eslint-disable @typescript-eslint/no-explicit-any */
const PREVIEW_SIMULATED_SIGNATURES = [
  {
    role: "Patient",
    name: "نجيب الفلاح",
    statement: "تم التوقيع إلكترونياً بواسطة نجيب الفلاح",
  },
  {
    role: "Physician",
    name: "Dr. Ahmed Al-Salmi",
    statement: "Signed electronically by Dr. Ahmed Al-Salmi",
  },
  {
    role: "Witness",
    name: "UAT Nurse",
    statement: "Witnessed by UAT Nurse",
  },
] as const;

const PREVIEW_SIGNING_METHOD = "PREVIEW_SIMULATED_SIGNATURE";
/* eslint-enable @typescript-eslint/no-explicit-any */

function isEnabled(request: NextRequest): boolean {
  if (ENABLE_DYNAMIC_CONSENT_ENGINE) return true;
  return request.nextUrl.searchParams.get("engine") === "dynamic-preview";
}

function isSignedRequested(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get("signed") === "true";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildUatSamplePayload(language: DynamicConsentLanguage): DynamicConsentPayload {
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
      plannedProcedure: "Diagnostic Cardiac Catheterization",
      department: "Cardiology",
    },
    physician: {
      name: "Dr. Ahmed Al-Salmi",
      identifier: "LIC-ALH-001",
      role: "Cardiologist",
    },
    diagnosis: "Pre-operative informed consent assessment",
    procedure: "Diagnostic Cardiac Catheterization",
    specialty: "CARDIOLOGY",
    language,
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
      witnessRequired: true,
    },
  };
}

function renderQrPlaceholderSvg(payload: string): string {
  // Deterministic 8x8 dotted pseudo-QR — purely visual, NOT a real
  // QR encoding. Driven by a stable hash of the payload so different
  // evidence IDs produce visually-different placeholders.
  const rows = 8;
  const cols = 8;
  let acc = 0;
  for (let i = 0; i < payload.length; i++) {
    acc = (acc * 131 + payload.charCodeAt(i)) >>> 0;
  }
  const cells: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const bit = (acc >>> (idx % 32)) & 1;
      // Force corner markers like a real QR finder pattern.
      const isCornerFrame =
        (r < 3 && (c < 3 || c >= cols - 3)) || (r >= rows - 3 && c < 3);
      const filled = isCornerFrame ? (r % 2 === 0 || c % 2 === 0) : bit === 1;
      if (filled) {
        cells.push(
          `<rect x="${c * 8}" y="${r * 8}" width="8" height="8" fill="#0f172a"/>`,
        );
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="120" height="120" role="img" aria-label="QR placeholder">
    <rect width="64" height="64" fill="#ffffff" stroke="#94a3b8" stroke-dasharray="2 2"/>
    ${cells.join("")}
  </svg>`;
}

function buildSignedOverlayHtml(input: {
  evidenceId: string;
  auditHash: string;
  templateVersion: string;
  verificationUrl: string;
  qrPayload: string;
  generatedAt: string;
}): string {
  const shortHash = input.auditHash.slice(0, 12);
  const signaturesHtml = PREVIEW_SIMULATED_SIGNATURES.map(
    (sig) => `
      <div style="border:1px solid #94a3b8; border-radius:6px; padding:10px; background:#f8fafc;">
        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:#475569; font-weight:700;">${escapeHtml(sig.role)}</div>
        <div style="margin-top:4px; font-family:'Times New Roman', serif; font-style:italic; color:#0f172a; font-size:13px;">${escapeHtml(sig.statement)}</div>
        <div style="margin-top:6px; font-family:monospace; font-size:10px; color:#475569;">method: ${PREVIEW_SIGNING_METHOD}</div>
        <div style="font-family:monospace; font-size:10px; color:#475569;">signed at: ${escapeHtml(input.generatedAt)}</div>
      </div>`,
  ).join("");

  return `
    <section class="lg-section" data-signed-preview="true" style="page-break-inside: avoid; break-inside: avoid;">
      <h2 style="font-size:14px; text-transform:uppercase; letter-spacing:0.08em; color:#0f172a;">
        Simulated Signatures — UAT Preview Only
      </h2>
      <p style="font-size:11px; color:#475569; margin:4px 0 12px;">
        The signatures below are <strong>simulated</strong> for internal
        preview. No e-signature service, OTP, or DocuSign integration is
        used. No database write occurs.
      </p>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;">
        ${signaturesHtml}
      </div>
    </section>
    <section class="lg-section" data-evidence-qr-block="true" style="page-break-inside: avoid; break-inside: avoid; margin-top:16px;">
      <h2 style="font-size:14px; text-transform:uppercase; letter-spacing:0.08em; color:#0f172a;">
        Evidence QR / Barcode (Preview Placeholder)
      </h2>
      <div style="display:grid; grid-template-columns: 140px 1fr; gap:16px; align-items:start;">
        <div>${renderQrPlaceholderSvg(input.qrPayload)}</div>
        <div style="font-family:monospace; font-size:11px; color:#0f172a; line-height:1.5;">
          <div><strong>Evidence ID:</strong> ${escapeHtml(input.evidenceId)}</div>
          <div><strong>Audit hash (short):</strong> ${escapeHtml(shortHash)}</div>
          <div><strong>Template version:</strong> ${escapeHtml(input.templateVersion)}</div>
          <div style="margin-top:6px;"><strong>Verification URL:</strong></div>
          <div style="word-break:break-all;">${escapeHtml(input.verificationUrl)}</div>
          <div style="margin-top:8px; padding:6px 8px; background:#fef3c7; border:1px solid #fcd34d; border-radius:4px; color:#92400e; font-family: inherit;">
            INTERNAL PREVIEW ONLY — NOT ACTIVE IN PRODUCTION
          </div>
        </div>
      </div>
    </section>`;
}

function injectOverlayBeforeBodyClose(html: string, overlay: string): string {
  const idx = html.lastIndexOf("</body>");
  if (idx < 0) return html + overlay;
  return html.slice(0, idx) + overlay + html.slice(idx);
}

function unavailableEnvelope() {
  return {
    success: false,
    code: "PDF_BINARY_RENDERER_UNAVAILABLE",
    htmlPreviewAvailable: true,
    printToPdfFallback: true,
    message: "Use Print / Save as PDF from the preview page.",
    suggestedHtmlPreviewPath: HTML_FALLBACK_PATH,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!isEnabled(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Signed informed consent preview is disabled",
          hint: "Enable with ?engine=dynamic-preview",
        },
        { status: 403 },
      );
    }
    if (!isSignedRequested(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Signed informed consent preview requires ?signed=true",
        },
        { status: 400 },
      );
    }

    const auth = await requireAuth(request);
    const generatedBy = auth.email || auth.sub || "preview-uat";

    const sp = request.nextUrl.searchParams;
    const languageParam = sp.get("language");
    const language: DynamicConsentLanguage =
      languageParam === "ar" || languageParam === "en"
        ? languageParam
        : "bilingual";
    const format = sp.get("format");

    const payload = buildUatSamplePayload(language);
    const result = buildExperimentalDynamicConsent(payload);

    const baseHtml = renderLegalGradeConsentHtml({
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

    const evidence = buildLegalEvidencePdfPreview({
      html: baseHtml,
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

    const overlay = buildSignedOverlayHtml({
      evidenceId: evidence.evidencePackage.evidenceId,
      auditHash: evidence.evidencePackage.auditHash,
      templateVersion: evidence.evidencePackage.templateVersion,
      verificationUrl: `/internal/verify/${encodeURIComponent(
        evidence.evidencePackage.evidenceId,
      )}?engine=dynamic-preview`,
      qrPayload: evidence.evidencePackage.qrPlaceholder.payload,
      generatedAt: result.generatedAt,
    });

    const signedHtml = injectOverlayBeforeBodyClose(baseHtml, overlay);

    const signedFilenameBase = `wathiqcare-signed-informed-consent-preview-${evidence.evidencePackage.evidenceId}`;

    if (format === "html") {
      return NextResponse.json(
        {
          success: true,
          html: signedHtml,
          evidence: evidence.evidencePackage,
          signatures: PREVIEW_SIMULATED_SIGNATURES,
          signingMethod: PREVIEW_SIGNING_METHOD,
          suggestedFilename: `${signedFilenameBase}.pdf`,
          generatedAt: result.generatedAt,
          language,
          warning:
            "INTERNAL PREVIEW ONLY — NOT ACTIVE IN PRODUCTION. UAT/sample data; not legally binding.",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "X-WC-Preview": "dynamic-consent-signed-preview",
            "X-WC-Evidence-Id": evidence.evidencePackage.evidenceId,
          },
        },
      );
    }

    const capability = await detectPdfBinaryRendererCapability();
    if (!capability.available) {
      return NextResponse.json(
        { ...unavailableEnvelope(), detail: capability.detail },
        { status: 501 },
      );
    }

    try {
      const rendered = await renderHtmlToPdfBinaryPreview({
        html: signedHtml,
        evidencePackage: evidence.evidencePackage,
      });
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
          "Content-Disposition": `attachment; filename="${signedFilenameBase}.pdf"`,
          "Cache-Control": "no-store",
          "X-WC-Preview": "dynamic-consent-signed-pdf",
          "X-WC-Renderer": rendered.rendererId,
          "X-WC-Evidence-Id": evidence.evidencePackage.evidenceId,
          "X-WC-Audit-Hash": evidence.evidencePackage.auditHash,
          "X-WC-Signing-Method": PREVIEW_SIGNING_METHOD,
        },
      });
    } catch (err) {
      const detail =
        err instanceof PdfBinaryPreviewUnavailableError
          ? err.detail
          : err instanceof Error
            ? err.message
            : String(err);
      return NextResponse.json(
        { ...unavailableEnvelope(), detail },
        { status: 501 },
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
