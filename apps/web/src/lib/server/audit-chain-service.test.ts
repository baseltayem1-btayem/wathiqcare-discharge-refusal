import assert from "node:assert/strict";
import test from "node:test";

import { buildAuditChainHash, verifyAuditChain } from "./audit-chain-service";

test("audit hash chain verifies a valid sequence", () => {
  const firstHash = buildAuditChainHash({
    previousHash: null,
    tenantId: "tenant-1",
    caseId: "case-1",
    eventType: "CASE_CREATED",
    actorId: "user-1",
    actorRole: "doctor",
    occurredAt: "2026-04-08T10:00:00.000Z",
    payloadSummary: "Case created",
  });

  const secondHash = buildAuditChainHash({
    previousHash: firstHash,
    tenantId: "tenant-1",
    caseId: "case-1",
    eventType: "SIGNATURE_RECORDED",
    actorId: "user-1",
    actorRole: "doctor",
    occurredAt: "2026-04-08T10:05:00.000Z",
    payloadSummary: "Signature recorded",
  });

  const verification = verifyAuditChain([
    {
      tenantId: "tenant-1",
      caseId: "case-1",
      eventType: "CASE_CREATED",
      actorId: "user-1",
      actorRole: "doctor",
      previousHash: null,
      currentHash: firstHash,
      payloadSummary: "Case created",
      createdAt: "2026-04-08T10:00:00.000Z",
    },
    {
      tenantId: "tenant-1",
      caseId: "case-1",
      eventType: "SIGNATURE_RECORDED",
      actorId: "user-1",
      actorRole: "doctor",
      previousHash: firstHash,
      currentHash: secondHash,
      payloadSummary: "Signature recorded",
      createdAt: "2026-04-08T10:05:00.000Z",
    },
  ]);

  assert.equal(verification.verified, true);
  assert.equal(verification.brokenAtIndex, null);
});

test("audit hash chain detects tampering", () => {
  const firstHash = buildAuditChainHash({
    previousHash: null,
    tenantId: "tenant-1",
    caseId: "case-1",
    eventType: "CASE_CREATED",
    actorId: "user-1",
    actorRole: "doctor",
    occurredAt: "2026-04-08T10:00:00.000Z",
    payloadSummary: "Case created",
  });

  const verification = verifyAuditChain([
    {
      tenantId: "tenant-1",
      caseId: "case-1",
      eventType: "CASE_CREATED",
      actorId: "user-1",
      actorRole: "doctor",
      previousHash: null,
      currentHash: firstHash,
      payloadSummary: "Case created",
      createdAt: "2026-04-08T10:00:00.000Z",
    },
    {
      tenantId: "tenant-1",
      caseId: "case-1",
      eventType: "SIGNATURE_RECORDED",
      actorId: "user-1",
      actorRole: "doctor",
      previousHash: firstHash,
      currentHash: "tampered-hash",
      payloadSummary: "Signature recorded",
      createdAt: "2026-04-08T10:05:00.000Z",
    },
  ]);

  assert.equal(verification.verified, false);
  assert.equal(verification.brokenAtIndex, 1);
});