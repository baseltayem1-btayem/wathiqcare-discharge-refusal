import { describe, test } from "node:test";
import assert from "node:assert";
import { classifyLayoutFamily } from "./layout-family-classifier";
import type { LayoutFingerprint, LayoutFingerprintSummary } from "./layout-fingerprint";

function makeFingerprint(summary: Partial<LayoutFingerprintSummary>, pageCount = 1): LayoutFingerprint {
  return {
    version: "1",
    pageCount,
    pageSizePoints: { width: 612, height: 792 },
    pageHashes: [],
    fingerprintHash: "test",
    summary: {
      textBlockCount: 0,
      writingLineCount: 0,
      checkboxCount: 0,
      signatureRegionCount: 0,
      headingYPositions: [],
      columnCounts: [],
      hasBilingualColumns: false,
      hasPatientHeader: false,
      hasPhysicianFooter: false,
      ...summary,
    },
  };
}

describe("layout-family-classifier", () => {
  test("classifies standard bilingual form", () => {
    const result = classifyLayoutFamily(
      makeFingerprint(
        {
          hasBilingualColumns: true,
          hasPatientHeader: true,
          signatureRegionCount: 3,
          writingLineCount: 6,
        },
        2,
      ),
    );
    assert.ok(result.family !== "UNKNOWN");
    assert.ok(result.confidence > 0);
  });

  test("low confidence for unknown forms", () => {
    const result = classifyLayoutFamily(makeFingerprint({}, 0));
    assert.equal(result.family, "UNKNOWN");
    assert.equal(result.confidence, 0);
  });

  test("handles missing summary gracefully", () => {
    const result = classifyLayoutFamily({} as LayoutFingerprint);
    assert.equal(result.family, "UNKNOWN");
    assert.equal(result.confidence, 0);
  });
});
