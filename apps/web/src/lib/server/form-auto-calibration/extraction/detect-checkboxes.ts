/**
 * Detect checkbox regions from text content.
 *
 * This initial implementation uses label hints (e.g. "☐", "☑", "[ ]", "[x]")
 * and common checkbox-associated words. Future iterations can augment this
 * with raster shape detection.
 */

import type { ExtractedDocumentLayout, CheckboxRegion } from "./document-layout-types";

const CHECKBOX_SYMBOLS = ["☐", "☑", "☒", "▢", "◻", "◼"];
const CHECKBOX_BRACKETS = /\[(\s|x|X|✓|✔|\*)?\]/;

function isCheckboxLabel(text: string): boolean {
  if (CHECKBOX_SYMBOLS.some((symbol) => text.includes(symbol))) return true;
  if (CHECKBOX_BRACKETS.test(text)) return true;
  return false;
}

export function detectCheckboxes(layout: ExtractedDocumentLayout): ExtractedDocumentLayout {
  for (const page of layout.pages) {
    const checkboxes: CheckboxRegion[] = [];

    for (const block of page.textBlocks) {
      if (!isCheckboxLabel(block.text)) continue;

      // Approximate checkbox size from font height.
      const size = Math.max(8, block.height * 0.9);
      checkboxes.push({
        page: page.pageNumber,
        x: block.x,
        y: block.y,
        size,
        xNorm: block.xNorm,
        yNorm: block.yNorm,
        sizeNorm: block.height / page.pageHeight,
        detectedBy: "label",
      });
    }

    page.checkboxes = checkboxes;
  }

  return layout;
}
