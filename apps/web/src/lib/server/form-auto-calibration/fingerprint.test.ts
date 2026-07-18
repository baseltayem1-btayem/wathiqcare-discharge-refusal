import assert from "node:assert/strict";
import test from "node:test";
import { computeLayoutFingerprint, fingerprintSimilarity } from "./fingerprint/layout-fingerprint";
import { classifyLayoutFamily } from "./fingerprint/layout-family-classifier";
import type { ExtractedDocumentLayout } from "./extraction/document-layout-types";

function buildLayout(overrides?: Partial<ExtractedDocumentLayout>): ExtractedDocumentLayout {
  return {
    pageCount: 1,
    pageSizePoints: { width: 612, height: 792 },
    pages: [
      {
        pageNumber: 1,
        pageWidth: 612,
        pageHeight: 792,
        textBlocks: [],
        writingLines: [],
        checkboxes: [],
        signatureRegions: [],
        columns: null,
      },
    ],
    ...overrides,
  };
}

test("fingerprint changes when page count differs", () => {
  const a = computeLayoutFingerprint(buildLayout({ pageCount: 1 }));
  const b = computeLayoutFingerprint(buildLayout({ pageCount: 2 }));
  assert.notEqual(a.fingerprintHash, b.fingerprintHash);
  assert.equal(fingerprintSimilarity(a, b), 0);
});

test("fingerprint similarity is high for identical layouts", () => {
  const layout = buildLayout();
  const a = computeLayoutFingerprint(layout);
  const b = computeLayoutFingerprint(layout);
  assert.equal(fingerprintSimilarity(a, b), 1);
});

test("same layout groups together", () => {
  const layout = buildLayout();
  const a = computeLayoutFingerprint(layout);
  const b = computeLayoutFingerprint(layout);
  assert.equal(a.fingerprintHash, b.fingerprintHash);
});

test("filename alone cannot force family match", () => {
  const layout = buildLayout({ pageCount: 1 });
  const classification = classifyLayoutFamily(computeLayoutFingerprint(layout));
  // A single empty page should not claim a high-confidence clinical family.
  assert.ok(classification.confidence < 0.5 || classification.family === "UNKNOWN");
  assert.equal(classification.manualReviewMandatory, true);
});

test("classifier detects generic single-page consent", () => {
  const layout = buildLayout({
    pageCount: 1,
    pages: [
      {
        pageNumber: 1,
        pageWidth: 612,
        pageHeight: 792,
        textBlocks: [
          { page: 1, text: "Patient Name", x: 50, y: 700, width: 100, height: 12, xNorm: 0.08, yNorm: 0.88, widthNorm: 0.16, heightNorm: 0.015 },
          { page: 1, text: "Signature", x: 50, y: 100, width: 80, height: 12, xNorm: 0.08, yNorm: 0.13, widthNorm: 0.13, heightNorm: 0.015 },
        ],
        writingLines: [
          { page: 1, x: 160, y: 700, width: 200, pattern: "underscore", xNorm: 0.26, yNorm: 0.88, widthNorm: 0.33 },
          { page: 1, x: 140, y: 100, width: 200, pattern: "underscore", xNorm: 0.23, yNorm: 0.13, widthNorm: 0.33 },
        ],
        checkboxes: [],
        signatureRegions: [],
        columns: null,
      },
    ],
  });
  const classification = classifyLayoutFamily(computeLayoutFingerprint(layout));
  assert.equal(classification.family, "GENERIC_SINGLE_PAGE");
  assert.ok(classification.confidence > 0);
});
