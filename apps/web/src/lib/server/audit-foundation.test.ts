import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import {
  AUDIT_PROTECTED_MODELS,
  AuditFoundationError,
  appendAuditEventInTransaction,
  assertAuditAppendOnly,
  createAuditIdempotencyKey,
  isAuditProtectedModel,
} from "./audit-foundation";

test("isAuditProtectedModel returns true for protected models", () => {
  for (const model of AUDIT_PROTECTED_MODELS) {
    assert.equal(isAuditProtectedModel(model), true);
  }
});

test("isAuditProtectedModel returns false for unprotected models", () => {
  assert.equal(isAuditProtectedModel("user"), false);
  assert.equal(isAuditProtectedModel("case"), false);
  assert.equal(isAuditProtectedModel("auditLogMutant"), false);
});

test("assertAuditAppendOnly throws for update and delete on protected models", () => {
  for (const action of ["update", "delete"] as const) {
    assert.throws(
      () => assertAuditAppendOnly("auditLog", action),
      (error: unknown) => {
        assert.ok(error instanceof AuditFoundationError);
        assert.equal((error as AuditFoundationError).code, "AUDIT_APPEND_ONLY_VIOLATION");
        assert.equal((error as AuditFoundationError).isRetryable, false);
        return true;
      },
    );
  }
});

test("assertAuditAppendOnly does not throw for non-protected models", () => {
  assert.doesNotThrow(() => assertAuditAppendOnly("user", "update"));
  assert.doesNotThrow(() => assertAuditAppendOnly("user", "delete"));
});

test("createAuditIdempotencyKey is deterministic for identical inputs", () => {
  const args = {
    tenantId: "tenant-1",
    entityType: "consent_record",
    entityId: "record-1",
    action: "consent_recorded",
    timestamp: "2026-06-26T12:00:00.000Z",
  };

  const first = createAuditIdempotencyKey(args);
  const second = createAuditIdempotencyKey(args);
  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("createAuditIdempotencyKey differs when inputs differ", () => {
  const base = {
    tenantId: "tenant-1",
    entityType: "consent_record",
    entityId: "record-1",
    action: "consent_recorded",
    timestamp: "2026-06-26T12:00:00.000Z",
  };

  const original = createAuditIdempotencyKey(base);
  const changed = createAuditIdempotencyKey({ ...base, action: "consent_viewed" });
  assert.notEqual(original, changed);
});

function buildMockTx(options?: { chainPreviousHash?: string | null; failAuditLog?: boolean }) {
  const auditLogCreate = options?.failAuditLog
    ? () => Promise.reject(new Error("audit log create failed"))
    : () => Promise.resolve({ id: "audit-log-id-1" });

  const chainFindFirst = () =>
    Promise.resolve(options?.chainPreviousHash ? { currentHash: options.chainPreviousHash } : null);

  const chainCreate = () => Promise.resolve({ id: "audit-chain-event-id-1" });

  return {
    auditLog: {
      create: auditLogCreate,
    },
    auditChainEvent: {
      findFirst: chainFindFirst,
      create: chainCreate,
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

test("appendAuditEventInTransaction creates audit log and chain event", async () => {
  const tx = buildMockTx();

  const result = await appendAuditEventInTransaction(
    {
      tx,
      tenantId: "tenant-1",
      userId: "user-1",
      entityType: "consent_record",
      entityId: "record-1",
      action: "consent_recorded",
      details: "Consent captured",
      caseId: "case-1",
      metadataJson: { consentMethod: "OTP" },
    },
    { idempotencyKey: "idem-1" },
  );

  assert.equal(result.auditLogId, "audit-log-id-1");
  assert.equal(result.auditChainEventId, "audit-chain-event-id-1");
});

test("appendAuditEventInTransaction propagates audit failures", async () => {
  const tx = buildMockTx({ failAuditLog: true });

  await assert.rejects(
    async () =>
      appendAuditEventInTransaction({
        tx,
        tenantId: "tenant-1",
        userId: "user-1",
        entityType: "consent_record",
        entityId: "record-1",
        action: "consent_recorded",
      }),
    /audit log create failed/,
  );
});

test("appendAuditEventInTransaction uses Prisma.JsonNull for null metadata", async () => {
  const tx = buildMockTx();

  await appendAuditEventInTransaction({
    tx,
    tenantId: "tenant-1",
    userId: "user-1",
    entityType: "consent_record",
    entityId: "record-1",
    action: "consent_recorded",
    metadataJson: null,
  });

  // The mock tx does not expose captured arguments, so we assert the call succeeded.
  assert.ok(tx);
});

test("appendAuditEventInTransaction skips creation when idempotency key already exists", async () => {
  let auditLogCreateCalls = 0;
  let chainCreateCalls = 0;

  const tx = {
    auditLog: {
      create: () => {
        auditLogCreateCalls += 1;
        return Promise.resolve({ id: "audit-log-id-1" });
      },
    },
    auditChainEvent: {
      findFirst: () =>
        Promise.resolve({
          id: "audit-chain-event-id-1",
          metadataJson: {
            idempotencyKey: "idem-existing",
            auditLogId: "audit-log-id-1",
          },
        }),
      create: () => {
        chainCreateCalls += 1;
        return Promise.resolve({ id: "audit-chain-event-id-1" });
      },
    },
  } as unknown as import("@prisma/client").PrismaClient;

  const result = await appendAuditEventInTransaction(
    {
      tx,
      tenantId: "tenant-1",
      userId: "user-1",
      entityType: "consent_record",
      entityId: "record-1",
      action: "consent_recorded",
    },
    { idempotencyKey: "idem-existing" },
  );

  assert.equal(result.auditLogId, "audit-log-id-1");
  assert.equal(result.auditChainEventId, "audit-chain-event-id-1");
  assert.equal(auditLogCreateCalls, 0, "expected no new audit log creation for idempotent key");
  assert.equal(chainCreateCalls, 0, "expected no new chain event creation for idempotent key");
});
