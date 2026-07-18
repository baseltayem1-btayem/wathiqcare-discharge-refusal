/**
 * Shared document layout extraction types.
 *
 * All coordinates are stored in **PDF points** as well as **normalised**
 * coordinates (0–1 relative to page width/height) so that geometry logic is
 * independent of page size.
 */

export type NormalizedRect = {
  page: number;
  x: number; // normalised left
  y: number; // normalised top (PDF y-axis, bottom-up)
  width: number;
  height: number;
  absoluteLeft?: number;
  absoluteBottom?: number;
  absoluteRight?: number;
  absoluteTop?: number;
};

export type TextBlock = {
  page: number;
  text: string;
  x: number; // PDF points
  y: number; // PDF points (bottom-left origin)
  width: number;
  height: number;
  xNorm: number;
  yNorm: number;
  widthNorm: number;
  fontName?: string;
  fontSize?: number;
};

export type WritingLine = {
  page: number;
  x: number;
  y: number;
  width: number;
  pattern: "underscore" | "dots" | "mixed";
  xNorm: number;
  yNorm: number;
  widthNorm: number;
};

export type CheckboxRegion = {
  page: number;
  x: number;
  y: number;
  size: number;
  xNorm: number;
  yNorm: number;
  sizeNorm: number;
  /** Detected by shape, not label. */
  detectedBy: "shape" | "label";
};

export type SignatureRegion = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xNorm: number;
  yNorm: number;
  widthNorm: number;
  heightNorm: number;
  /** Source of detection. */
  source: "label" | "line" | "shape";
  /** Matched label text, if any. */
  labelText?: string;
};

export type ColumnStructure = {
  page: number;
  count: number;
  boundaries: number[]; // normalised x positions of column separators
  leftColumn: { xMin: number; xMax: number };
  rightColumn?: { xMin: number; xMax: number };
};

export type ExtractedPageLayout = {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  textBlocks: TextBlock[];
  writingLines: WritingLine[];
  checkboxes: CheckboxRegion[];
  signatureRegions: SignatureRegion[];
  columns: ColumnStructure | null;
};

export type ExtractedDocumentLayout = {
  pageCount: number;
  pageSizePoints: { width: number; height: number };
  pages: ExtractedPageLayout[];
};
