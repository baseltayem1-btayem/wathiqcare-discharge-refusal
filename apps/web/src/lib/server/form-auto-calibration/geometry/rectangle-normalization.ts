/**
 * Rectangle normalisation utilities.
 *
 * Convert between PDF points and normalised coordinates (0–1). All candidate
 * geometry is stored normalised so the same manifest can be rendered at any
 * DPI or page size.
 */

export type NormalizedRectangle = {
  x: number; // normalised left (0–1)
  y: number; // normalised top (PDF y-axis, bottom-up)
  width: number; // normalised width
  height: number; // normalised height
};

export type PdfRectangle = {
  left: number;
  bottom: number;
  right: number;
  top: number;
};

export function normalizePdfRectangle(
  rect: PdfRectangle,
  pageWidth: number,
  pageHeight: number,
): NormalizedRectangle {
  return {
    x: rect.left / pageWidth,
    y: rect.top / pageHeight,
    width: (rect.right - rect.left) / pageWidth,
    height: (rect.top - rect.bottom) / pageHeight,
  };
}

export function denormalizeRectangle(
  rect: NormalizedRectangle,
  pageWidth: number,
  pageHeight: number,
): PdfRectangle {
  return {
    left: rect.x * pageWidth,
    bottom: (rect.y - rect.height) * pageHeight,
    right: (rect.x + rect.width) * pageWidth,
    top: rect.y * pageHeight,
  };
}

export function normalizeAcroFormRect(
  acroFormRect: [number, number, number, number],
  pageWidth: number,
  pageHeight: number,
): NormalizedRectangle {
  const [left, bottom, right, top] = acroFormRect;
  return normalizePdfRectangle({ left, bottom, right, top }, pageWidth, pageHeight);
}

export function toAcroFormRect(
  rect: NormalizedRectangle,
  pageWidth: number,
  pageHeight: number,
): [number, number, number, number] {
  const pdf = denormalizeRectangle(rect, pageWidth, pageHeight);
  return [pdf.left, pdf.bottom, pdf.right, pdf.top];
}

export function clampNormalizedRect(rect: NormalizedRectangle): NormalizedRectangle {
  return {
    x: Math.max(0, Math.min(1, rect.x)),
    y: Math.max(0, Math.min(1, rect.y)),
    width: Math.max(0, Math.min(1 - rect.x, rect.width)),
    height: Math.max(0, Math.min(rect.y, rect.height)),
  };
}

export function rectsOverlap(a: NormalizedRectangle, b: NormalizedRectangle): boolean {
  const aRight = a.x + a.width;
  const aBottom = a.y - a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y - b.height;

  return (
    a.x < bRight &&
    aRight > b.x &&
    a.y > bBottom &&
    aBottom < b.y
  );
}

export function rectArea(rect: NormalizedRectangle): number {
  return rect.width * rect.height;
}
