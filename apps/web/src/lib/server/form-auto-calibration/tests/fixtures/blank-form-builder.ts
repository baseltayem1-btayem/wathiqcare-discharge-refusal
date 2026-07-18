/**
 * Test fixture builder: create blank PDFs with AcroForm fields and text labels.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function createBlankPdfWithFields(
  fields: Array<{
    name: string;
    label?: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type?: "text" | "checkbox";
  }>,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const maxPage = Math.max(1, ...fields.map((f) => f.page + 1));
  for (let i = 0; i < maxPage; i++) {
    pdfDoc.addPage([612, 792]);
  }

  const form = pdfDoc.getForm();
  for (const field of fields) {
    const page = pdfDoc.getPage(field.page);
    if (field.label) {
      page.drawText(field.label, {
        x: field.x,
        y: field.y + field.height + 2,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    }
    if (field.type === "checkbox") {
      form.createCheckBox(field.name).addToPage(page, {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      });
    } else {
      form.createTextField(field.name).addToPage(page, {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

export async function createMinimalBlankPdf(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([612, 792]);
  return Buffer.from(await pdfDoc.save());
}
