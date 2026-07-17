/**
 * Field-addressed PDF renderer.
 *
 * Uses the verified AcroForm manifest only as a machine-readable map of target
 * rectangles. Values are rendered onto the canonical approved static PDF, then
 * the derivative is flattened so no AcroForm, JavaScript, OpenAction, or active
 * actions remain.
 */

import type { Browser } from "puppeteer";
import { PDFArray, PDFDict, PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import { isArabicText, normalizeArabicText } from "@/lib/pdf-engine/core/pdf-rtl";
import type { AcroFormTemplateManifest } from "./field-addressed-template-manifest";
import { parseWidgetRect } from "./field-addressed-template-manifest";
import {
  buildInlinePdfFontFaceCss,
  buildOverlayPrepareScript,
  extractCoverageTestStrings,
  resolveFieldFitSpec,
} from "./field-addressed-overlay-helpers";

export type FieldAddressedRenderValue =
  | { kind: "text"; value: string }
  | { kind: "checkbox"; checked: boolean }
  | { kind: "signature"; imageDataUrl: string };

export type FieldAddressedRenderInput = {
  values: Record<string, FieldAddressedRenderValue>;
  /** Optional evidence metadata to stamp (never PHI). */
  evidenceStamp?: {
    documentId: string;
    signatureId: string | null;
    signedAtEn: string | null;
    verificationUrl: string | null;
  };
};

export type FieldAddressedRenderResult = {
  bytes: Uint8Array;
  summary: {
    pages: number;
    pageWidth: number;
    pageHeight: number;
    fieldsRendered: string[];
    widgetsRendered: number;
    signaturesRendered: string[];
    checkboxesRendered: string[];
    flattened: boolean;
  };
};

export type FieldAddressedRenderContext = {
  canonicalPdfBytes: Uint8Array;
  manifest: AcroFormTemplateManifest;
  browser: Browser;
};

const CHECKMARK_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTextOverlayHtml(args: {
  manifest: AcroFormTemplateManifest;
  values: Record<string, FieldAddressedRenderValue>;
  pageIndex: number;
}): { html: string | null; drawn: number } {
  const { manifest, values, pageIndex } = args;
  const pageNumber = pageIndex + 1;
  const { width: pageWidth, height: pageHeight } = manifest.canonicalApprovedPdf.pageSizePoints;

  const markup: string[] = [];

  for (const field of manifest.fields) {
    const value = values[field.name];
    if (!value) continue;

    for (const widget of field.widgets) {
      if (widget.page !== pageNumber) continue;

      const rect = parseWidgetRect(widget.rect);
      const cssLeft = rect.left;
      const cssTop = pageHeight - rect.top;
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      if (value.kind === "checkbox" && field.type === "/Btn") {
        if (!value.checked) continue;
        markup.push(`
          <div class="field-checkbox" style="left:${cssLeft}px;top:${cssTop}px;width:${cssWidth}px;height:${cssHeight}px;">
            ${CHECKMARK_SVG}
          </div>
        `);
      } else if (value.kind === "text" && field.type === "/Tx") {
        const rawText = normalizeArabicText(value.value);
        if (!rawText) continue;
        const isArabic = isArabicText(rawText) || field.language === "AR";
        const fitSpec = resolveFieldFitSpec({
          fieldName: field.name,
          cssHeight,
          multiline: field.multiline === true,
          autofit: field.autofit === true,
          isArabic,
        });
        const fitAttrs = [
          `data-fit="${fitSpec.mode}"`,
          `data-min-font-size="${fitSpec.minFontSize}"`,
          `data-max-font-size="${fitSpec.maxFontSize}"`,
          `data-line-height="${fitSpec.lineHeight}"`,
          fitSpec.maxLines !== undefined ? `data-max-lines="${fitSpec.maxLines}"` : "",
        ]
          .filter(Boolean)
          .join(" ");
        markup.push(`
          <div
            class="field-text ${isArabic ? "field-text-ar" : "field-text-en"}"
            style="left:${cssLeft}px;top:${cssTop}px;width:${cssWidth}px;height:${cssHeight}px;font-size:${fitSpec.maxFontSize}px;"
            dir="${isArabic ? "rtl" : "ltr"}"
            lang="${isArabic ? "ar" : "en"}"
            ${fitAttrs}
          >${escapeHtml(rawText)}</div>
        `);
      }
    }
  }

  if (markup.length === 0) {
    return { html: null, drawn: 0 };
  }

  const html = `
    <!doctype html>
    <html lang="ar">
      <head>
        <meta charset="utf-8" />
        <style>
          ${buildInlinePdfFontFaceCss()}
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: ${pageWidth}px;
            height: ${pageHeight}px;
            background: transparent;
            font-family: "WathiqOverlaySans", "WathiqOverlayArabic", Arial, sans-serif;
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
          }
          .field-text {
            position: absolute;
            overflow: hidden;
            padding: 1px 2px;
            color: #0d2c57;
            line-height: 1.25;
            white-space: pre-wrap;
            word-break: normal;
            overflow-wrap: anywhere;
            background: transparent;
          }
          .field-text-en {
            font-family: "WathiqOverlaySans", Arial, sans-serif;
            text-align: left;
          }
          .field-text-ar {
            font-family: "WathiqOverlayArabic", "WathiqOverlaySans", Tahoma, Arial, sans-serif;
            text-align: right;
            direction: rtl;
            unicode-bidi: plaintext;
          }
          .field-checkbox {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0d2c57;
          }
          .field-checkbox svg {
            width: 70%;
            height: 70%;
          }
        </style>
      </head>
      <body>
        ${markup.join("")}
      </body>
    </html>
  `;

  return { html, drawn: markup.length };
}

async function renderOverlayPng(
  browser: Browser,
  html: string,
  width: number,
  height: number,
  values?: Record<string, FieldAddressedRenderValue>,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: Math.ceil(width), height: Math.ceil(height), deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("screen");

    const { arabic, latin } = values ? extractCoverageTestStrings(values) : { arabic: [], latin: [] };
    const prepareScript = buildOverlayPrepareScript({ arabicStrings: arabic, latinStrings: latin });

    await page.evaluate(prepareScript);

    const overlayErrors =
      (await page.evaluate(() => {
        const errors = (window as { __overlayErrors?: string[] }).__overlayErrors;
        return Array.isArray(errors) ? errors : [];
      })) ?? [];

    if (overlayErrors.length > 0) {
      const diagnostics = overlayErrors.join("; ");
      throw new Error(`Overlay rendering failed: ${diagnostics}`);
    }

    return Buffer.from(
      await page.screenshot({
        type: "png",
        omitBackground: true,
      }),
    );
  } finally {
    await page.close();
  }
}

function decodeSignatureImageDataUrl(value: string): { mimeType: "image/png" | "image/jpeg"; bytes: Buffer } | null {
  const match = value.match(/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const subtype = match[1].toLowerCase();
  const encoded = match[2].replace(/\s+/g, "");
  if (!encoded) return null;
  return {
    mimeType: subtype === "png" ? "image/png" : "image/jpeg",
    bytes: Buffer.from(encoded, "base64"),
  };
}

async function drawSignatures(args: {
  pdfDoc: PDFDocument;
  manifest: AcroFormTemplateManifest;
  values: Record<string, FieldAddressedRenderValue>;
}): Promise<string[]> {
  const { pdfDoc, manifest, values } = args;
  const drawn: string[] = [];
  const pages = pdfDoc.getPages();

  for (const field of manifest.fields) {
    const value = values[field.name];
    if (!value || value.kind !== "signature" || field.type !== "/Sig") continue;

    const decoded = decodeSignatureImageDataUrl(value.imageDataUrl);
    if (!decoded) continue;

    const img =
      decoded.mimeType === "image/png"
        ? await pdfDoc.embedPng(decoded.bytes)
        : await pdfDoc.embedJpg(decoded.bytes);

    for (const widget of field.widgets) {
      const pageIndex = widget.page - 1;
      const page = pages[pageIndex];
      if (!page) continue;

      const rect = parseWidgetRect(widget.rect);
      const boxWidth = rect.width;
      const boxHeight = rect.height;
      const minWidth = Math.min(40, page.getWidth() * 0.065);
      const minHeight = Math.min(16, page.getHeight() * 0.02);
      const effectiveWidth = Math.max(boxWidth, minWidth);
      const effectiveHeight = Math.max(boxHeight, minHeight);

      const scaled = img.scale(1);
      const scale = Math.min(effectiveWidth / scaled.width, effectiveHeight / scaled.height);
      if (!Number.isFinite(scale) || scale <= 0) continue;

      const width = scaled.width * scale;
      const height = scaled.height * scale;
      const x = rect.left;
      const y = rect.bottom + Math.max(0, (effectiveHeight - height) / 2);

      page.drawImage(img, { x, y, width, height });
      drawn.push(field.name);
    }
  }

  return drawn;
}

async function drawTextOverlays(args: {
  pdfDoc: PDFDocument;
  manifest: AcroFormTemplateManifest;
  values: Record<string, FieldAddressedRenderValue>;
  browser: Browser;
}): Promise<{ fieldsRendered: string[]; widgetsRendered: number }> {
  const { pdfDoc, manifest, values, browser } = args;
  const pages = pdfDoc.getPages();
  const { width: pageWidth, height: pageHeight } = manifest.canonicalApprovedPdf.pageSizePoints;

  const fieldsRendered = new Set<string>();
  let widgetsRendered = 0;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const overlay = buildTextOverlayHtml({ manifest, values, pageIndex });
    if (!overlay.html) continue;

    const pngBytes = await renderOverlayPng(browser, overlay.html, pageWidth, pageHeight, values);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const page = pages[pageIndex];
    page.drawImage(pngImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    widgetsRendered += overlay.drawn;

    for (const field of manifest.fields) {
      const value = values[field.name];
      if (!value) continue;
      const hasWidgetOnPage = field.widgets.some((w) => w.page === pageIndex + 1);
      if (hasWidgetOnPage) fieldsRendered.add(field.name);
    }
  }

  return { fieldsRendered: Array.from(fieldsRendered), widgetsRendered };
}

async function redrawPagination(pdfDoc: PDFDocument): Promise<void> {
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  if (totalPages === 0) return;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const footerY = 18;
  const footerHeight = 22;
  const footerLeft = 360;
  const footerWidth = 220;

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const pageNumber = index + 1;

    page.drawRectangle({
      x: footerLeft,
      y: footerY,
      width: footerWidth,
      height: footerHeight,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Page ${pageNumber} of ${totalPages}`, {
      x: footerLeft + 4,
      y: footerY + 6,
      size: 8,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
}

export function flattenPdfDocument(pdfDoc: PDFDocument): void {
  const catalog = pdfDoc.catalog;

  // Remove AcroForm
  if (catalog.lookup(PDFName.of("AcroForm"))) {
    catalog.delete(PDFName.of("AcroForm"));
  }

  // Remove OpenAction
  if (catalog.lookup(PDFName.of("OpenAction"))) {
    catalog.delete(PDFName.of("OpenAction"));
  }

  // Remove document-level JavaScript / Names
  const names = catalog.lookup(PDFName.of("Names"));
  if (names instanceof PDFDict) {
    if (names.lookup(PDFName.of("JavaScript"))) {
      names.delete(PDFName.of("JavaScript"));
    }
  }

  // Remove widget annotations from all pages to ensure no editable fields remain.
  for (const page of pdfDoc.getPages()) {
    if (page.node.lookupMaybe(PDFName.of("Annots"), PDFArray)) {
      page.node.set(PDFName.of("Annots"), pdfDoc.context.obj([]));
    }
  }
}

async function validateAndPreparePdf(args: {
  manifest: AcroFormTemplateManifest;
  pdfDoc: PDFDocument;
}): Promise<void> {
  const { manifest, pdfDoc } = args;
  const pages = pdfDoc.getPages();

  if (pages.length !== manifest.canonicalApprovedPdf.pageCount) {
    throw new Error(
      `Page count mismatch: canonical PDF has ${pages.length} pages, manifest expects ${manifest.canonicalApprovedPdf.pageCount}.`,
    );
  }

  for (const page of pages) {
    if (
      Math.abs(page.getWidth() - manifest.canonicalApprovedPdf.pageSizePoints.width) > 0.5 ||
      Math.abs(page.getHeight() - manifest.canonicalApprovedPdf.pageSizePoints.height) > 0.5
    ) {
      throw new Error("Canonical PDF page dimensions do not match manifest.");
    }
  }
}

export type FieldAddressedOverlayResult = {
  fieldsRendered: string[];
  widgetsRendered: number;
  signaturesRendered: string[];
  checkboxesRendered: string[];
};

export async function renderFieldAddressedOverlays(args: {
  pdfDoc: PDFDocument;
  manifest: AcroFormTemplateManifest;
  values: Record<string, FieldAddressedRenderValue>;
  browser: Browser;
}): Promise<FieldAddressedOverlayResult> {
  const { pdfDoc, manifest, values, browser } = args;
  await validateAndPreparePdf({ manifest, pdfDoc });

  const { fieldsRendered, widgetsRendered } = await drawTextOverlays({
    pdfDoc,
    manifest,
    values,
    browser,
  });

  const signaturesRendered = await drawSignatures({ pdfDoc, manifest, values });
  const checkboxesRendered = fieldsRendered.filter((name) => {
    const field = manifest.fields.find((f) => f.name === name);
    return field?.type === "/Btn";
  });

  return {
    fieldsRendered,
    widgetsRendered,
    signaturesRendered,
    checkboxesRendered,
  };
}

export async function renderFieldAddressedPdf(args: {
  canonicalPdfBytes: Uint8Array;
  manifest: AcroFormTemplateManifest;
  input: FieldAddressedRenderInput;
  browser: Browser;
}): Promise<FieldAddressedRenderResult> {
  const { canonicalPdfBytes, manifest, input, browser } = args;

  const pdfDoc = await PDFDocument.load(canonicalPdfBytes, { updateMetadata: false });
  const pages = pdfDoc.getPages();

  const overlayResult = await renderFieldAddressedOverlays({
    pdfDoc,
    manifest,
    values: input.values,
    browser,
  });

  await redrawPagination(pdfDoc);
  flattenPdfDocument(pdfDoc);

  const bytes = await pdfDoc.save({
    useObjectStreams: false,
    updateFieldAppearances: false,
  });

  return {
    bytes,
    summary: {
      pages: pages.length,
      pageWidth: manifest.canonicalApprovedPdf.pageSizePoints.width,
      pageHeight: manifest.canonicalApprovedPdf.pageSizePoints.height,
      fieldsRendered: overlayResult.fieldsRendered,
      widgetsRendered: overlayResult.widgetsRendered,
      signaturesRendered: overlayResult.signaturesRendered,
      checkboxesRendered: overlayResult.checkboxesRendered,
      flattened: true,
    },
  };
}
