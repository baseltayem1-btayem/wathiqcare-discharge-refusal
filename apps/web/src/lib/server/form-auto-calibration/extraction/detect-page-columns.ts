/**
 * Detect bilingual column structure.
 *
 * Uses the x-position distribution of text blocks to infer whether a page is
 * split into left (English) and right (Arabic) columns.
 */

import type { ExtractedDocumentLayout, ColumnStructure } from "./document-layout-types";

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function hasLatin(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

export function detectPageColumns(layout: ExtractedDocumentLayout): ExtractedDocumentLayout {
  for (const page of layout.pages) {
    const leftBlocks = page.textBlocks.filter((b) => b.xNorm < 0.5);
    const rightBlocks = page.textBlocks.filter((b) => b.xNorm >= 0.5);

    const leftLatin = leftBlocks.some((b) => hasLatin(b.text));
    const leftArabic = leftBlocks.some((b) => hasArabic(b.text));
    const rightLatin = rightBlocks.some((b) => hasLatin(b.text));
    const rightArabic = rightBlocks.some((b) => hasArabic(b.text));

    // Bilingual two-column: one side predominantly Latin, the other Arabic.
    const isBilingualTwoColumn =
      (leftLatin && rightArabic) || (leftArabic && rightLatin) || (leftLatin && rightLatin);

    const totalBlocks = page.textBlocks.length;
    const hasBalancedSides =
      totalBlocks > 0 && leftBlocks.length / totalBlocks >= 0.25 && rightBlocks.length / totalBlocks >= 0.25;

    let columns: ColumnStructure | null = null;

    if (isBilingualTwoColumn && hasBalancedSides) {
      columns = {
        page: page.pageNumber,
        count: 2,
        boundaries: [0.5],
        leftColumn: { xMin: 0, xMax: 0.5 },
        rightColumn: { xMin: 0.5, xMax: 1 },
      };
    } else {
      columns = {
        page: page.pageNumber,
        count: 1,
        boundaries: [],
        leftColumn: { xMin: 0, xMax: 1 },
      };
    }

    page.columns = columns;
  }

  return layout;
}
