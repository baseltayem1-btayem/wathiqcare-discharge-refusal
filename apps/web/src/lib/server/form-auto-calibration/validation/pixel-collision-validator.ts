/**
 * Detect pixel-level collisions between candidate rectangles.
 */

import type { NormalizedRectangle } from "../geometry/rectangle-normalization";
import { rectsOverlap } from "../geometry/rectangle-normalization";

export type PixelCollision = {
  passed: boolean;
  collisions: Array<{
    a: string;
    b: string;
    overlapArea: number;
  }>;
  message: string;
};

export function validatePixelCollisions(
  rectangles: Array<{ key: string; rect: NormalizedRectangle }>,
): PixelCollision {
  const collisions: PixelCollision["collisions"] = [];

  for (let i = 0; i < rectangles.length; i += 1) {
    for (let j = i + 1; j < rectangles.length; j += 1) {
      const a = rectangles[i];
      const b = rectangles[j];
      if (rectsOverlap(a.rect, b.rect)) {
        const overlapWidth = Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width) - Math.max(a.rect.x, b.rect.x);
        const overlapHeight = Math.min(a.rect.y, b.rect.y) - Math.max(a.rect.y - a.rect.height, b.rect.y - b.rect.height);
        collisions.push({
          a: a.key,
          b: b.key,
          overlapArea: Math.max(0, overlapWidth) * Math.max(0, overlapHeight),
        });
      }
    }
  }

  return {
    passed: collisions.length === 0,
    collisions,
    message: collisions.length === 0
      ? "No rectangle collisions detected."
      : `Detected ${collisions.length} rectangle collision(s).`,
  };
}
