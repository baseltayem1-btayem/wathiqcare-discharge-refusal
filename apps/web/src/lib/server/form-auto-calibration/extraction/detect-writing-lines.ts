/**
 * Detect writing lines / blanks in text blocks.
 *
 * A writing line is a region of repeated underscores, dots, or ellipsis
 * characters that indicates a fillable area on a blank form.
 */

import type { ExtractedDocumentLayout, WritingLine } from "./document-layout-types";

export function isBlankLineText(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  return /_{4,}/.test(compact) || /\.{6,}/.test(compact) || /…{3,}/.test(compact);
}

export function detectWritingLines(layout: ExtractedDocumentLayout): ExtractedDocumentLayout {
  for (const page of layout.pages) {
    const lines: WritingLine[] = [];

    for (const block of page.textBlocks) {
      if (!isBlankLineText(block.text)) continue;

      const pattern: WritingLine["pattern"] = block.text.includes("_")
        ? "underscore"
        : block.text.includes("…")
          ? "mixed"
          : "dots";

      lines.push({
        page: page.pageNumber,
        x: block.x,
        y: block.y,
        width: block.width,
        pattern,
        xNorm: block.xNorm,
        yNorm: block.yNorm,
        widthNorm: block.widthNorm,
      });
    }

    page.writingLines = lines;
  }

  return layout;
}
