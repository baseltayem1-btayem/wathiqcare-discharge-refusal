import assert from "node:assert/strict";
import test from "node:test";

import type { EducationStatus } from "./public-signing-decision-service";
import {
  computeDocumentHash,
  mergeDecisionExecutionContext,
  tokenHash,
} from "./public-signing-decision-service";

const baseEducation = {
  required: false,
  packageId: null,
  packageKey: null,
  titleAr: null,
  titleEn: null,
  versionId: null,
  versionLabel: "v1.0",
  contentHash: "edu-hash",
  summary: null,
  risks: [],
  benefits: [],
  faq: [],
  preProcedureInstructions: [],
  postProcedureInstructions: [],
  assets: [],
  viewedAt: null,
  acknowledgedAt: null,
  completed: false,
  patientAcknowledged: false,
  acknowledgement: false,
  score: null,
  language: null,
  durationSeconds: null,
  scrollCompletion: null,
  assetViews: [],
  completedAt: null,
  session: {
    sessionId: "session-1",
    documentId: "doc-1",
    packageId: null,
    versionId: null,
    startedAt: null,
    completedAt: null,
    acknowledgedAt: null,
    status: "NOT_STARTED",
    assetViews: [],
  },
} as EducationStatus;

test("tokenHash returns a stable SHA-256 hex digest", () => {
  const first = tokenHash("secret-token");
  const second = tokenHash("secret-token");
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.notEqual(first, tokenHash("other-token"));
});

test("computeDocumentHash returns a deterministic SHA-256 hex digest", () => {
  const payload = { a: 1, b: [2, 3] };
  const first = computeDocumentHash(payload);
  const second = computeDocumentHash(payload);
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.notEqual(first, computeDocumentHash({ a: 1, b: [2, 4] }));
});

test("mergeDecisionExecutionContext records a consent acceptance decision", () => {
  const result = mergeDecisionExecutionContext({
    rawMetadata: { existing: true },
    eventType: "CONSENT_ACCEPTED",
    decisionStatus: "CONSENT_ACCEPTED",
    consentHash: "consent-hash",
    consentVersion: "v2.0",
    education: baseEducation,
    refusalForm: null,
  });

  const executionContext = result.executionContext as Record<string, unknown>;
  const decision = executionContext.decision as Record<string, unknown>;
  assert.equal(decision.status, "CONSENT_ACCEPTED");
  assert.equal(decision.consentHash, "consent-hash");
  assert.equal(decision.consentVersion, "v2.0");
  assert.equal(decision.educationHash, "edu-hash");
  assert.equal(typeof decision.selectedAt, "string");
  assert.equal(decision.refusalReason, null);
  assert.equal(result.existing, true);
});

test("mergeDecisionExecutionContext records a refusal decision with reason", () => {
  const result = mergeDecisionExecutionContext({
    rawMetadata: {},
    eventType: "CONSENT_REFUSED",
    decisionStatus: "CONSENT_REFUSED",
    consentHash: "consent-hash",
    consentVersion: "v2.0",
    education: baseEducation,
    refusalForm: null,
    refusalReason: "Patient chose alternative facility",
  });

  const decision = (result.executionContext as Record<string, unknown>).decision as Record<string, unknown>;
  assert.equal(decision.status, "CONSENT_REFUSED");
  assert.equal(decision.refusalReason, "Patient chose alternative facility");
  assert.equal(typeof decision.selectedAt, "string");
});

test("mergeDecisionExecutionContext preserves prior decision fields across events", () => {
  const first = mergeDecisionExecutionContext({
    rawMetadata: {},
    eventType: "CONSENT_PRESENTED",
    decisionStatus: "UNDECIDED",
    consentHash: "consent-hash",
    consentVersion: "v2.0",
    education: baseEducation,
    refusalForm: null,
  });

  const second = mergeDecisionExecutionContext({
    rawMetadata: first,
    eventType: "REFUSAL_FORM_PRESENTED",
    decisionStatus: "CONSENT_REFUSED",
    consentHash: "consent-hash",
    consentVersion: "v2.0",
    education: baseEducation,
    refusalForm: null,
  });

  const decision = (second.executionContext as Record<string, unknown>).decision as Record<string, unknown>;
  assert.equal(decision.status, "CONSENT_REFUSED");
  assert.equal(typeof decision.consentPresentedAt, "string");
});
