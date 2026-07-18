/**
 * Deterministic layout fingerprinting.
 *
 * Fingerprints are computed from structural features of the blank form — page
 * count, sizes, text-block positions, headings, columns, writing lines,
 * checkboxes, signature blocks, and perceptual page hashes — never from the
 * file name or procedure name alone.
 */

import crypto from "node:crypto";
import type { ExtractedDocumentLayout, TextBlock } from "../extraction/document-layout-types";

export type LayoutFingerprint = {
  version: string;
  pageCount: number;
  pageSizePoints: { width: number; height: number };
  /** Perceptual hash of each page's structural features. */
  pageHashes: string[];
  /** SHA-256 of the canonical fingerprint payload. */
  fingerprintHash: string;
  /** Structural summary used by the classifier. */
  summary: LayoutFingerprintSummary;
};

export type LayoutFingerprintSummary = {
  textBlockCount: number;
  writingLineCount: number;
  checkboxCount: number;
  signatureRegionCount: number;
  headingYPositions: number[]; // normalised
  columnCounts: number[];
  hasBilingualColumns: boolean;
  hasPatientHeader: boolean;
  hasPhysicianFooter: boolean;
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0640]/g, "")
    .replace(/[\u064b-\u065f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeadingBlock(block: TextBlock): boolean {
  const normalized = normalizeText(block.text);
  if (normalized.length < 3) return false;
  // Headings are typically short, bold-ish, and near the top or section starts.
  const wordCount = normalized.split(/\s+/).length;
  if (wordCount > 8) return false;
  if (block.fontSize && block.fontSize >= 11) return true;
  if (block.height >= 14) return true;
  return false;
}

function detectPatientHeader(pages: ExtractedDocumentLayout["pages"]): boolean {
  const firstPage = pages[0];
  if (!firstPage) return false;
  const text = firstPage.textBlocks.map((b) => normalizeText(b.text)).join(" ");
  const en = /\b(patient name|mrn|medical record|date of birth|national id)\b/.test(text);
  const ar = /(اسم المريض|رقم الملف|تاريخ الميلاد|رقم الهوية)/.test(text);
  return en || ar;
}

function detectPhysicianFooter(pages: ExtractedDocumentLayout["pages"]): boolean {
  // Look on the last 2 pages for physician statement / signature region clusters.
  const candidatePages = pages.slice(-2);
  for (const page of candidatePages) {
    const text = page.textBlocks
      .filter((b) => b.yNorm < 0.35)
      .map((b) => normalizeText(b.text))
      .join(" ");
    const en = /\b(doctor|physician|delegate|signature|statement)\b/.test(text);
    const ar = /(طبيب|مندوب|توقيع|بيان)/.test(text);
    if (en || ar) return true;
  }
  return false;
}

function computePageHash(page: ExtractedDocumentLayout["pages"][number]): string {
  // Perceptual structural hash: bucket text blocks into a coarse grid.
  const gridRows = 12;
  const gridCols = 8;
  const grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));

  for (const block of page.textBlocks) {
    const col = Math.min(gridCols - 1, Math.floor(block.xNorm * gridCols));
    const row = Math.min(gridRows - 1, Math.floor((1 - block.yNorm) * gridRows));
    grid[row][col] += 1;
  }

  for (const line of page.writingLines) {
    const col = Math.min(gridCols - 1, Math.floor(line.xNorm * gridCols));
    const row = Math.min(gridRows - 1, Math.floor((1 - line.yNorm) * gridRows));
    grid[row][col] += 2;
  }

  for (const box of page.checkboxes) {
    const col = Math.min(gridCols - 1, Math.floor(box.xNorm * gridCols));
    const row = Math.min(gridRows - 1, Math.floor((1 - box.yNorm) * gridRows));
    grid[row][col] += 4;
  }

  for (const sig of page.signatureRegions) {
    const col = Math.min(gridCols - 1, Math.floor(sig.xNorm * gridCols));
    const row = Math.min(gridRows - 1, Math.floor((1 - sig.yNorm) * gridRows));
    grid[row][col] += 8;
  }

  const payload = {
    cols: page.columns?.count ?? 0,
    grid: grid.flat(),
  };

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

export function computeLayoutFingerprint(
  layout: ExtractedDocumentLayout,
): LayoutFingerprint {
  const pageHashes = layout.pages.map(computePageHash);

  const summary: LayoutFingerprintSummary = {
    textBlockCount: layout.pages.reduce((sum, p) => sum + p.textBlocks.length, 0),
    writingLineCount: layout.pages.reduce((sum, p) => sum + p.writingLines.length, 0),
    checkboxCount: layout.pages.reduce((sum, p) => sum + p.checkboxes.length, 0),
    signatureRegionCount: layout.pages.reduce((sum, p) => sum + p.signatureRegions.length, 0),
    headingYPositions: layout.pages
      .flatMap((p) => p.textBlocks.filter(isHeadingBlock).map((b) => b.yNorm))
      .sort((a, b) => a - b),
    columnCounts: layout.pages.map((p) => p.columns?.count ?? 0),
    hasBilingualColumns: layout.pages.some(
      (p) => (p.columns?.count ?? 0) >= 2,
    ),
    hasPatientHeader: detectPatientHeader(layout.pages),
    hasPhysicianFooter: detectPhysicianFooter(layout.pages),
  };

  const canonical = {
    version: "v1",
    pageCount: layout.pageCount,
    pageSizePoints: layout.pageSizePoints,
    pageHashes,
    summary,
  };

  const fingerprintHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");

  return {
    ...canonical,
    fingerprintHash,
  };
}

export function fingerprintSimilarity(a: LayoutFingerprint, b: LayoutFingerprint): number {
  if (a.pageCount !== b.pageCount) return 0;
  if (
    Math.abs(a.pageSizePoints.width - b.pageSizePoints.width) > 1 ||
    Math.abs(a.pageSizePoints.height - b.pageSizePoints.height) > 1
  ) {
    return 0;
  }

  let matches = 0;
  const pageHashes = Math.min(a.pageHashes.length, b.pageHashes.length);
  for (let i = 0; i < pageHashes; i += 1) {
    if (a.pageHashes[i] === b.pageHashes[i]) matches += 1;
  }

  const pageScore = pageHashes > 0 ? matches / pageHashes : 0;

  // Structural feature bonus.
  let structuralScore = 0;
  const aSum = a.summary;
  const bSum = b.summary;
  structuralScore += aSum.hasBilingualColumns === bSum.hasBilingualColumns ? 0.15 : 0;
  structuralScore += aSum.hasPatientHeader === bSum.hasPatientHeader ? 0.1 : 0;
  structuralScore += aSum.hasPhysicianFooter === bSum.hasPhysicianFooter ? 0.1 : 0;

  const countDiff =
    Math.abs(aSum.textBlockCount - bSum.textBlockCount) +
    Math.abs(aSum.writingLineCount - bSum.writingLineCount) +
    Math.abs(aSum.checkboxCount - bSum.checkboxCount) +
    Math.abs(aSum.signatureRegionCount - bSum.signatureRegionCount);
  const countScore = Math.max(0, 0.15 - countDiff / 100);

  return Math.min(1, pageScore * 0.5 + structuralScore + countScore);
}
