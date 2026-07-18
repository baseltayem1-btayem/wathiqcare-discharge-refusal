/**
 * Governed rectangle constraints.
 *
 * Enforces minimum font sizes, padding, and safe bounds derived from the
 * existing WathiqCare overlay style.
 */

import {
  GOVERNED_OVERLAY_HORIZONTAL_PADDING_PT,
  GOVERNED_OVERLAY_VERTICAL_PADDING_PT,
} from "@/lib/server/acroform/governed-overlay-style";

export type FieldRectangleConstraint = {
  minWidthNorm: number;
  maxWidthNorm: number;
  minHeightNorm: number;
  maxHeightNorm: number;
  minFontSize: number;
  horizontalPaddingNorm: number;
  verticalPaddingNorm: number;
  maxLines: number;
};

const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;

export function textFieldConstraint(args?: {
  multiline?: boolean;
  isArabic?: boolean;
  maxLines?: number;
}): FieldRectangleConstraint {
  const multiline = args?.multiline ?? false;
  const maxLines = args?.maxLines ?? (multiline ? 8 : 1);

  return {
    minWidthNorm: 0.08,
    maxWidthNorm: multiline ? 0.42 : 0.35,
    minHeightNorm: 0.015,
    maxHeightNorm: multiline ? 0.18 : 0.035,
    minFontSize: 6,
    horizontalPaddingNorm: GOVERNED_OVERLAY_HORIZONTAL_PADDING_PT / PAGE_WIDTH_PT,
    verticalPaddingNorm: GOVERNED_OVERLAY_VERTICAL_PADDING_PT / PAGE_HEIGHT_PT,
    maxLines,
  };
}

export function signatureFieldConstraint(): FieldRectangleConstraint {
  return {
    minWidthNorm: 0.12,
    maxWidthNorm: 0.35,
    minHeightNorm: 0.03,
    maxHeightNorm: 0.08,
    minFontSize: 6,
    horizontalPaddingNorm: GOVERNED_OVERLAY_HORIZONTAL_PADDING_PT / PAGE_WIDTH_PT,
    verticalPaddingNorm: GOVERNED_OVERLAY_VERTICAL_PADDING_PT / PAGE_HEIGHT_PT,
    maxLines: 1,
  };
}

export function checkboxFieldConstraint(): FieldRectangleConstraint {
  return {
    minWidthNorm: 0.008,
    maxWidthNorm: 0.03,
    minHeightNorm: 0.008,
    maxHeightNorm: 0.03,
    minFontSize: 6,
    horizontalPaddingNorm: 0,
    verticalPaddingNorm: 0,
    maxLines: 1,
  };
}

export function dateTimeFieldConstraint(): FieldRectangleConstraint {
  return {
    minWidthNorm: 0.06,
    maxWidthNorm: 0.18,
    minHeightNorm: 0.015,
    maxHeightNorm: 0.035,
    minFontSize: 6,
    horizontalPaddingNorm: GOVERNED_OVERLAY_HORIZONTAL_PADDING_PT / PAGE_WIDTH_PT,
    verticalPaddingNorm: GOVERNED_OVERLAY_VERTICAL_PADDING_PT / PAGE_HEIGHT_PT,
    maxLines: 1,
  };
}
