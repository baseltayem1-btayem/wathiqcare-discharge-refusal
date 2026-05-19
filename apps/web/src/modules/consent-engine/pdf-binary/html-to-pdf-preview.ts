/**
 * Internal HTML-to-PDF preview renderer.
 *
 * Strictly isolated from production PDF code paths:
 *  - dynamic-imports puppeteer-core and @sparticuz/chromium only when invoked
 *  - never touches `apps/web/src/lib/core/pdf-core.ts` or
 *    `apps/web/src/lib/server/legal-case-pdf-service.ts`
 *  - no remote font fetches, no external network calls
 *  - deterministic page size and margins
 *
 * If capability detection reports "unavailable", call sites MUST NOT invoke
 * this function; the route layer is responsible for returning a 501 instead.
 */

import { buildDeterministicPdfMetadata } from "./pdf-metadata";
import { buildDeterministicPdfFilename } from "./pdf-filename";
import { detectPdfBinaryRendererCapability } from "./pdf-renderer-capabilities";
import type {
  PdfBinaryPreviewInput,
  PdfBinaryPreviewResult,
} from "./pdf-binary-types";

const PAGE_MARGIN_MM = 18;

export class PdfBinaryPreviewUnavailableError extends Error {
  readonly code = "PDF_BINARY_RENDERER_UNAVAILABLE" as const;
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "PdfBinaryPreviewUnavailableError";
    this.detail = detail;
  }
}

export async function renderHtmlToPdfBinaryPreview(
  input: PdfBinaryPreviewInput,
): Promise<PdfBinaryPreviewResult> {
  const capability = await detectPdfBinaryRendererCapability();
  if (!capability.available) {
    throw new PdfBinaryPreviewUnavailableError(capability.detail);
  }

  const metadata = buildDeterministicPdfMetadata(input.evidencePackage);
  const filename = buildDeterministicPdfFilename(input.evidencePackage);
  const format = input.format ?? "A4";

  // Dynamic-import inside the call so the module remains lazy and safe
  // to reference at build time even if Chromium isn't installed locally.
  const [{ default: puppeteer }, chromiumModule] = await Promise.all([
    import("puppeteer-core"),
    import("@sparticuz/chromium"),
  ]);
  const chromium = (chromiumModule as { default: typeof chromiumModule.default })
    .default;

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1240, height: 1754 },
    executablePath,
    headless: true,
  });

  let buffer: Buffer;
  try {
    const page = await browser.newPage();
    // setContent with `domcontentloaded` — no remote network waits.
    await page.setContent(input.html, { waitUntil: "domcontentloaded" });

    // Apply PDF document metadata via the DevTools protocol where possible.
    // (Puppeteer's `page.pdf` does not expose Title/Author directly; the
    // <title> tag in the HTML preview already carries the title. Additional
    // metadata fields are preserved on the returned result for callers.)
    const raw = await page.pdf({
      format,
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: `${PAGE_MARGIN_MM}mm`,
        right: `${PAGE_MARGIN_MM}mm`,
        bottom: `${PAGE_MARGIN_MM}mm`,
        left: `${PAGE_MARGIN_MM}mm`,
      },
    });
    buffer = Buffer.from(raw);
  } finally {
    await browser.close().catch(() => {
      /* swallow — preview pipeline only */
    });
  }

  return {
    buffer,
    contentType: "application/pdf",
    filename,
    byteLength: buffer.length,
    rendererId: capability.rendererId ?? "puppeteer-core+sparticuz-chromium",
    metadata,
  };
}
