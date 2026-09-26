import assert from "node:assert/strict";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";

import {
  evaluateAnesthesiaGate,
  NOT_APPLICABLE_REASON_KEY,
} from "@/components/informed-consents/production-workspace/utils/anesthesiaGate";

const ANESTHESIA_FIELDS = [
  {
    key: "anaesthetic_discussed_en",
    labelEn: "Type of anaesthetic discussed",
    type: "MULTILINE_TEXT",
    requiredWhen: "anesthesia_applies === true",
  },
  {
    key: "anaesthetic_discussed_ar",
    labelEn: "Type of anaesthetic discussed (Arabic)",
    type: "MULTILINE_TEXT",
    requiredWhen: "anesthesia_applies === true",
  },
];

test("mapping without anesthesia fields never blocks dispatch", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: [],
    doctorCompletionValues: {},
  });

  assert.equal(gate.ready, true);
  assert.equal(gate.status, "no_anesthesia_fields");
  assert.equal(gate.hasAnesthesiaFields, false);
});

test("unanswered applicability blocks dispatch", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: ANESTHESIA_FIELDS,
    doctorCompletionValues: {},
  });

  assert.equal(gate.ready, false);
  assert.equal(gate.status, "unanswered");
  assert.equal(gate.decisionAnswered, false);
  assert.match(gate.message, /confirm whether anesthesia applies/i);
});

test("applicable anesthesia requires the effective fields to be completed", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: ANESTHESIA_FIELDS,
    doctorCompletionValues: { anesthesia_applies: "true" },
  });

  assert.equal(gate.ready, false);
  assert.equal(gate.status, "applicable_incomplete");
  assert.equal(gate.applies, true);
  assert.equal(gate.pendingFields.length, 2);
  assert.match(gate.message, /anesthesia review required/i);
});

test("applicable anesthesia completes once the effective fields are filled", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: ANESTHESIA_FIELDS,
    doctorCompletionValues: {
      anesthesia_applies: "true",
      anaesthetic_discussed_en: "General anesthesia discussed.",
      anaesthetic_discussed_ar: "تمت مناقشة التخدير العام.",
    },
  });

  assert.equal(gate.ready, true);
  assert.equal(gate.status, "applicable_complete");
  assert.equal(gate.pendingFields.length, 0);
  assert.match(gate.message, /completed/i);
});

test("not applicable without a reason does not complete the gate", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: ANESTHESIA_FIELDS,
    doctorCompletionValues: { anesthesia_applies: "false" },
  });

  assert.equal(gate.ready, false);
  assert.equal(gate.status, "not_applicable_missing_reason");
  assert.equal(gate.notApplicable, true);
  assert.match(gate.message, /reason/i);
});

test("not applicable with a clear reason completes the gate", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: ANESTHESIA_FIELDS,
    doctorCompletionValues: {
      anesthesia_applies: "false",
      [NOT_APPLICABLE_REASON_KEY]: "Local anesthesia only; no anesthesiologist review required.",
    },
  });

  assert.equal(gate.ready, true);
  assert.equal(gate.status, "not_applicable");
  assert.equal(gate.reasonProvided, true);
  assert.match(gate.message, /not applicable/i);
});

test("not applicable ignores the requiredWhen-gated anesthesia fields", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: ANESTHESIA_FIELDS,
    doctorCompletionValues: {
      anesthesia_applies: "false",
      [NOT_APPLICABLE_REASON_KEY]: "Minor procedure under local anesthetic.",
    },
  });

  assert.equal(gate.effectiveFields.length, 0);
  assert.equal(gate.ready, true);
});

test("unconditional anesthesia fields are required whenever they exist", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: [
      { key: "anesthesia_note", labelEn: "Anesthesia note", type: "MULTILINE_TEXT" },
    ],
    doctorCompletionValues: { anesthesia_applies: "false", [NOT_APPLICABLE_REASON_KEY]: "x" },
  });

  assert.equal(gate.applies, false);
  assert.equal(gate.ready, true);

  const unanswered = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: [
      { key: "anesthesia_note", labelEn: "Anesthesia note", type: "MULTILINE_TEXT" },
    ],
    doctorCompletionValues: {},
  });
  assert.equal(unanswered.status, "unanswered");
});

test("override NONE is honoured as the not-applicable signal", () => {
  const gate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: ANESTHESIA_FIELDS,
    doctorCompletionValues: { [NOT_APPLICABLE_REASON_KEY]: "Reason documented." },
    anesthesiaOverride: "NONE",
  });

  assert.equal(gate.notApplicable, true);
  assert.equal(gate.ready, true);
  assert.equal(gate.status, "not_applicable");
});
