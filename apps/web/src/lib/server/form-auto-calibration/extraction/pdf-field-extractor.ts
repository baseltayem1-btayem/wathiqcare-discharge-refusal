/**
 * AcroForm field extractor.
 *
 * Extracts the names and rectangles of all interactive fields in a blank PDF.
 * Used by the calibration engine when a full layout pipeline is not required.
 */

import { PDFDocument } from "pdf-lib";
import type { NormalizedRectangle } from "../mapping/mapping-schema";

export type ExtractedPdfField = {
  name: string;
  label?: string;
  page: number; // 0-based index
  rect: NormalizedRectangle;
};

export async function extractFieldsFromPdf(pdfBuffer: Buffer): Promise<ExtractedPdfField[]> {
  const doc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
  const form = doc.getForm();
  const fields = form.getFields();
  const result: ExtractedPdfField[] = [];

  for (const pdfField of fields) {
    try {
      const widgets = pdfField.acroField.getWidgets();
      for (const widget of widgets) {
        const pageRef = widget.P();
        let pageIndex = -1;
        if (pageRef) {
          const pages = doc.getPages();
          pageIndex = pages.findIndex((p) => p.ref === pageRef);
        }
        if (pageIndex < 0) pageIndex = 0;

        const page = doc.getPage(pageIndex);
        const rect = widget.getRectangle();
        const width = page.getWidth();
        const height = page.getHeight();

        result.push({
          name: pdfField.getName(),
          page: pageIndex,
          rect: {
            x: rect.x / width,
            y: rect.y / height,
            width: rect.width / width,
            height: rect.height / height,
          },
        });
      }
    } catch {
      // Some fields may not expose widgets; skip them.
    }
  }

  return result;
}
