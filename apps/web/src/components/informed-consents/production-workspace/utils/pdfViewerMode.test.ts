import assert from "node:assert/strict";
import test from "node:test";
import { isFilledDraftReviewable } from "./pdfViewerMode";

test("isFilledDraftReviewable is true only when current, URL present, and not already reviewed", () => {
  assert.equal(isFilledDraftReviewable("current", "blob://filled", false), true);
});

test("isFilledDraftReviewable is false when status is not current", () => {
  assert.equal(isFilledDraftReviewable("idle", "blob://filled", false), false);
  assert.equal(isFilledDraftReviewable("loading", "blob://filled", false), false);
  assert.equal(isFilledDraftReviewable("stale", "blob://filled", false), false);
  assert.equal(isFilledDraftReviewable("error", "blob://filled", false), false);
});

test("isFilledDraftReviewable is false when the filled PDF URL is missing", () => {
  assert.equal(isFilledDraftReviewable("current", undefined, false), false);
});

test("isFilledDraftReviewable is false when already reviewed", () => {
  assert.equal(isFilledDraftReviewable("current", "blob://filled", true), false);
});
