/**
 * Validate that the source PDF page count matches the candidate manifest.
 */

export type PageCountValidation = {
  passed: boolean;
  expected: number;
  actual: number;
  message: string;
};

export function validatePageCount(expected: number, actual: number): PageCountValidation {
  const passed = expected === actual;
  return {
    passed,
    expected,
    actual,
    message: passed
      ? `Page count matches: ${actual}`
      : `Page count mismatch: expected ${expected}, got ${actual}`,
  };
}
