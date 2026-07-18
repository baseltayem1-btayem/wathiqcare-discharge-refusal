/**
 * Detect signature regions from text labels and writing lines.
 *
 * Combines label anchors ("signature", "توقيع") with nearby blank lines to
 * estimate signature capture regions.
 */

import type { ExtractedDocumentLayout, SignatureRegion } from "./document-layout-types";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u0640]/g, "")
    .replace(/[\u064b-\u065f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSignatureLabel(text: string): boolean {
  const normalized = normalizeText(text);
  const en = /\b(signature|sign here|signed by|patient signature|physician signature|doctor signature|guardian signature|witness signature)\b/.test(
    normalized,
  );
  const ar = /(توقيع|التوقيع|توقيع المريض|توقيع الطبيب|توقيع ولي الأمر|توقيع الشاهد)/.test(normalized);
  return en || ar;
}

export function detectSignatureRegions(layout: ExtractedDocumentLayout): ExtractedDocumentLayout {
  for (const page of layout.pages) {
    const regions: SignatureRegion[] = [];

    for (const block of page.textBlocks) {
      if (!isSignatureLabel(block.text)) continue;

      // Find the nearest writing line below or to the right of the label.
      const line = page.writingLines
        .filter(
          (l) =>
            l.page === page.pageNumber &&
            l.yNorm < block.yNorm + 0.08 &&
            l.yNorm > block.yNorm - 0.04 &&
            Math.abs(l.xNorm - block.xNorm) < 0.3,
        )
        .sort((a, b) => Math.abs(a.yNorm - block.yNorm) - Math.abs(b.yNorm - block.yNorm))[0];

      const width = line?.width ?? Math.min(180, page.pageWidth * 0.3);
      const height = Math.max(24, page.pageHeight * 0.04);
      const x = line?.x ?? block.x + block.width + 4;
      const y = line?.y ?? block.y - height * 0.2;

      regions.push({
        page: page.pageNumber,
        x,
        y,
        width,
        height,
        xNorm: x / page.pageWidth,
        yNorm: y / page.pageHeight,
        widthNorm: width / page.pageWidth,
        heightNorm: height / page.pageHeight,
        source: "label",
        labelText: block.text,
      });
    }

    page.signatureRegions = regions;
  }

  return layout;
}
