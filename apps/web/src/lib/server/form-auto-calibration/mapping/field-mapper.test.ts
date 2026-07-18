import { describe, test } from "node:test";
import assert from "node:assert";
import { matchFieldName, matchFieldNameToKey } from "./field-mapper";

describe("field-mapper", () => {
  test("matches exact labels", () => {
    assert.equal(matchFieldName("Patient Name"), 1.0);
    assert.equal(matchFieldNameToKey("Patient Name"), "patient.name");
  });

  test("matches partial labels", () => {
    const score = matchFieldName("pat name", "Patient Name");
    assert.ok(score > 0 && score <= 1);
  });

  test("ignores unrelated labels", () => {
    assert.equal(matchFieldName("random_xyz"), 0);
    assert.equal(matchFieldNameToKey("random_xyz"), null);
  });
});
