/**
 * Build protected regions that candidate rectangles must not overlap.
 *
 * Protected regions include section headings, other anchors, existing AcroForm
 * widgets, page margins, and footer/pagination areas.
 */

import type { ExtractedDocumentLayout, TextBlock } from "../extraction/document-layout-types";
import type { NormalizedRectangle } from "./rectangle-normalization";

export type ProtectedRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  reason: string;
};

function headingBlocks(page: ExtractedDocumentLayout["pages"][number]): TextBlock[] {
  return page.textBlocks.filter((b) => {
    const wordCount = b.text.split(/\s+/).length;
    if (wordCount > 8) return false;
    if ((b.fontSize ?? 10) >= 11) return true;
    if (b.height >= 14) return true;
    return false;
  });
}

export function buildProtectedRegions(
  layout: ExtractedDocumentLayout,
): ProtectedRegion[] {
  const regions: ProtectedRegion[] = [];

  for (const page of layout.pages) {
    // Page margins.
    regions.push(
      { x: 0, y: 1, width: 0.02, height: 1, reason: "left_margin" },
      { x: 0.98, y: 1, width: 0.02, height: 1, reason: "right_margin" },
      { x: 0, y: 1, width: 1, height: 0.02, reason: "top_margin" },
      { x: 0, y: 0.02, width: 1, height: 0.02, reason: "bottom_margin" },
    );

    // Headings.
    for (const block of headingBlocks(page)) {
      regions.push({
        x: block.xNorm,
        y: block.yNorm + block.heightNorm,
        width: block.widthNorm,
        height: block.heightNorm * 1.5,
        reason: "heading",
      });
    }
  }

  return regions;
}

export function rectangleIntersectsProtectedRegion(
  rect: NormalizedRectangle,
  regions: ProtectedRegion[],
): { intersects: boolean; region: ProtectedRegion | null } {
  const aRight = rect.x + rect.width;
  const aBottom = rect.y - rect.height;

  for (const region of regions) {
    const bRight = region.x + region.width;
    const bBottom = region.y - region.height;
    if (
      rect.x < bRight &&
      aRight > region.x &&
      rect.y > bBottom &&
      aBottom < region.y
    ) {
      return { intersects: true, region };
    }
  }

  return { intersects: false, region: null };
}
