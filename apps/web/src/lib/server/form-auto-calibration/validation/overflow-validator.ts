/**
 * Validate that candidate rectangles fit within page bounds and do not
 * overflow their constrained maximum sizes.
 */

import type { NormalizedRectangle } from "../geometry/rectangle-normalization";

export type OverflowValidation = {
  passed: boolean;
  overflows: Array<{
    key: string;
    reason: string;
  }>;
  message: string;
};

export function validateOverflow(
  rectangles: Array<{ key: string; rect: NormalizedRectangle; maxWidth?: number; maxHeight?: number }>,
): OverflowValidation {
  const overflows: OverflowValidation["overflows"] = [];

  for (const item of rectangles) {
    const rect = item.rect;
    if (rect.x < 0 || rect.y - rect.height < 0 || rect.x + rect.width > 1 || rect.y > 1) {
      overflows.push({ key: item.key, reason: "Rectangle extends outside page bounds" });
      continue;
    }
    if (item.maxWidth && rect.width > item.maxWidth + 0.001) {
      overflows.push({ key: item.key, reason: `Width ${rect.width.toFixed(4)} exceeds max ${item.maxWidth}` });
    }
    if (item.maxHeight && rect.height > item.maxHeight + 0.001) {
      overflows.push({ key: item.key, reason: `Height ${rect.height.toFixed(4)} exceeds max ${item.maxHeight}` });
    }
  }

  return {
    passed: overflows.length === 0,
    overflows,
    message: overflows.length === 0
      ? "All rectangles fit within bounds."
      : `Detected ${overflows.length} overflow(s).`,
  };
}
