import { getPdfFontStack } from "@/lib/pdf-engine/core/pdf-fonts";
import { escapeHtml } from "@/lib/pdf-engine/core/pdf-layout";
import type { PdfHtmlRenderContext } from "@/lib/pdf-engine/core/pdf-types";
import { renderImcLetterhead } from "@/lib/pdf-engine/branding/imc-letterhead";
import { renderWathiqCareFooter } from "@/lib/pdf-engine/branding/wathiqcare-footer";
import { renderPdfWatermark } from "@/lib/pdf-engine/branding/watermark";

export interface PdfShellRenderContext extends PdfHtmlRenderContext {
  referenceNumber: string;
  version: string;
  generatedAt: string;
  hospitalName?: string;
  department?: string;
  watermarkLabel?: string;
  qrPayload?: string | null;
  documentHash?: string | null;
  evidenceId?: string;
  auditReferenceId?: string | null;
  immutableSeal?: string | null;
  forensicChainReference?: string | null;
  evidenceVerificationStatus?: string | null;
  legalRetentionNotice?: string | null;
  retentionClass?: string | null;
  archiveReference?: string | null;
  forensicVerificationReference?: string | null;
  judicialExportReference?: string | null;
  verificationIntegrityIndicator?: string | null;
}

export function renderPdfDocumentShell(context: PdfShellRenderContext): string {
  return `<!DOCTYPE html>
<html lang="${context.lang}" dir="${context.dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(context.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --wc-primary: #0e376d;
        --wc-primary-soft: #e9f0f9;
        --wc-border: #d4dce8;
        --wc-text: #10253f;
        --wc-muted: #5d6f86;
        --wc-surface: #ffffff;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f4f7fb;
        color: var(--wc-text);
        font-family: ${getPdfFontStack(context.lang)};
        line-height: 1.45;
      }
      .wc-pdf-page {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        background: var(--wc-surface);
        padding: 18mm 16mm 20mm;
        position: relative;
      }
      .wc-pdf-watermark {
        position: absolute;
        top: 34%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-24deg);
        color: rgba(14, 55, 109, 0.08);
        font-size: 40px;
        font-weight: 700;
        letter-spacing: 0.18em;
        pointer-events: none;
        white-space: nowrap;
      }
      .wc-pdf-letterhead,
      .wc-pdf-footer,
      .wc-pdf-section {
        border: 1px solid var(--wc-border);
        border-radius: 12px;
        background: #fbfcfe;
      }
      .wc-pdf-letterhead {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 14px;
        margin-bottom: 16px;
      }
      .wc-pdf-letterhead-cluster { display: flex; gap: 12px; align-items: flex-start; }
      .wc-pdf-letterhead-logo {
        min-width: 132px;
        border: 1px dashed #aac0dd;
        border-radius: 10px;
        padding: 10px 12px;
        color: var(--wc-muted);
        text-align: center;
        font-size: 12px;
      }
      .wc-pdf-hospital-name { font-size: 18px; font-weight: 700; color: var(--wc-primary); }
      .wc-pdf-department, .wc-pdf-brand-subtitle, .wc-pdf-brand-meta, .wc-pdf-legal-footer, .wc-pdf-footer-row { color: var(--wc-muted); }
      .wc-pdf-brand-name { font-size: 22px; font-weight: 700; color: var(--wc-primary); }
      .wc-pdf-content { display: grid; gap: 14px; position: relative; z-index: 1; }
      .wc-pdf-section-title {
        margin: 0;
        padding: 10px 12px;
        background: var(--wc-primary-soft);
        color: var(--wc-primary);
        font-size: 14px;
        font-weight: 700;
      }
      .wc-pdf-section-body { padding: 12px; }
      .wc-pdf-kv-row {
        display: grid;
        grid-template-columns: minmax(140px, 220px) 1fr;
        gap: 10px;
        padding: 7px 0;
        border-bottom: 1px solid #edf1f7;
      }
      .wc-pdf-kv-row:last-child { border-bottom: 0; }
      .wc-pdf-kv-label { font-weight: 600; color: var(--wc-primary); }
      .wc-pdf-kv-value { word-break: break-word; }
      .wc-pdf-footer { margin-top: 16px; padding: 12px 14px; display: grid; gap: 6px; font-size: 12px; }
      .wc-pdf-footer-title { font-weight: 700; color: var(--wc-primary); }
      .wc-pdf-note { margin-top: 10px; font-size: 12px; color: var(--wc-muted); }
      .wc-pdf-qr-placeholder {
        min-height: 112px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px dashed #aac0dd;
        border-radius: 10px;
        background: #fbfcff;
        padding: 12px;
        text-align: center;
      }
      .wc-pdf-qr-image { width: 110px; height: 110px; object-fit: contain; }
    </style>
  </head>
  <body>
    <main class="wc-pdf-page">
      ${renderPdfWatermark({ label: context.watermarkLabel || context.referenceNumber })}
      ${renderImcLetterhead({
        hospitalName: context.hospitalName || "International Medical Center (IMC)",
        department: context.department || "Medico-Legal Evidence Department",
        referenceNumber: context.referenceNumber,
        version: context.version,
        generatedAt: context.generatedAt,
      })}
      <section class="wc-pdf-content">${context.bodyHtml}</section>
      ${renderWathiqCareFooter({
        legalFooterText: context.footerText,
        qrPayload: context.qrPayload || null,
        documentHash: context.documentHash || null,
        evidenceId: context.evidenceId || context.referenceNumber,
        auditReferenceId: context.auditReferenceId || null,
        immutableSeal: context.immutableSeal || null,
        forensicChainReference: context.forensicChainReference || null,
        evidenceVerificationStatus: context.evidenceVerificationStatus || null,
        legalRetentionNotice: context.legalRetentionNotice || null,
        retentionClass: context.retentionClass || null,
        archiveReference: context.archiveReference || null,
        forensicVerificationReference: context.forensicVerificationReference || null,
        judicialExportReference: context.judicialExportReference || null,
        verificationIntegrityIndicator: context.verificationIntegrityIndicator || null,
      })}
    </main>
  </body>
</html>`;
}

export function renderPdfHtmlDocument(context: PdfHtmlRenderContext): string {
  return renderPdfDocumentShell({
    ...context,
    referenceNumber: context.title,
    version: "v1.0",
    generatedAt: new Date().toISOString(),
  });
}