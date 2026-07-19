import assert from "node:assert/strict";
import test from "node:test";

import { buildEvidenceTimelineRecords } from "./evidence-package-2-service";

const baseDoc = {
  id: "doc-1",
  caseId: "case-1",
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  status: "READY_FOR_SIGNATURE",
  outcome: null as string | null,
  finalPdfHash: null as string | null,
};

const baseSession = {
  id: "session-1",
  createdAt: new Date("2026-07-01T09:05:00.000Z"),
  status: "PENDING",
  otpVerifiedAt: null as Date | null,
  linkOpenedAt: null as Date | null,
  dispatches: [] as Array<{
    channel: string;
    status: string;
    sentAt?: Date | null;
    deliveredAt?: Date | null;
    lastErrorCode?: string | null;
  }>,
};

test("buildEvidenceTimelineRecords sorts the full patient journey chronologically", () => {
  const records = buildEvidenceTimelineRecords({
    doc: { ...baseDoc },
    signatures: [
      {
        role: "PATIENT",
        signerName: "Ahmad",
        signedAt: new Date("2026-07-01T09:35:00.000Z"),
        outcome: "CONSENTED",
      },
    ],
    signingSession: {
      ...baseSession,
      dispatches: [
        {
          channel: "SMS",
          status: "DELIVERED",
          sentAt: new Date("2026-07-01T09:06:00.000Z"),
          deliveredAt: new Date("2026-07-01T09:07:00.000Z"),
        },
      ],
      linkOpenedAt: new Date("2026-07-01T09:10:00.000Z"),
      otpVerifiedAt: new Date("2026-07-01T09:12:00.000Z"),
    },
    educationEvents: [
      { createdAt: new Date("2026-07-01T09:15:00.000Z"), action: "EDUCATION_PRESENTED", metadata: {} },
    ],
    otpRows: [
      { event_type: "OTP_VERIFIED", created_at: new Date("2026-07-01T09:12:00.000Z"), raw_payload: {} },
    ],
  });

  const keys = records.map((record) => record.key);
  assert.deepEqual(keys, [
    "SESSION_CREATED",
    "DISPATCHED",
    "LINK_OPENED",
    "OTP_VERIFIED",
    "EDUCATION_VIEWED",
    "SIGNATURE_CAPTURED",
  ]);
});

test("buildEvidenceTimelineRecords marks refusal signature and omits finalization until outcome is terminal", () => {
  const records = buildEvidenceTimelineRecords({
    doc: { ...baseDoc, outcome: "REFUSED", finalPdfHash: "hash-refusal" },
    signatures: [
      {
        role: "PATIENT",
        signerName: "Ahmad",
        signedAt: new Date("2026-07-01T09:35:00.000Z"),
        outcome: "REFUSED",
      },
    ],
    signingSession: { ...baseSession },
    educationEvents: [],
    otpRows: [],
  });

  const refusalRecord = records.find((record) => record.key === "DECISION_REFUSED");
  assert.ok(refusalRecord);
  assert.equal(refusalRecord?.actorRole, "patient");

  const finalizationRecord = records.find((record) => record.key === "PDF_FINALIZED");
  assert.ok(finalizationRecord);
  assert.equal(finalizationRecord?.metadata?.outcome, "REFUSED");
});

test("buildEvidenceTimelineRecords handles guardian-signed outcome", () => {
  const records = buildEvidenceTimelineRecords({
    doc: { ...baseDoc, outcome: "GUARDIAN_SIGNED", finalPdfHash: "hash-guardian" },
    signatures: [
      {
        role: "GUARDIAN",
        signerName: "Guardian",
        signedAt: new Date("2026-07-01T09:35:00.000Z"),
        outcome: "GUARDIAN_SIGNED",
      },
    ],
    signingSession: { ...baseSession },
    educationEvents: [],
    otpRows: [],
  });

  const signatureRecord = records.find((record) => record.key === "SIGNATURE_CAPTURED");
  assert.ok(signatureRecord);
  assert.equal(signatureRecord?.metadata?.outcome, "GUARDIAN_SIGNED");

  const finalizationRecord = records.find((record) => record.key === "PDF_FINALIZED");
  assert.ok(finalizationRecord);
});

test("buildEvidenceTimelineRecords ignores records with missing timestamps", () => {
  const records = buildEvidenceTimelineRecords({
    doc: { ...baseDoc },
    signatures: [],
    signingSession: { ...baseSession, linkOpenedAt: undefined as unknown as null },
    educationEvents: [],
    otpRows: [],
  });

  const linkOpened = records.find((record) => record.key === "LINK_OPENED");
  assert.equal(linkOpened, undefined);
});
