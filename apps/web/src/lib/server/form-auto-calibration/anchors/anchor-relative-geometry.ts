/**
 * Anchor-relative geometry computation.
 *
 * Every candidate rectangle is defined relative to an anchor (label, section,
 * blank line, checkbox, signature line) with bounded offsets. Absolute
 * coordinates are computed deterministically and recorded as evidence.
 */

import type { ExtractedDocumentLayout, ColumnStructure } from "../extraction/document-layout-types";
import type { LayoutAnchor } from "./anchor-types";

export type AnchorRelativeRectangle = {
  page: number;
  /** Absolute normalised rectangle. */
  absolute: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Anchor that this rectangle is relative to. */
  anchor: LayoutAnchor;
  /** Relative offsets from the anchor (normalised). */
  relativeOffsets: {
    deltaX: number;
    deltaY: number;
  };
  /** Column constraint, if any. */
  column: "LEFT" | "RIGHT" | "FULL" | null;
  /** Reading direction. */
  direction: "LTR" | "RTL";
  /** Maximum lines allowed in the rectangle (for text fitting). */
  maxLines: number;
  /** Minimum font size enforced by governed style. */
  minFontSize: number;
  /** Padding inside the rectangle (normalised). */
  padding: {
    horizontal: number;
    vertical: number;
  };
  /** Protected regions that must not be overlapped. */
  protectedRegions: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  /** Confidence in this rectangle. */
  confidence: number;
  /** Human-readable evidence. */
  evidence: string;
};

export type RectangleConstraint = {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  preferBelow: boolean;
  preferRight?: boolean;
  maxDistanceFromAnchor: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getColumnForX(xNorm: number, columns: ColumnStructure | null): "LEFT" | "RIGHT" | "FULL" {
  if (!columns || columns.count === 1) return "FULL";
  const boundary = columns.boundaries[0] ?? 0.5;
  return xNorm < boundary ? "LEFT" : "RIGHT";
}

function constrainToColumn(
  rect: { x: number; y: number; width: number; height: number },
  column: "LEFT" | "RIGHT" | "FULL",
  columns: ColumnStructure | null,
): { x: number; width: number } {
  if (!columns || column === "FULL") return { x: rect.x, width: rect.width };

  const boundary = columns.boundaries[0] ?? 0.5;
  if (column === "LEFT") {
    const maxWidth = boundary - rect.x;
    return { x: rect.x, width: Math.min(rect.width, maxWidth) };
  }
  // RIGHT
  const minX = boundary;
  const x = Math.max(rect.x, minX);
  return { x, width: Math.min(rect.width, 1 - x) };
}

export function computeAnchorRelativeRectangle(args: {
  anchor: LayoutAnchor;
  layout: ExtractedDocumentLayout;
  constraint: RectangleConstraint;
  /** Preferred column; computed from anchor if omitted. */
  column?: "LEFT" | "RIGHT" | "FULL";
  /** Page-relative normalised padding. */
  padding?: { horizontal: number; vertical: number };
  maxLines?: number;
  minFontSize?: number;
  confidence?: number;
  evidence?: string;
}): AnchorRelativeRectangle | null {
  const {
    anchor,
    layout,
    constraint,
    column: preferredColumn,
    padding = { horizontal: 0.01, vertical: 0.005 },
    maxLines = 1,
    minFontSize = 6,
    confidence = 0.5,
    evidence = "Derived from anchor",
  } = args;

  const page = layout.pages.find((p) => p.pageNumber === anchor.page);
  if (!page) return null;

  let anchorXNorm: number;
  let anchorYNorm: number;
  let anchorWidthNorm: number;
  let anchorHeightNorm: number;

  if (anchor.kind === "LABEL" || anchor.kind === "SECTION_HEADING") {
    anchorXNorm = anchor.textBlock.xNorm;
    anchorYNorm = anchor.textBlock.yNorm;
    anchorWidthNorm = anchor.textBlock.widthNorm;
    anchorHeightNorm = anchor.textBlock.heightNorm;
  } else {
    anchorXNorm = anchor.xNorm;
    anchorYNorm = anchor.yNorm;
    anchorWidthNorm = (anchor as { widthNorm?: number }).widthNorm ?? 0;
    anchorHeightNorm = 0.02;
  }

  const column = preferredColumn ?? getColumnForX(anchorXNorm, page.columns);
  const direction: "LTR" | "RTL" = column === "RIGHT" ? "RTL" : "LTR";

  // Initial rectangle: below the anchor, full allowed width.
  let x = column === "RIGHT" ? Math.max(0.5, anchorXNorm) : anchorXNorm;
  let y = anchorYNorm - constraint.minHeight - 0.01; // PDF y grows upward, so below = smaller y
  let width = clamp(constraint.maxWidth, constraint.minWidth, column === "FULL" ? 0.9 : 0.45);
  let height = clamp(constraint.maxHeight, constraint.minHeight, 0.2);

  // If anchor is a blank line or signature line, snap to it.
  if (anchor.kind === "BLANK_LINE" || anchor.kind === "SIGNATURE_LINE") {
    x = anchorXNorm;
    y = anchorYNorm - height * 0.5;
    width = Math.min(anchorWidthNorm || width, width);
  }

  // If anchor is a checkbox, place a small region just to the right.
  if (anchor.kind === "CHECKBOX") {
    const size = (anchor as { sizeNorm: number }).sizeNorm;
    x = anchorXNorm + size + 0.01;
    y = anchorYNorm - size * 0.1;
    width = 0.3;
    height = size * 1.2;
  }

  // Keep within page bounds.
  y = clamp(y, 0.02, 0.98 - height);

  const constrained = constrainToColumn({ x, y, width, height }, column, page.columns);
  x = constrained.x;
  width = constrained.width;

  // Clamp width/height.
  width = clamp(width, constraint.minWidth, constraint.maxWidth);
  height = clamp(height, constraint.minHeight, constraint.maxHeight);

  return {
    page: anchor.page,
    absolute: { x, y, width, height },
    anchor,
    relativeOffsets: {
      deltaX: x - anchorXNorm,
      deltaY: y - anchorYNorm,
    },
    column,
    direction,
    maxLines,
    minFontSize,
    padding,
    protectedRegions: [],
    confidence,
    evidence,
  };
}
