import { describe, test } from "node:test";
import assert from "node:assert";
import {
  normalizePdfRectangle,
  denormalizeRectangle,
  clampNormalizedRect,
  rectsOverlap,
} from "./rectangle-normalization";

describe("rectangle-normalization", () => {
  test("normalizes and denormalizes PDF rectangles", () => {
    const rect = { left: 100, bottom: 50, right: 300, top: 100 };
    const normalized = normalizePdfRectangle(rect, 612, 792);
    const denormalized = denormalizeRectangle(normalized, 612, 792);
    assert.equal(Math.round(denormalized.left), rect.left);
    assert.equal(Math.round(denormalized.bottom), rect.bottom);
    assert.equal(Math.round(denormalized.right), rect.right);
    assert.equal(Math.round(denormalized.top), rect.top);
  });

  test("clamps out-of-bounds rectangles", () => {
    const clamped = clampNormalizedRect({ x: 0.9, y: 0.1, width: 0.2, height: 0.2 });
    assert.ok(clamped.x + clamped.width <= 1);
    assert.ok(clamped.y - clamped.height >= 0);
  });

  test("detects rectangle overlap", () => {
    const a = { x: 0.1, y: 0.9, width: 0.2, height: 0.05 };
    const b = { x: 0.15, y: 0.92, width: 0.2, height: 0.05 };
    const c = { x: 0.5, y: 0.5, width: 0.1, height: 0.1 };
    assert.equal(rectsOverlap(a, b), true);
    assert.equal(rectsOverlap(a, c), false);
  });
});
