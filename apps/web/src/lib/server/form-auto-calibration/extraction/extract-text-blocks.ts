/**
 * Extract text blocks from a PDF using pdfjs-dist.
 *
 * Coordinates are returned in PDF points with the PDF bottom-left origin, plus
 * normalised coordinates relative to page width/height.
 */

import type { TextBlock, ExtractedDocumentLayout } from "./document-layout-types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function extractTextBlocksFromPdf(
  pdfBytes: Uint8Array,
): Promise<ExtractedDocumentLayout> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    disableWorker: true,
    isEvalSupported: false,
  } as never);

  const pdf = await loadingTask.promise;
  const pages: ExtractedDocumentLayout["pages"] = [];
  let pageSizePoints = { width: 0, height: 0 };

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const textBlocks: TextBlock[] = [];

    if (pageNumber === 1) {
      pageSizePoints = { width: viewport.width, height: viewport.height };
    }

    for (const rawItem of textContent.items as Array<Record<string, unknown>>) {
      const str = typeof rawItem.str === "string" ? normalizeText(rawItem.str) : "";
      const transform = Array.isArray(rawItem.transform) ? rawItem.transform : [];
      const x = Number(transform[4] ?? 0);
      const y = Number(transform[5] ?? 0);
      const width = Number(rawItem.width ?? 0);
      const height = Number(rawItem.height ?? transform[3] ?? 10);

      if (!str) continue;

      textBlocks.push({
        page: pageNumber,
        text: str,
        x,
        y,
        width,
        height,
        xNorm: clamp(x / viewport.width),
        yNorm: clamp(y / viewport.height),
        widthNorm: clamp(width / viewport.width),
        heightNorm: clamp(height / viewport.height),
        fontName: typeof rawItem.fontName === "string" ? rawItem.fontName : undefined,
        fontSize: typeof rawItem.height === "number" ? height : undefined,
      });
    }

    pages.push({
      pageNumber,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
      textBlocks,
      writingLines: [],
      checkboxes: [],
      signatureRegions: [],
      columns: null,
    });
  }

  return {
    pageCount: pdf.numPages,
    pageSizePoints,
    pages,
  };
}
