/**
 * Synthetic render adapter.
 *
 * Bridges the calibration engine to pdf-lib for offline pilot testing. Fills
 * form fields on a source PDF and produces a new buffer for visual regression
 * comparison.
 */

import { PDFDocument } from "pdf-lib";
import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";

export async function fillCandidateWithSyntheticData(
  sourcePdfBuffer: Buffer,
  mappings: CandidateFieldMapping[],
  formData: Record<string, string | string[]>,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(sourcePdfBuffer);
  const form = pdfDoc.getForm();

  for (const mapping of mappings) {
    const value = formData[mapping.ontologyKey];
    if (value === undefined) continue;

    const text = Array.isArray(value) ? value.join(", ") : value;
    const pdfFields = form.getFields();

    // Use the first rectangle's anchor text as a fallback field name.
    const anchor = mapping.rectangles[0]?.anchor;
    const sourceName =
      (anchor && (anchor.kind === "LABEL" || anchor.kind === "SECTION_HEADING") && anchor.text) ||
      mapping.ontologyKey;
    let target = pdfFields.find((f) => f.getName() === sourceName);
    if (!target) {
      target = pdfFields.find((f) => f.getName().toLowerCase().includes(mapping.ontologyKey.toLowerCase()));
    }

    if (target) {
      try {
        if ((target as any).setText) {
          (target as any).setText(text);
        } else if ((target as any).select) {
          (target as any).select(text);
        } else if ((target as any).check) {
          (target as any).check();
        }
      } catch (err) {
        // Some fields may be signatures or read-only.
      }
    }
  }

  return Buffer.from(await pdfDoc.save());
}
