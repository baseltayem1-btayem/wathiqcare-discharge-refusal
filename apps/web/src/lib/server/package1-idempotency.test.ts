import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { Prisma, PatientMessageChannel, PatientMessageStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { AuthContext } from "@/lib/server/auth";

import {
  canonicalizePayload,
  computePayloadFingerprint,
  deriveRootOperationKey,
  deriveChildIdempotencyKey,
  validateIdempotencyKey,
  hashRecipient,
} from "@/lib/server/idempotency-core";
import {
  createPatientMessageDispatch,
  claimDispatchForProcessing,
  recordDispatchAccepted,
  recordDispatchFailed,
  recordDispatchPermanentFailure,
  processPendingDispatches,
  recordDeliveryCallback,
  isPermanentError,
} from "@/lib/server/patient-message-outbox-service";
import { createFakeSmsGateway } from "@/lib/server/fake-sms-gateway";
import { createFakeEmailGateway } from "@/lib/server/fake-email-gateway";
import {
  createSigningSessionIdempotent,
  getActiveSigningSession,
  markSessionSentIfPending,
} from "@/lib/server/signing-session-service";
import {
  generateSigningToken,
  verifySigningToken,
  computeTokenHash,
  buildSigningUrl,
} from "@/lib/server/signing-token-service";
import {
  registerTestRecipient,
  clearTestRecipients,
  resolveRecipient,
} from "@/lib/server/recipient-resolution-service";
import {
  buildCallbackSignature,
  verifyCallbackSignature,
} from "@/lib/server/signing-callback-service";
import {
  createConsentDocument,
  buildConsentDocumentFingerprint,
  IdempotencyConflictError,
} from "@/lib/server/consent-document-create-service";
import {
  sendModuleSecureSigningLink,
  deriveSendRootOperationKey,
  resolveTrustedPdfHash,
  isDispatchConsideredSent,
  toLegacyDeliveryStatus,
  isPreviewOtpInspectionEnabled,
  refreshModuleSecureSigningStatus,
} from "@/lib/server/module-secure-signing-service";
import { markTokenUsed } from "@/lib/server/signature-orchestration-service";
import { resolveCanonicalCaseContact } from "@/lib/server/recipient-resolution-service";

// Mandatory env guards for deterministic, fail-closed behavior.
function setNodeEnv(value: string): void {
  (process.env as Record<string, string>).NODE_ENV = value;
}
function getNodeEnv(): string {
  return (process.env as Record<string, string>).NODE_ENV;
}

setNodeEnv("test");
process.env.SIGNING_TOKEN_SECRET = "test-signing-token-secret-32-bytes-long!!";
process.env.RECIPIENT_HASH_PEPPER = "test-recipient-hash-pepper-32-bytes!!";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";
process.env.RECIPIENT_RESOLVER_DISABLE_DB = "true";
process.env.SIGNING_CALLBACK_SECRET = "test-callback-secret-32-bytes-long!!";
process.env.SIGNING_BASE_URL = "https://localhost/sign";

// ---------------------------------------------------------------------------
// Idempotency core tests
// ---------------------------------------------------------------------------

test("canonicalizePayload produces deterministic JSON", () => {
  const a = canonicalizePayload({ z: 1, a: 2, nested: { b: 1, a: 2 } });
  const b = canonicalizePayload({ a: 2, z: 1, nested: { a: 2, b: 1 } });
  assert.equal(a, b);
});

test("computePayloadFingerprint is stable for equal payloads", () => {
  const fp1 = computePayloadFingerprint({ diagnosis: "A", language: "en" });
  const fp2 = computePayloadFingerprint({ language: "en", diagnosis: "A" });
  assert.equal(fp1, fp2);
});

test("computePayloadFingerprint differs for different payloads", () => {
  const fp1 = computePayloadFingerprint({ diagnosis: "A" });
  const fp2 = computePayloadFingerprint({ diagnosis: "B" });
  assert.notEqual(fp1, fp2);
});

test("deriveRootOperationKey is deterministic and tenant-scoped", () => {
  const input = {
    tenantId: "t1",
    patientId: "p1",
    encounterId: "e1",
    consentFormKey: "adenotonsillectomy",
    consentFormVersion: "1.0",
    payloadFingerprint: computePayloadFingerprint({ diagnosis: "A" }),
  };
  const k1 = deriveRootOperationKey(input);
  const k2 = deriveRootOperationKey(input);
  assert.equal(k1, k2);

  const k3 = deriveRootOperationKey({ ...input, tenantId: "t2" });
  assert.notEqual(k1, k3);
});

test("deriveChildIdempotencyKey is deterministic and distinct per operation", () => {
  const root = deriveRootOperationKey({
    tenantId: "t1",
    patientId: "p1",
    encounterId: "e1",
    consentFormKey: "adenotonsillectomy",
    consentFormVersion: "1.0",
    payloadFingerprint: computePayloadFingerprint({}),
  });

  const doc = deriveChildIdempotencyKey(root, "CONSENT_DOCUMENT_CREATE");
  const session = deriveChildIdempotencyKey(root, "SIGNING_SESSION_CREATE");
  const sms = deriveChildIdempotencyKey(root, "PATIENT_MESSAGE_SMS");
  const email = deriveChildIdempotencyKey(root, "PATIENT_MESSAGE_EMAIL");

  assert.notEqual(doc, session);
  assert.notEqual(session, sms);
  assert.notEqual(sms, email);

  assert.equal(deriveChildIdempotencyKey(root, "PATIENT_MESSAGE_SMS"), sms);
});

test("validateIdempotencyKey rejects invalid keys", () => {
  assert.throws(() => validateIdempotencyKey(""), /required/);
  assert.throws(() => validateIdempotencyKey("key with spaces"), /ASCII letters/);
  assert.throws(() => validateIdempotencyKey("a".repeat(256)), /exceed/);
  assert.doesNotThrow(() =>
    validateIdempotencyKey("valid-key_123:abc.def"),
  );
});

test("hashRecipient is tenant-scoped, stable and hides plaintext", () => {
  const h1 = hashRecipient("+966501234567", { tenantId: "t1" });
  const h2 = hashRecipient("+966501234567", { tenantId: "t1" });
  const h3 = hashRecipient("+966501234568", { tenantId: "t1" });
  const h4 = hashRecipient("+966501234567", { tenantId: "t2" });
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
  assert.notEqual(h1, h4);
  assert.ok(!h1.includes("501234567"));
});

test("hashRecipient fails closed without pepper", () => {
  const original = process.env.RECIPIENT_HASH_PEPPER;
  process.env.RECIPIENT_HASH_PEPPER = "";
  assert.throws(
    () => hashRecipient("+966501234567", { tenantId: "t1" }),
    /RECIPIENT_HASH_PEPPER/,
  );
  process.env.RECIPIENT_HASH_PEPPER = original ?? "test-recipient-hash-pepper-32-bytes!!";
});

test("deriveSendRootOperationKey is deterministic and includes PDF hash", () => {
  const base = {
    tenantId: "t1",
    caseId: "case-1",
    documentId: "doc-1",
    approvedConsentFormKey: "adenotonsillectomy",
    approvedTemplateVersionId: "v1",
    mobileNumber: "+966501234567",
    recipientEmail: "patient@example.com",
    locale: "ar" as const,
  };

  const withHashA = deriveSendRootOperationKey({ ...base, immutablePdfHash: "hash-a" });
  const withHashA2 = deriveSendRootOperationKey({ ...base, immutablePdfHash: "hash-a" });
  const withHashB = deriveSendRootOperationKey({ ...base, immutablePdfHash: "hash-b" });

  assert.equal(withHashA, withHashA2);
  assert.notEqual(withHashA, withHashB);
  assert.ok(deriveSendRootOperationKey(base));
});

test("send routes derive a canonical idempotency key from authoritative values", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const routes = [
    "src/app/api/consents/send/route.ts",
    "src/app/api/modules/informed-consents/send/route.ts",
    "src/app/api/modules/informed-consents/documents/[id]/secure-signing/route.ts",
  ];

  for (const route of routes) {
    const content = fs.readFileSync(path.resolve(route), "utf8");
    assert.ok(
      content.includes("deriveSendRootOperationKey"),
      `${route} must derive a canonical server idempotency key`,
    );
    assert.ok(
      content.includes("idempotencyKey:") && content.includes("sendModuleSecureSigningLink"),
      `${route} must pass an idempotency key to sendModuleSecureSigningLink`,
    );
    assert.ok(
      !content.includes("randomUUID"),
      `${route} must not use randomUUID as an idempotency fallback`,
    );
  }
});

test("resolveTrustedPdfHash prefers the immutablePdfHash column", () => {
  assert.equal(
    resolveTrustedPdfHash({ immutablePdfHash: " column-hash ", metadata: { immutablePdfHash: "meta-hash" } }),
    "column-hash",
  );
  assert.equal(
    resolveTrustedPdfHash({ immutablePdfHash: null, metadata: { checksum: "checksum-hash" } }),
    "checksum-hash",
  );
  assert.equal(resolveTrustedPdfHash({ immutablePdfHash: null, metadata: {} }), null);
});

// ---------------------------------------------------------------------------
// Deterministic signed signing token tests
// ---------------------------------------------------------------------------

test("generateSigningToken is deterministic for same inputs", () => {
  const expiresAt = new Date("2026-01-01T00:00:00Z");
  const t1 = generateSigningToken({
    tenantId: "t1",
    sessionId: "s1",
    signerRole: "PATIENT",
    expiresAt,
  });
  const t2 = generateSigningToken({
    tenantId: "t1",
    sessionId: "s1",
    signerRole: "PATIENT",
    expiresAt,
  });
  assert.equal(t1, t2);
  assert.ok(t1.startsWith("v1:"));
});

test("verifySigningToken returns claims for a valid token", () => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = generateSigningToken({
    tenantId: "t1",
    sessionId: "s1",
    signerRole: "PATIENT",
    expiresAt,
  });
  const claims = verifySigningToken(token);
  assert.equal(claims.tenantId, "t1");
  assert.equal(claims.sessionId, "s1");
  assert.equal(claims.signerRole, "PATIENT");
});

test("verifySigningToken rejects wrong signature", () => {
  const token = generateSigningToken({
    tenantId: "t1",
    sessionId: "s1",
    signerRole: "PATIENT",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const tampered = token.replace(/.$/, token.at(-1) === "a" ? "b" : "a");
  assert.throws(() => verifySigningToken(tampered), /INVALID_TOKEN_SIGNATURE/);
});

test("verifySigningToken rejects expired token", () => {
  const token = generateSigningToken({
    tenantId: "t1",
    sessionId: "s1",
    signerRole: "PATIENT",
    expiresAt: new Date(Date.now() - 1000),
  });
  assert.throws(() => verifySigningToken(token), /TOKEN_EXPIRED/);
});

test("computeTokenHash is SHA-256 hex", () => {
  const hash = computeTokenHash("hello");
  assert.equal(hash.length, 64);
  assert.ok(/^[a-f0-9]+$/.test(hash));
});

test("buildSigningUrl uses NEXTAUTH_URL fallback", () => {
  const token = generateSigningToken({
    tenantId: "t1",
    sessionId: "s1",
    signerRole: "PATIENT",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const url = buildSigningUrl(token);
  assert.ok(url.includes("/sign/"));
  assert.ok(url.includes(encodeURIComponent(token)));
});

// ---------------------------------------------------------------------------
// Fake gateway tests
// ---------------------------------------------------------------------------

test("fake SMS gateway records calls and can simulate failures", async () => {
  const gateway = createFakeSmsGateway();
  const result = await gateway.send({ recipient: "+966501234567", message: "hello" });
  assert.equal(result.ok, true);
  assert.equal(gateway.calls.length, 1);
  assert.equal(gateway.calls[0].recipient, "+966501234567");

  gateway.setFailureCount(1);
  const failed = await gateway.send({ recipient: "+966501234567", message: "hello" });
  assert.equal(failed.ok, false);
  assert.equal(gateway.calls.length, 2);

  const recovered = await gateway.send({ recipient: "+966501234567", message: "hello" });
  assert.equal(recovered.ok, true);
});

test("fake email gateway records calls", async () => {
  const gateway = createFakeEmailGateway();
  const result = await gateway.send({
    recipient: "patient@example.com",
    subject: "Consent",
    html: "<p>Consent</p>",
    text: "Consent",
  });
  assert.equal(result.ok, true);
  assert.equal(gateway.calls.length, 1);
});

// ---------------------------------------------------------------------------
// In-memory Prisma fake helpers
// ---------------------------------------------------------------------------

type ClaimedDispatch = {
  id: string;
  channel: PatientMessageChannel;
  tenantId: string;
  signingSessionId: string;
  recipientReference: string;
  templateKey: string;
  locale: "ar" | "en";
  signerRole: string;
  expiresAt: Date;
  recipientHash: string;
};

type DispatchRecord = {
  id: string;
  tenantId: string;
  signingSessionId: string;
  channel: PatientMessageChannel;
  idempotencyKey: string;
  idempotencyFingerprint: string;
  recipientHash: string;
  recipientReference: string;
  status: PatientMessageStatus;
  attemptCount: number;
  maxAttempts: number;
  claimedAt: Date | null;
  claimExpiresAt: Date | null;
  lastAttemptAt: Date | null;
  nextAttemptAt: Date;
  providerMessageId: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  metadata: unknown;
};

function createMemoryOutboxClient(initial: DispatchRecord[] = []) {
  const records = new Map<string, DispatchRecord>(initial.map((r) => [r.id, r]));
  let idCounter = 1;

  function findUnique(args: {
    where: {
      id?: string;
      tenantId_signingSessionId_channel_idempotencyKey?: {
        tenantId: string;
        signingSessionId: string;
        channel: PatientMessageChannel;
        idempotencyKey: string;
      };
    };
  }) {
    if (args.where.id) {
      return Promise.resolve(structuredClone(records.get(args.where.id) ?? null));
    }
    const key = args.where.tenantId_signingSessionId_channel_idempotencyKey;
    if (!key) return Promise.resolve(null);
    for (const record of records.values()) {
      if (
        record.tenantId === key.tenantId
        && record.signingSessionId === key.signingSessionId
        && record.channel === key.channel
        && record.idempotencyKey === key.idempotencyKey
      ) {
        return Promise.resolve(structuredClone(record));
      }
    }
    return Promise.resolve(null);
  }

  function findUniqueById(id: string) {
    return Promise.resolve(structuredClone(records.get(id) ?? null));
  }

  function findMany(args: {
    where?: unknown;
    orderBy?: unknown;
    take?: number;
  }) {
    const where = (args.where || {}) as Record<string, unknown>;
    const tenantId = where.tenantId as string | undefined;
    const channel = where.channel as PatientMessageChannel | undefined;
    const providerMessageId = where.providerMessageId as string | undefined;
    const or = (where.OR as Array<Record<string, unknown>> | undefined) ?? [];
    const nowBranch = or.find((w) => w.nextAttemptAt && typeof w.nextAttemptAt === "object");
    const now = nowBranch
      ? (nowBranch.nextAttemptAt as { lte: Date }).lte
      : undefined;
    const claimBranch = or.find((w) => w.claimExpiresAt && typeof w.claimExpiresAt === "object");
    const claimNow = claimBranch
      ? (claimBranch.claimExpiresAt as { lte: Date }).lte
      : undefined;

    let matches: DispatchRecord[] = [];
    for (const record of records.values()) {
      if (tenantId !== undefined && record.tenantId !== tenantId) continue;
      if (channel !== undefined && record.channel !== channel) continue;
      if (providerMessageId !== undefined && record.providerMessageId !== providerMessageId) continue;

      let eligible = false;
      if (
        (record.status === PatientMessageStatus.PENDING || record.status === PatientMessageStatus.FAILED)
        && now
        && record.nextAttemptAt <= now
      ) {
        eligible = true;
      }
      if (
        record.status === PatientMessageStatus.CLAIMED
        && record.claimExpiresAt
        && claimNow
        && record.claimExpiresAt <= claimNow
      ) {
        eligible = true;
      }
      if (or.length === 0) eligible = true;
      if (eligible) matches.push(record);
    }

    matches = matches.sort((a, b) => {
      const aNext = a.nextAttemptAt.getTime();
      const bNext = b.nextAttemptAt.getTime();
      if (aNext !== bNext) return aNext - bNext;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    if (args.take) matches = matches.slice(0, args.take);
    return Promise.resolve(matches.map((r) => structuredClone(r)));
  }

  function create(args: { data: Partial<DispatchRecord> }) {
    const id = `dispatch-${idCounter++}`;
    const record = {
      ...args.data,
      id,
      createdAt: new Date(),
    } as DispatchRecord;
    records.set(id, record);
    return Promise.resolve(structuredClone(record));
  }

  function update(args: {
    where: { id: string; status?: PatientMessageStatus };
    data: Partial<DispatchRecord>;
  }) {
    const record = records.get(args.where.id);
    if (!record) throw new Error("Record not found");
    if (args.where.status !== undefined && record.status !== args.where.status) {
      throw new Error("Status mismatch");
    }
    for (const [key, value] of Object.entries(args.data)) {
      const recordRef = record as unknown as Record<string, unknown>;
      if (value && typeof value === "object" && "increment" in value) {
        recordRef[key] =
          (recordRef[key] as number) + (value as { increment: number }).increment;
      } else if (value && typeof value === "object" && "decrement" in value) {
        recordRef[key] =
          (recordRef[key] as number) - (value as { decrement: number }).decrement;
      } else {
        recordRef[key] = value;
      }
    }
    return Promise.resolve(structuredClone(record));
  }

  function updateMany(args: {
    where: {
      tenantId?: string;
      channel?: PatientMessageChannel;
      providerMessageId?: string;
      status?: { in?: PatientMessageStatus[] };
    };
    data: Partial<DispatchRecord>;
  }) {
    let count = 0;
    for (const record of records.values()) {
      if (args.where.tenantId !== undefined && record.tenantId !== args.where.tenantId) continue;
      if (args.where.channel !== undefined && record.channel !== args.where.channel) continue;
      if (
        args.where.providerMessageId !== undefined
        && record.providerMessageId !== args.where.providerMessageId
      ) continue;
      if (
        args.where.status?.in
        && !args.where.status.in.includes(record.status)
      ) continue;
      for (const [key, value] of Object.entries(args.data)) {
        const recordRef = record as unknown as Record<string, unknown>;
        recordRef[key] = value;
      }
      count += 1;
    }
    return Promise.resolve({ count });
  }

  function claimNextEligible(
    tenantId: string,
    channel: PatientMessageChannel | null,
    now: Date,
    leaseExpiresAt: Date,
  ): ClaimedDispatch | null {
    let matches: DispatchRecord[] = [];
    for (const record of records.values()) {
      if (record.tenantId !== tenantId) continue;
      if (channel !== null && record.channel !== channel) continue;

      let eligible = false;
      if (
        (record.status === PatientMessageStatus.PENDING || record.status === PatientMessageStatus.FAILED)
        && record.nextAttemptAt <= now
      ) {
        eligible = true;
      }
      if (
        record.status === PatientMessageStatus.CLAIMED
        && record.claimExpiresAt
        && record.claimExpiresAt <= now
      ) {
        eligible = true;
      }
      if (eligible) matches.push(record);
    }

    matches = matches.sort((a, b) => {
      const aNext = a.nextAttemptAt.getTime();
      const bNext = b.nextAttemptAt.getTime();
      if (aNext !== bNext) return aNext - bNext;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const row = matches[0];
    if (!row) return null;

    row.status = PatientMessageStatus.CLAIMED;
    row.claimedAt = now;
    row.claimExpiresAt = leaseExpiresAt;
    row.attemptCount += 1;
    row.lastAttemptAt = now;

    const metadata = (row.metadata || {}) as Record<string, unknown>;
    return {
      id: row.id,
      channel: row.channel,
      tenantId: row.tenantId,
      signingSessionId: row.signingSessionId,
      recipientReference: row.recipientReference,
      templateKey: String(metadata.templateKey || ""),
      locale: String(metadata.locale || "ar") as "ar" | "en",
      signerRole: String(metadata.signerRole || ""),
      expiresAt: new Date(String(metadata.expiresAt || new Date().toISOString())),
      recipientHash: row.recipientHash,
    };
  }

  async function queryRaw(
    query: { sql: string; values: unknown[] },
  ): Promise<
    Array<{
      id: string;
      channel: PatientMessageChannel;
      tenant_id: string;
      signing_session_id: string;
      recipient_reference: string;
      template_key: string;
      locale: string;
      signer_role: string;
      expires_at: Date;
      recipient_hash: string;
    }>
  > {
    if (query.sql.toLowerCase().includes("update patient_message_dispatches")) {
      const tenantId = query.values[0] as string;
      const channelFilter = (query.values[1] ?? null) as PatientMessageChannel | null;
      const dates = query.values.filter((v): v is Date => v instanceof Date);
      const now = dates[0];
      const leaseExpiresAt = dates.length > 1
        ? dates.slice(1).reduce((max, d) => (d > max ? d : max), now)
        : now;
      const claim = claimNextEligible(tenantId, channelFilter, now, leaseExpiresAt);
      if (!claim) return [];
      return [
        {
          id: claim.id,
          channel: claim.channel,
          tenant_id: claim.tenantId,
          signing_session_id: claim.signingSessionId,
          recipient_reference: claim.recipientReference,
          template_key: claim.templateKey,
          locale: claim.locale,
          signer_role: claim.signerRole,
          expires_at: claim.expiresAt,
          recipient_hash: claim.recipientHash,
        },
      ];
    }
    return [];
  }

  async function transaction<T>(
    callback: (tx: unknown) => Promise<T>,
    _options?: unknown,
  ): Promise<T> {
    return callback({
      patientMessageDispatch: { findMany, update, updateMany, findUnique },
      signingSession: { updateMany: async () => ({ count: 0 }) },
    });
  }

  return {
    patientMessageDispatch: {
      findUnique,
      findUniqueById,
      findMany,
      create,
      update,
      updateMany,
    },
    signingSession: { updateMany: async () => ({ count: 0 }) },
    $queryRaw: queryRaw as unknown as PrismaClient["$queryRaw"],
    $transaction: transaction as unknown as PrismaClient["$transaction"],
    get records() {
      return Array.from(records.values()).map((r) => structuredClone(r));
    },
  };
}

// ---------------------------------------------------------------------------
// Patient message outbox tests
// ---------------------------------------------------------------------------

function sampleDispatchInput(
  overrides: Partial<Parameters<typeof createPatientMessageDispatch>[0]> = {},
): Parameters<typeof createPatientMessageDispatch>[0] {
  return {
    tenantId: "t1",
    signingSessionId: "s1",
    channel: PatientMessageChannel.SMS,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    recipientHash: hashRecipient("+966501234567", { tenantId: "t1" }),
    recipientReference: "consent_document:doc-1:mobile",
    templateKey: "secure_signing_link_sms",
    locale: "ar",
    signerRole: "PATIENT",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}

test("createPatientMessageDispatch writes one record per intended send", async () => {
  const client = createMemoryOutboxClient();
  const input = sampleDispatchInput();

  const first = await createPatientMessageDispatch(
    input,
    client as unknown as Prisma.TransactionClient,
  );
  const second = await createPatientMessageDispatch(
    input,
    client as unknown as Prisma.TransactionClient,
  );

  assert.equal(first.id, second.id);
  assert.equal(client.records.length, 1);
  assert.equal(client.records[0].status, PatientMessageStatus.PENDING);
  assert.equal(client.records[0].recipientReference, input.recipientReference);
  assert.equal(client.records[0].recipientHash, input.recipientHash);
  assert.equal((client.records[0].metadata as Record<string, unknown>).message, undefined);
});

test("createPatientMessageDispatch returns conflict for different fingerprint", async () => {
  const client = createMemoryOutboxClient();
  const input = sampleDispatchInput();

  await createPatientMessageDispatch(input, client as unknown as Prisma.TransactionClient);

  await assert.rejects(
    createPatientMessageDispatch(
      { ...input, idempotencyFingerprint: "fp-2" },
      client as unknown as Prisma.TransactionClient,
    ),
    /IDEMPOTENCY_CONFLICT/,
  );
});

test("claimDispatchForProcessing leases an eligible PENDING dispatch", async () => {
  const client = createMemoryOutboxClient();
  const now = new Date("2026-01-01T00:00:00Z");
  await createPatientMessageDispatch(
    sampleDispatchInput({ nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  const claim = await claimDispatchForProcessing(
    "t1",
    now,
    undefined,
    client as unknown as Parameters<typeof claimDispatchForProcessing>[3],
  );
  assert.ok(claim);
  assert.equal(claim?.recipientReference, "consent_document:doc-1:mobile");

  const record = client.records[0];
  assert.equal(record.status, PatientMessageStatus.CLAIMED);
  assert.equal(record.attemptCount, 1);
  assert.ok(record.claimExpiresAt && record.claimExpiresAt > now);
});

test("non-expired CLAIMED dispatch cannot be reclaimed", async () => {
  const client = createMemoryOutboxClient();
  const now = new Date("2026-01-01T00:00:00Z");
  await createPatientMessageDispatch(
    sampleDispatchInput({ nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  const first = await claimDispatchForProcessing(
    "t1",
    now,
    undefined,
    client as unknown as Parameters<typeof claimDispatchForProcessing>[3],
  );
  assert.ok(first);

  const second = await claimDispatchForProcessing(
    "t1",
    new Date(now.getTime() + 1000),
    undefined,
    client as unknown as Parameters<typeof claimDispatchForProcessing>[3],
  );
  assert.equal(second, null);
});

test("expired CLAIMED dispatch can be reclaimed", async () => {
  const client = createMemoryOutboxClient();
  const now = new Date("2026-01-01T00:00:00Z");
  await createPatientMessageDispatch(
    sampleDispatchInput({ nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  await claimDispatchForProcessing(
    "t1",
    now,
    undefined,
    client as unknown as Parameters<typeof claimDispatchForProcessing>[3],
  );
  const later = new Date(now.getTime() + 120_000);
  const reclaimed = await claimDispatchForProcessing(
    "t1",
    later,
    undefined,
    client as unknown as Parameters<typeof claimDispatchForProcessing>[3],
  );
  assert.ok(reclaimed);
  assert.equal(client.records[0].attemptCount, 2);
});

test("nextAttemptAt prevents premature retry", async () => {
  const client = createMemoryOutboxClient();
  const now = new Date("2026-01-01T00:00:00Z");
  await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );

  client.records[0].nextAttemptAt = new Date(now.getTime() + 60_000);

  const claim = await claimDispatchForProcessing(
    "t1",
    now,
    undefined,
    client as unknown as Parameters<typeof claimDispatchForProcessing>[3],
  );
  assert.equal(claim, null);
});

test("Gateway failure remains retryable and successful retry does not resend", async () => {
  const client = createMemoryOutboxClient();
  const gateway = createFakeSmsGateway();
  gateway.setFailureCount(1);
  const now = new Date("2026-01-01T00:00:00Z");

  await createPatientMessageDispatch(
    sampleDispatchInput({ nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  registerTestRecipient("t1", "consent_document:doc-1:mobile", {
    mobile: "+966501234567",
  });

  const first = await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });
  assert.equal(first.processed, 1);
  assert.equal(gateway.calls.length, 1);
  assert.equal(client.records[0].status, PatientMessageStatus.FAILED);

  const later = new Date(now.getTime() + 60_000);
  const second = await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now: later,
    client: client as unknown as PrismaClient,
  });
  assert.equal(second.processed, 1);
  assert.equal(gateway.calls.length, 2);
  assert.equal(client.records[0].status, PatientMessageStatus.ACCEPTED);

  const third = await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now: new Date(later.getTime() + 60_000),
    client: client as unknown as PrismaClient,
  });
  assert.equal(third.processed, 0);
  assert.equal(gateway.calls.length, 2);

  clearTestRecipients();
});

test("maxAttempts results in PERMANENT_FAILURE", async () => {
  const client = createMemoryOutboxClient();
  const gateway = createFakeSmsGateway({ errorCode: "SMS_GATEWAY_UNAVAILABLE" });
  gateway.setFailureCount(2);
  const now = new Date("2026-01-01T00:00:00Z");

  await createPatientMessageDispatch(
    sampleDispatchInput({ maxAttempts: 2, nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  registerTestRecipient("t1", "consent_document:doc-1:mobile", {
    mobile: "+966501234567",
  });

  await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });
  assert.equal(client.records[0].status, PatientMessageStatus.FAILED);

  await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now: new Date(now.getTime() + 60_000),
    client: client as unknown as PrismaClient,
  });
  assert.equal(client.records[0].status, PatientMessageStatus.PERMANENT_FAILURE);

  clearTestRecipients();
});

test("immediate permanent failure classification", async () => {
  const client = createMemoryOutboxClient();
  const gateway = createFakeSmsGateway({ errorCode: "invalid_recipient" });
  gateway.setPermanentFailure();
  const now = new Date("2026-01-01T00:00:00Z");

  await createPatientMessageDispatch(
    sampleDispatchInput({ nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  registerTestRecipient("t1", "consent_document:doc-1:mobile", {
    mobile: "+966501234567",
  });

  await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });
  assert.equal(client.records[0].status, PatientMessageStatus.PERMANENT_FAILURE);

  clearTestRecipients();
});

test("missing recipient resolver fails closed", async () => {
  const client = createMemoryOutboxClient();
  const gateway = createFakeSmsGateway();
  const now = new Date("2026-01-01T00:00:00Z");

  await createPatientMessageDispatch(
    sampleDispatchInput({ nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  clearTestRecipients();
  await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });

  assert.equal(client.records[0].status, PatientMessageStatus.PERMANENT_FAILURE);
  assert.equal(client.records[0].lastErrorCode, "RECIPIENT_NOT_FOUND");
});

test("recipient hash mismatch prevents gateway invocation", async () => {
  const client = createMemoryOutboxClient();
  const gateway = createFakeSmsGateway();
  const now = new Date("2026-01-01T00:00:00Z");

  // Dispatch was created for a different mobile number than the one the resolver returns.
  await createPatientMessageDispatch(
    sampleDispatchInput({
      nextAttemptAt: now,
      recipientHash: hashRecipient("+966509999999", { tenantId: "t1" }),
    }),
    client as unknown as Prisma.TransactionClient,
  );

  registerTestRecipient("t1", "consent_document:doc-1:mobile", {
    mobile: "+966501234567",
  });

  await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });

  assert.equal(gateway.calls.length, 0);
  assert.equal(client.records[0].status, PatientMessageStatus.PERMANENT_FAILURE);
  assert.equal(client.records[0].lastErrorCode, "RECIPIENT_HASH_MISMATCH");
  clearTestRecipients();
});

test("resolver database failure remains retryable", async () => {
  const client = createMemoryOutboxClient();
  const gateway = createFakeSmsGateway();
  const now = new Date("2026-01-01T00:00:00Z");

  await createPatientMessageDispatch(
    sampleDispatchInput({ nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  // Force the resolver to hit the (dummy) database and fail.
  const originalDisable = process.env.RECIPIENT_RESOLVER_DISABLE_DB;
  process.env.RECIPIENT_RESOLVER_DISABLE_DB = "false";
  clearTestRecipients();

  await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });

  assert.equal(gateway.calls.length, 0);
  assert.equal(client.records[0].status, PatientMessageStatus.FAILED);
  assert.equal(client.records[0].lastErrorCode, "PROCESSING_EXCEPTION");

  process.env.RECIPIENT_RESOLVER_DISABLE_DB = originalDisable ?? "true";
  clearTestRecipients();
});

test("recipient reference tenant isolation", async () => {
  registerTestRecipient("t1", "consent_document:doc-1:mobile", {
    mobile: "+966501234567",
  });
  const resolvedT1 = await (await import("@/lib/server/recipient-resolution-service")).resolveRecipient({
    tenantId: "t1",
    reference: "consent_document:doc-1:mobile",
  });
  const resolvedT2 = await (await import("@/lib/server/recipient-resolution-service")).resolveRecipient({
    tenantId: "t2",
    reference: "consent_document:doc-1:mobile",
  });

  assert.ok(resolvedT1?.mobile);
  assert.equal(resolvedT2, null);
  clearTestRecipients();
});

test("Gateway acceptance does not mark DELIVERED", async () => {
  const client = createMemoryOutboxClient();
  const gateway = createFakeSmsGateway();
  const now = new Date("2026-01-01T00:00:00Z");

  await createPatientMessageDispatch(
    sampleDispatchInput({ nextAttemptAt: now }),
    client as unknown as Prisma.TransactionClient,
  );

  registerTestRecipient("t1", "consent_document:doc-1:mobile", {
    mobile: "+966501234567",
  });

  await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });
  assert.equal(client.records[0].status, PatientMessageStatus.ACCEPTED);
  assert.ok(client.records[0].acceptedAt instanceof Date);
  assert.ok(
    gateway.calls[0].idempotencyKey,
    "gateway send must receive the dispatch idempotency key",
  );

  clearTestRecipients();
});

test("provider-accepted dispatch cannot regress to FAILED", async () => {
  const client = createMemoryOutboxClient();
  const dispatch = await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );

  await recordDispatchAccepted(dispatch.id, "msg-1", client as unknown as PrismaClient);
  assert.equal(client.records[0].status, PatientMessageStatus.ACCEPTED);

  await assert.rejects(
    recordDispatchFailed(dispatch.id, "SMS_GATEWAY_FAILED", "late failure", client as unknown as PrismaClient),
    /Invalid status transition/,
  );

  assert.equal(client.records[0].status, PatientMessageStatus.ACCEPTED);
});

test("reconciliation failure cannot cause resend after provider acceptance", async () => {
  const client = createMemoryOutboxClient();
  const dispatch = await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );

  // Simulate a provider-accepted dispatch that is already ACCEPTED.
  await client.patientMessageDispatch.update({
    where: { id: dispatch.id },
    data: {
      status: PatientMessageStatus.ACCEPTED,
      acceptedAt: new Date(),
      nextAttemptAt: new Date("2026-01-01T00:00:00Z"),
    },
  });

  const now = new Date("2026-01-01T00:00:00Z");

  const result = await processPendingDispatches({
    tenantId: "t1",
    smsGateway: createFakeSmsGateway(),
    now,
    client: client as unknown as PrismaClient,
  });

  assert.equal(result.processed, 0);
  assert.equal(client.records[0].status, PatientMessageStatus.ACCEPTED);
});

test("True duplicate delivery callback is idempotent", async () => {
  const client = createMemoryOutboxClient();
  const dispatch = await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );

  await recordDispatchAccepted(dispatch.id, "msg-1", client as unknown as PrismaClient);
  const first = client.records[0].acceptedAt;

  await recordDispatchAccepted(dispatch.id, "msg-1", client as unknown as PrismaClient);
  const second = client.records[0].acceptedAt;

  assert.equal(first?.getTime(), second?.getTime());
});

test("recordDeliveryCallback transitions ACCEPTED/SENT -> DELIVERED only", async () => {
  const client = createMemoryOutboxClient();
  const dispatch = await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );

  const noTransition = await recordDeliveryCallback({
    tenantId: "t1",
    channel: PatientMessageChannel.SMS,
    providerMessageId: "msg-1",
    status: "DELIVERED",
    client: client as unknown as PrismaClient,
  });
  assert.equal(noTransition.updated, false);

  await recordDispatchAccepted(dispatch.id, "msg-1", client as unknown as PrismaClient);
  const first = await recordDeliveryCallback({
    tenantId: "t1",
    channel: PatientMessageChannel.SMS,
    providerMessageId: "msg-1",
    status: "DELIVERED",
    client: client as unknown as PrismaClient,
  });
  assert.equal(first.updated, true);
  assert.equal(client.records[0].status, PatientMessageStatus.DELIVERED);

  const second = await recordDeliveryCallback({
    tenantId: "t1",
    channel: PatientMessageChannel.SMS,
    providerMessageId: "msg-1",
    status: "DELIVERED",
    client: client as unknown as PrismaClient,
  });
  assert.equal(second.updated, false);
});

test("sanitizeErrorMessage redacts tokens, URLs and recipients", async () => {
  const client = createMemoryOutboxClient();
  const dispatch = await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );

  await recordDispatchFailed(
    dispatch.id,
    "PROCESSING_EXCEPTION",
    "Error for +966501234567 and patient@example.com and https://wathiqcare.online/sign/v1:abc:def",
    client as unknown as PrismaClient,
  );

  const message = client.records[0].lastErrorMessage;
  assert.ok(message);
  assert.ok(!message.includes("+966501234567"));
  assert.ok(!message.includes("patient@example.com"));
  assert.ok(!message.includes("https://wathiqcare.online/sign/"));
  assert.ok(!message.includes("v1:abc:def"));
});

// ---------------------------------------------------------------------------
// Signing session tests
// ---------------------------------------------------------------------------

type SessionRecord = {
  id: string;
  tenantId: string;
  documentId: string;
  moduleType: string;
  providerKey: string;
  providerSessionId: string | null;
  status: string;
  requiredSigners: unknown;
  completedSigners: unknown;
  signerLinks: unknown;
  expiresAt: Date | null;
  completedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  signedPdfKey: string | null;
  initiatedById: string;
  resendCount: number;
  lastResentAt: Date | null;
  idempotencyKey: string | null;
  idempotencyFingerprint: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type TokenRecord = {
  id: string;
  sessionId: string;
  tenantId: string;
  signerRole: string;
  tokenHash: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  ipOnUse: string | null;
  createdAt: Date;
};

function createMemorySigningSessionClient(
  initialSessions: SessionRecord[] = [],
  initialTokens: TokenRecord[] = [],
  options: { enforceActiveSessionUniqueness?: boolean; serializationFailures?: number } = {},
) {
  const sessions = new Map<string, SessionRecord>(initialSessions.map((s) => [s.id, s]));
  const tokens = new Map<string, TokenRecord>(initialTokens.map((t) => [t.id, t]));
  const dispatchInputs = new Map<string, DispatchRecord>();
  let sessionIdCounter = 1;
  let tokenIdCounter = 1;
  let dispatchIdCounter = 1;
  let transactionAttempt = 0;

  async function transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
    transactionAttempt += 1;
    if (options.serializationFailures && transactionAttempt <= options.serializationFailures) {
      throw new Prisma.PrismaClientKnownRequestError(
        "Could not serialize access due to concurrent update",
        { code: "P2034", clientVersion: "0.0.0" },
      );
    }
    return callback({
      signingSession: {
        findMany: findManySessions,
        findUnique: findSessionById,
        updateMany: updateManySessions,
        update: updateSession,
        create: createSession,
      },
      signingSecureToken: {
        updateMany: updateManyTokens,
        create: createToken,
      },
      patientMessageDispatch: {
        findUnique: async () => null,
        create: async (args: { data: Partial<DispatchRecord> }) => {
          const id = `dispatch-${dispatchIdCounter++}`;
          const record = {
            ...args.data,
            id,
            status: PatientMessageStatus.PENDING,
          } as DispatchRecord;
          dispatchInputs.set(id, record);
          return structuredClone(record);
        },
      },
      consentAuditEvent: { create: async () => undefined },
      consentTimelineEvent: { create: async () => undefined },
    });
  }

  function findSessionById(args: { where: { id: string } }) {
    return Promise.resolve(structuredClone(sessions.get(args.where.id) ?? null));
  }

  function findManySessions(args: {
    where: {
      tenantId: string;
      documentId: string;
      status?: { notIn?: string[]; in?: string[] };
      idempotencyKey?: string;
    };
  }) {
    const matches: SessionRecord[] = [];
    for (const s of sessions.values()) {
      if (s.tenantId === args.where.tenantId && s.documentId === args.where.documentId) {
        if (args.where.status?.notIn?.includes(s.status)) continue;
        if (args.where.status?.in && !args.where.status.in.includes(s.status)) continue;
        matches.push(structuredClone(s));
      }
    }
    return Promise.resolve(matches);
  }

  function findFirst(args: {
    where: {
      tenantId: string;
      documentId?: string;
      status?: { notIn?: string[]; in?: string[] };
      idempotencyKey?: string;
    };
    include?: unknown;
    orderBy?: unknown;
  }) {
    let candidates = Array.from(sessions.values()).filter(
      (s) => s.tenantId === args.where.tenantId,
    );
    const documentId = args.where.documentId;
    if (documentId !== undefined) {
      candidates = candidates.filter((s) => s.documentId === documentId);
    }
    const idempotencyKey = args.where.idempotencyKey;
    if (idempotencyKey !== undefined) {
      candidates = candidates.filter((s) => s.idempotencyKey === idempotencyKey);
    }
    const statusNotIn = args.where.status?.notIn;
    if (statusNotIn) {
      candidates = candidates.filter(
        (s) => !statusNotIn.includes(s.status),
      );
    }
    const statusIn = args.where.status?.in;
    if (statusIn) {
      candidates = candidates.filter((s) => statusIn.includes(s.status));
    }
    candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const result = candidates[0] ?? null;
    if (result && (args.include as { tokens?: boolean } | undefined)?.tokens) {
      (result as SessionRecord & { tokens?: TokenRecord[] }).tokens = Array.from(tokens.values())
        .filter((t) => t.sessionId === result.id)
        .map((t) => structuredClone(t));
    }
    return Promise.resolve(result ? structuredClone(result) : null);
  }

  function updateManySessions(args: {
    where: { id?: string | { in: string[] }; tenantId?: string; status?: string };
    data: Partial<SessionRecord>;
  }) {
    let count = 0;
    const idSet = args.where.id
      ? (typeof args.where.id === "string"
          ? new Set([args.where.id])
          : new Set(args.where.id.in))
      : null;
    for (const s of sessions.values()) {
      if (args.where.tenantId !== undefined && s.tenantId !== args.where.tenantId) continue;
      if (args.where.status !== undefined && s.status !== args.where.status) continue;
      if (idSet && !idSet.has(s.id)) continue;
      Object.assign(s, args.data);
      count += 1;
    }
    return Promise.resolve({ count });
  }

  function updateSession(args: {
    where: { id: string };
    data: Partial<SessionRecord>;
  }) {
    const record = sessions.get(args.where.id);
    if (!record) throw new Error("Session not found");
    Object.assign(record, args.data);
    return Promise.resolve(structuredClone(record));
  }

  function updateManyTokens(args: {
    where: { sessionId?: { in: string[] }; usedAt?: null; revokedAt?: null; tokenHash?: string; expiresAt?: { gt: Date } };
    data: Partial<TokenRecord>;
  }) {
    let count = 0;
    for (const t of tokens.values()) {
      if (args.where.sessionId?.in.includes(t.sessionId)) {
        if (args.where.usedAt === null && t.usedAt !== null) continue;
        if (args.where.revokedAt === null && t.revokedAt !== null) continue;
        Object.assign(t, args.data);
        count += 1;
      }
      if (
        args.where.tokenHash !== undefined
        && t.tokenHash === args.where.tokenHash
      ) {
        if (args.where.usedAt === null && t.usedAt !== null) continue;
        if (args.where.revokedAt === null && t.revokedAt !== null) continue;
        if (args.where.expiresAt?.gt && t.expiresAt.getTime() <= args.where.expiresAt.gt.getTime()) continue;
        Object.assign(t, args.data);
        count += 1;
      }
    }
    return Promise.resolve({ count });
  }

  function createSession(args: { data: Partial<SessionRecord> }) {
    const data = args.data as Partial<SessionRecord>;
    if (options.enforceActiveSessionUniqueness) {
      const activeStatuses = new Set(["PENDING", "SENT", "PARTIALLY_SIGNED"]);
      const hasActiveConflict = Array.from(sessions.values()).some(
        (s) =>
          s.tenantId === data.tenantId
          && s.documentId === data.documentId
          && activeStatuses.has(s.status),
      );
      if (hasActiveConflict) {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed on the fields: (`tenant_id`,`document_id`)",
          { code: "P2002", clientVersion: "0.0.0", meta: { target: ["tenant_id", "document_id"] } },
        );
      }
    }
    const id = `session-${sessionIdCounter++}`;
    const record = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SessionRecord;
    sessions.set(id, record);
    return Promise.resolve(structuredClone(record));
  }

  function createToken(args: { data: Partial<TokenRecord> }) {
    const id = `token-${tokenIdCounter++}`;
    const record = {
      usedAt: null,
      revokedAt: null,
      ...args.data,
      id,
      createdAt: new Date(),
    } as TokenRecord;
    tokens.set(id, record);
    return Promise.resolve(structuredClone(record));
  }

  return {
    signingSession: {
      findFirst,
      findMany: findManySessions,
      findUnique: findSessionById,
      updateMany: updateManySessions,
      create: createSession,
    },
    signingSecureToken: {
      updateMany: updateManyTokens,
      create: createToken,
    },
    $transaction: transaction as unknown as PrismaClient["$transaction"],
    get sessions() {
      return Array.from(sessions.values()).map((s) => structuredClone(s));
    },
    get tokens() {
      return Array.from(tokens.values()).map((t) => structuredClone(t));
    },
    get dispatchInputs() {
      return Array.from(dispatchInputs.values()).map((d) => structuredClone(d));
    },
  };
}

const sampleSigningInput = {
  tenantId: "t1",
  documentId: "doc-1",
  moduleType: "informed_consent" as const,
  initiatedBy: "user-1",
  pdfBytes: Buffer.from("pdf"),
  signers: [
    { role: "PATIENT" as const, name: "Patient", mobile: "+966501234567", email: "p@example.com" },
  ],
  expiryHours: 1,
  locale: "ar" as const,
};

test("createSigningSessionIdempotent creates one active session", async () => {
  const client = createMemorySigningSessionClient();
  const result = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  assert.equal(client.sessions.length, 1);
  assert.equal(client.sessions[0].status, "PENDING");
  assert.equal(client.tokens.length, 1);
  assert.ok(result.tokens.PATIENT);
});

test("no raw token column is written", async () => {
  const client = createMemorySigningSessionClient();
  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  for (const token of client.tokens) {
    assert.equal((token as Record<string, unknown>).token, undefined);
  }
});

test("no signing URL is stored in signerLinks", async () => {
  const client = createMemorySigningSessionClient();
  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const links = client.sessions[0].signerLinks as Record<string, unknown>;
  assert.deepEqual(links, {});
});

test("no signing URL or token in audit metadata", async () => {
  const client = createMemorySigningSessionClient();
  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const metadata = client.sessions[0].metadata as Record<string, unknown>;
  const audit = JSON.stringify(metadata);
  assert.ok(!audit.includes("http"));
  assert.ok(!audit.includes("/sign/"));
  assert.ok(!audit.includes("v1:"));
});

test("matching retry reuses active session", async () => {
  const client = createMemorySigningSessionClient();
  const first = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const second = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  assert.equal(first.sessionId, second.sessionId);
  assert.equal(client.sessions.length, 1);
});

test("changed PDF hash cannot reuse the previous session", async () => {
  const client = createMemorySigningSessionClient();
  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-hash-a",
    approvedPdfHash: "hash-a",
    client: client as unknown as PrismaClient,
  });

  await assert.rejects(
    createSigningSessionIdempotent({
      input: sampleSigningInput,
      idempotencyKey: "key-1",
      idempotencyFingerprint: "fp-hash-b",
      approvedPdfHash: "hash-b",
      client: client as unknown as PrismaClient,
    }),
    /IDEMPOTENCY_CONFLICT/,
  );

  const sessionMeta = client.sessions[0].metadata as Record<string, unknown>;
  assert.equal(sessionMeta.approvedPdfHash, "hash-a");
});

test("explicit resend invalidates old session and token", async () => {
  const client = createMemorySigningSessionClient();
  const first = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const resendKey = `${first.sessionId}:resend`;
  const second = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: resendKey,
    idempotencyFingerprint: "fp-1",
    explicitResend: true,
    client: client as unknown as PrismaClient,
  });

  assert.notEqual(first.sessionId, second.sessionId);
  const oldSession = client.sessions.find((s) => s.id === first.sessionId);
  assert.equal(oldSession?.status, "REVOKED");
  const oldToken = client.tokens.find((t) => t.sessionId === first.sessionId);
  assert.ok(oldToken?.revokedAt);
  assert.equal(client.sessions.filter((s) => s.status !== "REVOKED").length, 1);
  assert.equal(second.revokedCount, 1);
});

test("explicit resend with same key is idempotent", async () => {
  const client = createMemorySigningSessionClient();
  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const resendKey = "resend-key-1";
  const first = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: resendKey,
    idempotencyFingerprint: "fp-1",
    explicitResend: true,
    client: client as unknown as PrismaClient,
  });

  const second = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: resendKey,
    idempotencyFingerprint: "fp-1",
    explicitResend: true,
    client: client as unknown as PrismaClient,
  });

  assert.equal(first.sessionId, second.sessionId);
});

test("tenant isolation", async () => {
  const client = createMemorySigningSessionClient();
  await createSigningSessionIdempotent({
    input: { ...sampleSigningInput, tenantId: "t1" },
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });
  await createSigningSessionIdempotent({
    input: { ...sampleSigningInput, tenantId: "t2" },
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });
  assert.equal(client.sessions.length, 2);
});

// ---------------------------------------------------------------------------
// Consent document idempotency tests
// ---------------------------------------------------------------------------

type ConsentCaseRecord = {
  id: string;
  tenantId: string;
  caseNumber: string;
  patientName: string;
  patientIdNumber: string | null;
  medicalRecordNo: string | null;
  metadata: unknown;
};

type ConsentTemplateRecord = {
  id: string;
  tenantId: string;
  templateCode: string;
  specialty: string | null;
  department: string | null;
  currentVersionId: string;
  requiresWitness: boolean;
  requiresInterpreter: boolean;
};

type ConsentTemplateVersionRecord = {
  id: string;
  tenantId: string;
  templateId: string;
  versionLabel: string;
  versionNumber: number;
  status: string;
  approvedByUserId: string;
  approvedAt: Date;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  legalTextAr: string;
  legalTextEn: string;
  pdplTextAr: string;
  pdplTextEn: string;
  witnessDeclAr: string;
  witnessDeclEn: string;
  physicianCertAr: string;
  physicianCertEn: string;
  aiWarningAr: string;
  aiWarningEn: string;
};

type ConsentDocumentRecord = {
  id: string;
  tenantId: string;
  caseId: string;
  templateId: string;
  templateVersionId: string;
  consentReference: string;
  status: string;
  language: string;
  idempotencyKey: string | null;
  idempotencyFingerprint: string | null;
  patientName: string;
  mrn: string | null;
  dob: string | null;
  gender: string | null;
  physicianName: string;
  physicianLicense: string | null;
  physicianSpecialty: string | null;
  department: string | null;
  diagnosis: string | null;
  plannedProcedure: string | null;
  admissionDetails: string | null;
  procedureDetails: string | null;
  physicianNotesAr: string | null;
  physicianNotesEn: string | null;
  legalTextAr: string;
  legalTextEn: string;
  pdplTextAr: string;
  pdplTextEn: string;
  witnessDeclAr: string;
  witnessDeclEn: string;
  physicianCertAr: string;
  physicianCertEn: string;
  aiWarningAr: string;
  aiWarningEn: string;
  documentVersion: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function createMemoryConsentDocumentClient(
  options: { simulateUniqueViolationOnDuplicate?: boolean } = {},
) {
  let caseRecord: ConsentCaseRecord = {
    id: "case-1",
    tenantId: "t1",
    caseNumber: "C-001",
    patientName: "Test Patient",
    patientIdNumber: null,
    medicalRecordNo: "MRN-001",
    metadata: {},
  };

  const template: ConsentTemplateRecord = {
    id: "template-1",
    tenantId: "t1",
    templateCode: "test",
    specialty: "Surgery",
    department: "OR",
    currentVersionId: "version-1",
    requiresWitness: false,
    requiresInterpreter: false,
  };

  const version: ConsentTemplateVersionRecord = {
    id: "version-1",
    tenantId: "t1",
    templateId: "template-1",
    versionLabel: "v1.0",
    versionNumber: 1,
    status: "APPROVED",
    approvedByUserId: "user-1",
    approvedAt: new Date("2026-01-01T00:00:00Z"),
    effectiveFrom: new Date("2026-01-01T00:00:00Z"),
    effectiveTo: null,
    legalTextAr: "نص قانوني",
    legalTextEn: "Legal text",
    pdplTextAr: "نص خصوصية",
    pdplTextEn: "Privacy text",
    witnessDeclAr: "إقرار شاهد",
    witnessDeclEn: "Witness declaration",
    physicianCertAr: "شهادة طبيب",
    physicianCertEn: "Physician certification",
    aiWarningAr: "تحذير",
    aiWarningEn: "AI warning",
  };

  const documents = new Map<string, ConsentDocumentRecord>();
  const idempotencyIndex = new Map<string, string>();
  let documentIdCounter = 1;

  function findDocumentById(id: string) {
    const doc = documents.get(id);
    if (!doc) return null;
    return {
      ...structuredClone(doc),
      case: structuredClone(caseRecord),
      template: structuredClone(template),
      templateVersion: structuredClone(version),
      sections: [],
      signatures: [],
      auditEvents: [],
    };
  }

  function findFirst(args: {
    where: { id?: string; tenantId: string; idempotencyKey?: string };
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }) {
    if (args.where.id) {
      return Promise.resolve(findDocumentById(args.where.id));
    }
    if (args.where.idempotencyKey) {
      const docId = idempotencyIndex.get(`${args.where.tenantId}:${args.where.idempotencyKey}`);
      const doc = docId ? documents.get(docId) ?? null : null;
      if (!doc) return Promise.resolve(null);
      if (args.select) {
        const selected: Record<string, unknown> = { id: doc.id };
        for (const key of Object.keys(args.select)) {
          if (key !== "id") {
            selected[key] = (doc as Record<string, unknown>)[key];
          }
        }
        return Promise.resolve(selected);
      }
      return Promise.resolve(findDocumentById(doc.id));
    }
    return Promise.resolve(null);
  }

  function createDocument(args: { data: Partial<ConsentDocumentRecord> }) {
    const key = args.data.idempotencyKey
      ? `${args.data.tenantId}:${args.data.idempotencyKey}`
      : null;
    if (key && idempotencyIndex.has(key)) {
      if (options.simulateUniqueViolationOnDuplicate) {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed on the fields: (`tenantId`,`idempotencyKey`)",
          { code: "P2002", clientVersion: "0.0.0", meta: { target: ["tenantId", "idempotencyKey"] } },
        );
      }
      const existingId = idempotencyIndex.get(key)!;
      const existing = documents.get(existingId)!;
      if (existing.idempotencyFingerprint !== args.data.idempotencyFingerprint) {
        throw new Error("IDEMPOTENCY_CONFLICT");
      }
      return Promise.resolve(structuredClone(existing));
    }

    const id = `doc-${documentIdCounter++}`;
    const record = {
      ...args.data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ConsentDocumentRecord;
    documents.set(id, record);
    if (key) {
      idempotencyIndex.set(key, id);
    }
    return Promise.resolve(structuredClone(record));
  }

  const modelApi = {
    case: {
      findFirst: () => Promise.resolve(structuredClone(caseRecord)),
    },
    consentTemplate: {
      findFirst: () => Promise.resolve(structuredClone(template)),
    },
    consentTemplateVersion: {
      findFirst: () => Promise.resolve(structuredClone(version)),
    },
    consentTemplateSection: {
      findMany: () => Promise.resolve([]),
    },
    consentDocument: {
      findFirst,
      create: createDocument,
    },
    consentDocumentSection: {
      createMany: () => Promise.resolve({ count: 0 }),
    },
    consentAuditEvent: {
      create: () => Promise.resolve({}),
    },
    consentTimelineEvent: {
      create: () => Promise.resolve({}),
    },
  };

  async function transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
    return callback(modelApi);
  }

  return {
    ...modelApi,
    $transaction: transaction as unknown as PrismaClient["$transaction"],
    get documents() {
      return Array.from(documents.values()).map((d) => structuredClone(d));
    },
  };
}

const sampleAuth: AuthContext = {
  sub: "user-1",
  email: "doctor@example.com",
  role: "doctor",
  tenant_id: "t1",
};

const sampleDocumentPayload = {
  caseId: "case-1",
  templateId: "template-1",
  language: "bilingual" as const,
  physicianName: "Dr. Test",
  diagnosis: "A",
};

test("buildConsentDocumentFingerprint is deterministic and case-insensitive to field order", () => {
  const fp1 = buildConsentDocumentFingerprint(
    { caseId: "case-1", templateId: "template-1", language: "en", diagnosis: "A" },
    "version-1",
  );
  const fp2 = buildConsentDocumentFingerprint(
    { templateId: "template-1", caseId: "case-1", diagnosis: "A", language: "en" },
    "version-1",
  );
  assert.equal(fp1, fp2);
});

test("createConsentDocument returns the same document for identical idempotency key", async () => {
  const client = createMemoryConsentDocumentClient();
  const idempotencyKey = "doc-key-1";

  const first = await createConsentDocument(
    sampleAuth,
    { ...sampleDocumentPayload, idempotencyKey },
    undefined,
    client as unknown as PrismaClient,
  );
  const second = await createConsentDocument(
    sampleAuth,
    { ...sampleDocumentPayload, idempotencyKey },
    undefined,
    client as unknown as PrismaClient,
  );

  assert.equal(first.id, second.id);
  assert.equal(client.documents.length, 1);
  assert.equal(client.documents[0].idempotencyKey, idempotencyKey);
  assert.ok(client.documents[0].idempotencyFingerprint);
});

test("createConsentDocument rejects mismatched client-supplied fingerprint", async () => {
  const client = createMemoryConsentDocumentClient();
  const idempotencyKey = "doc-key-1";

  await assert.rejects(
    createConsentDocument(
      sampleAuth,
      { ...sampleDocumentPayload, idempotencyKey, idempotencyFingerprint: "wrong" },
      undefined,
      client as unknown as PrismaClient,
    ),
    IdempotencyConflictError,
  );
});

test("createConsentDocument rejects idempotency key reused with different payload", async () => {
  const client = createMemoryConsentDocumentClient();
  const idempotencyKey = "doc-key-1";

  await createConsentDocument(
    sampleAuth,
    { ...sampleDocumentPayload, idempotencyKey, diagnosis: "A" },
    undefined,
    client as unknown as PrismaClient,
  );

  await assert.rejects(
    createConsentDocument(
      sampleAuth,
      { ...sampleDocumentPayload, idempotencyKey, diagnosis: "B" },
      undefined,
      client as unknown as PrismaClient,
    ),
    IdempotencyConflictError,
  );
});

test("createConsentDocument P2002 fallback returns existing document when fingerprint matches", async () => {
  const client = createMemoryConsentDocumentClient({ simulateUniqueViolationOnDuplicate: true });
  const idempotencyKey = "doc-key-1";

  const first = await createConsentDocument(
    sampleAuth,
    { ...sampleDocumentPayload, idempotencyKey },
    undefined,
    client as unknown as PrismaClient,
  );
  const second = await createConsentDocument(
    sampleAuth,
    { ...sampleDocumentPayload, idempotencyKey },
    undefined,
    client as unknown as PrismaClient,
  );

  assert.equal(first.id, second.id);
  assert.equal(client.documents.length, 1);
});

// ---------------------------------------------------------------------------
// Static safety
// ---------------------------------------------------------------------------

test("module-secure-signing-service does not import direct Taqnyat send", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const servicePath = path.resolve("src/lib/server/module-secure-signing-service.ts");
  const content = fs.readFileSync(servicePath, "utf8");
  assert.ok(!content.includes("sendTaqnyatMessage"), "must not call sendTaqnyatMessage");
  assert.ok(!content.includes("sendViaDirectTaqnyat"), "must not call sendViaDirectTaqnyat");
  assert.ok(
    !content.includes("sendSecureSigningLinkEmail"),
    "must not call sendSecureSigningLinkEmail",
  );
});

test("migration uses UUID primary keys, TEXT status with CHECK, and no DROP INDEX", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const migrationPath = path.resolve(
    "prisma/migrations/0030_package1_idempotency_outbox.sql",
  );
  const content = fs.readFileSync(migrationPath, "utf8");

  assert.ok(content.includes("id UUID PRIMARY KEY"), "signing tables must use UUID primary keys");
  assert.ok(
    content.includes("status TEXT NOT NULL DEFAULT 'PENDING'"),
    "signing_sessions.status must be TEXT",
  );
  assert.ok(
    content.includes("CHECK (status IN ('PENDING','SENT','PARTIALLY_SIGNED','COMPLETED','EXPIRED','REVOKED'))"),
    "signing_sessions.status must have CHECK constraint",
  );
  assert.ok(
    content.includes("ALTER TABLE signing_secure_tokens"),
    "must additively update token table",
  );
  assert.ok(
    content.includes("uq_signing_sessions_active_per_tenant_document_v1"),
    "must have versioned active-session partial unique index",
  );
  assert.ok(
    !content.toUpperCase().includes("DROP INDEX"),
    "migration must not drop indexes",
  );
  assert.ok(
    content.includes("tenant_id TEXT NOT NULL"),
    "signing table tenant_id must match tenants.id TEXT type",
  );
  assert.ok(
    content.includes("document_id TEXT NOT NULL"),
    "signing_sessions.document_id must match consent_documents.id TEXT type",
  );
  assert.ok(
    !content.includes("CREATE TABLE IF NOT EXISTS") || content.includes("ADD COLUMN IF NOT EXISTS"),
    "migration must be additive",
  );
});

test("Prisma signing models do not include raw token or recipientEncrypted fields", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const schemaPath = path.resolve("prisma/schema.prisma");
  const content = fs.readFileSync(schemaPath, "utf8");

  const signingSecureTokenMatch = content.match(/model SigningSecureToken \{[\s\S]*?\n\}/);
  assert.ok(signingSecureTokenMatch, "SigningSecureToken model not found");
  assert.ok(
    !/\btoken\s+String\?\s*@map\("token"\)/.test(signingSecureTokenMatch[0]),
    "SigningSecureToken must not model raw token column",
  );

  const dispatchMatch = content.match(/model PatientMessageDispatch \{[\s\S]*?\n\}/);
  assert.ok(dispatchMatch, "PatientMessageDispatch model not found");
  assert.ok(
    !dispatchMatch[0].includes("recipientEncrypted"),
    "PatientMessageDispatch must not model recipientEncrypted",
  );

  const sessionMatch = content.match(/model SigningSession \{[\s\S]*?\n\}/);
  assert.ok(sessionMatch, "SigningSession model not found");
  assert.ok(
    /\bstatus\s+String\b/.test(sessionMatch[0]),
    "SigningSession.status must be String",
  );
});


// ---------------------------------------------------------------------------
// Migration reconciliation
// ---------------------------------------------------------------------------

test("migration reconciles legacy signing_sessions columns additively", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const content = fs.readFileSync(
    path.resolve("prisma/migrations/0030_package1_idempotency_outbox.sql"),
    "utf8",
  );

  const expectedColumns = [
    "idempotency_key TEXT",
    "idempotency_fingerprint TEXT",
    "metadata JSONB",
    "revoked_at TIMESTAMPTZ",
    "revoked_reason TEXT",
    "resend_count INTEGER NOT NULL DEFAULT 0",
    "last_resent_at TIMESTAMPTZ",
  ];

  assert.ok(
    content.includes("ALTER TABLE signing_sessions"),
    "must include ALTER TABLE signing_sessions",
  );
  for (const column of expectedColumns) {
    assert.ok(
      content.includes(`ADD COLUMN IF NOT EXISTS ${column}`),
      `must add ${column}`,
    );
  }
});

test("migration creates real unique signing idempotency index", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const content = fs.readFileSync(
    path.resolve("prisma/migrations/0030_package1_idempotency_outbox.sql"),
    "utf8",
  ).replace(/\r\n/g, "\n");

  assert.ok(
    content.includes("CREATE UNIQUE INDEX IF NOT EXISTS uq_signing_sessions_tenant_idempotency_key_v1"),
    "must create versioned unique idempotency index",
  );
  assert.ok(
    content.includes("uq_signing_sessions_tenant_idempotency_key_v1\n  ON signing_sessions (tenant_id, idempotency_key)\n  WHERE idempotency_key IS NOT NULL"),
    "unique idempotency index must be partial on non-null keys",
  );
});

test("migration active-session index is restricted to active statuses", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const content = fs.readFileSync(
    path.resolve("prisma/migrations/0030_package1_idempotency_outbox.sql"),
    "utf8",
  );

  const indexMatch = content.match(
    /CREATE UNIQUE INDEX IF NOT EXISTS uq_signing_sessions_active_per_tenant_document_v1[\s\S]*?WHERE status IN \([^)]+\)/,
  );
  assert.ok(indexMatch, "must have active-session partial unique index");
  assert.ok(
    indexMatch[0].includes("'PENDING'") && indexMatch[0].includes("'SENT'") && indexMatch[0].includes("'PARTIALLY_SIGNED'"),
    "active-session index must include only PENDING, SENT, PARTIALLY_SIGNED",
  );
  assert.ok(
    !indexMatch[0].includes("'COMPLETED'") && !indexMatch[0].includes("'EXPIRED'") && !indexMatch[0].includes("'REVOKED'"),
    "active-session index must not include terminal statuses",
  );
});

test("migration adds guarded foreign keys for signing tables", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const content = fs.readFileSync(
    path.resolve("prisma/migrations/0030_package1_idempotency_outbox.sql"),
    "utf8",
  );

  const expectedFks = [
    { name: "fk_signing_sessions_tenant_id", table: "signing_sessions", column: "tenant_id", ref: "tenants(id)" },
    { name: "fk_signing_sessions_document_id", table: "signing_sessions", column: "document_id", ref: "consent_documents(id)" },
    { name: "fk_signing_secure_tokens_session_id", table: "signing_secure_tokens", column: "session_id", ref: "signing_sessions(id)" },
    { name: "fk_signing_secure_tokens_tenant_id", table: "signing_secure_tokens", column: "tenant_id", ref: "tenants(id)" },
    { name: "fk_patient_message_dispatches_tenant_id", table: "patient_message_dispatches", column: "tenant_id", ref: "tenants(id)" },
    { name: "fk_patient_message_dispatches_signing_session_id", table: "patient_message_dispatches", column: "signing_session_id", ref: "signing_sessions(id)" },
  ];

  for (const fk of expectedFks) {
    assert.ok(
      content.includes(`ADD CONSTRAINT ${fk.name}`),
      `must add ${fk.name}`,
    );
    assert.ok(
      content.includes(`FOREIGN KEY (${fk.column}) REFERENCES ${fk.ref}`),
      `${fk.name} must reference ${fk.ref}`,
    );
    assert.ok(
      new RegExp(`ADD CONSTRAINT ${fk.name}[\\s\\S]{0,300}NOT VALID`).test(content),
      `${fk.name} must be NOT VALID`,
    );
  }

  assert.ok(
    /ADD CONSTRAINT fk_signing_secure_tokens_session_id[\s\S]{0,300}ON DELETE CASCADE/.test(content),
    "fk_signing_secure_tokens_session_id must cascade on delete",
  );
});

test("no $queryRawUnsafe in runtime Package 1 files", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const runtimeFiles = [
    "src/lib/server/idempotency-core.ts",
    "src/lib/server/signing-token-service.ts",
    "src/lib/server/signing-url-config.ts",
    "src/lib/server/signing-session-service.ts",
    "src/lib/server/patient-message-outbox-service.ts",
    "src/lib/server/recipient-resolution-service.ts",
    "src/lib/server/module-secure-signing-service.ts",
    "src/lib/server/signing-callback-service.ts",
    "src/app/api/modules/informed-consents/signing/callback/route.ts",
  ];

  for (const file of runtimeFiles) {
    const content = fs.readFileSync(path.resolve(file), "utf8");
    assert.ok(
      !content.includes("$queryRawUnsafe") && !content.includes("$executeRawUnsafe"),
      `${file} must not use raw unsafe Prisma queries`,
    );
  }
});

test("token validation and consumption do not execute runtime DDL", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const content = fs.readFileSync(
    path.resolve("src/lib/server/signature-orchestration-service.ts"),
    "utf8",
  );

  const validateMatch = content.match(/export async function validateSigningToken\([\s\S]*?^\}/m);
  const markUsedMatch = content.match(/export async function markTokenUsed\([\s\S]*?^\}/m);

  assert.ok(validateMatch, "validateSigningToken function not found");
  assert.ok(markUsedMatch, "markTokenUsed function not found");

  assert.ok(
    !validateMatch[0].includes("ensureSigningSchema"),
    "validateSigningToken must not call ensureSigningSchema",
  );
  assert.ok(
    !markUsedMatch[0].includes("ensureSigningSchema"),
    "markTokenUsed must not call ensureSigningSchema",
  );
  assert.ok(
    !markUsedMatch[0].includes("$executeRawUnsafe") && !markUsedMatch[0].includes("$queryRawUnsafe"),
    "markTokenUsed must not use raw unsafe queries",
  );
  assert.ok(
    markUsedMatch[0].includes("usedAt: null") && markUsedMatch[0].includes("revokedAt: null"),
    "markTokenUsed must guard on usedAt and revokedAt",
  );
  assert.ok(
    markUsedMatch[0].includes("expiresAt: { gt: now }") || markUsedMatch[0].includes("gt: now"),
    "markTokenUsed must guard on expiry",
  );
  assert.ok(
    markUsedMatch[0].includes("result.count !== 1"),
    "markTokenUsed must require exactly one updated row",
  );
});

// ---------------------------------------------------------------------------
// Session state machine
// ---------------------------------------------------------------------------

test("accepted dispatch transitions session from PENDING to SENT atomically", async () => {
  const client = createMemorySigningSessionClient();
  const session = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  assert.equal(client.sessions[0].status, "PENDING");

  const transitioned = await markSessionSentIfPending(
    sampleSigningInput.tenantId,
    session.sessionId,
    client as unknown as PrismaClient,
  );

  assert.equal(transitioned, true);
  assert.equal(client.sessions[0].status, "SENT");

  const secondTransition = await markSessionSentIfPending(
    sampleSigningInput.tenantId,
    session.sessionId,
    client as unknown as PrismaClient,
  );
  assert.equal(secondTransition, false);
  assert.equal(client.sessions[0].status, "SENT");
});

// ---------------------------------------------------------------------------
// Deterministic idempotency keys
// ---------------------------------------------------------------------------

test("dispatch idempotency keys are deterministic child keys per signer", async () => {
  const client = createMemorySigningSessionClient();
  const idempotencyKey = "root-session-key";

  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey,
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  assert.equal(client.dispatchInputs.length, 2);

  const smsKey = deriveChildIdempotencyKey(
    deriveChildIdempotencyKey(idempotencyKey, "PATIENT_MESSAGE_SMS"),
    "PATIENT",
  );
  const emailKey = deriveChildIdempotencyKey(
    deriveChildIdempotencyKey(idempotencyKey, "PATIENT_MESSAGE_EMAIL"),
    "PATIENT",
  );

  const smsDispatch = client.dispatchInputs.find((d) => d.channel === PatientMessageChannel.SMS);
  const emailDispatch = client.dispatchInputs.find((d) => d.channel === PatientMessageChannel.EMAIL);

  assert.ok(smsDispatch);
  assert.ok(emailDispatch);
  assert.equal(smsDispatch.idempotencyKey, smsKey);
  assert.equal(emailDispatch.idempotencyKey, emailKey);
});

// ---------------------------------------------------------------------------
// Serializable retry
// ---------------------------------------------------------------------------

test("P2034 serialization failure is retried up to 3 attempts", async () => {
  const client = createMemorySigningSessionClient([], [], { serializationFailures: 2 });
  const result = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  assert.ok(result.sessionId);
  assert.equal(client.sessions.length, 1);
});

test("P2034 exhaustion throws the underlying serialization error", async () => {
  const client = createMemorySigningSessionClient([], [], { serializationFailures: 5 });
  await assert.rejects(
    createSigningSessionIdempotent({
      input: sampleSigningInput,
      idempotencyKey: "key-1",
      idempotencyFingerprint: "fp-1",
      client: client as unknown as PrismaClient,
    }),
    /Could not serialize|P2034/,
  );
});

test("identical concurrent resend key returns the winning replacement", async () => {
  const client = createMemorySigningSessionClient([], [], { enforceActiveSessionUniqueness: true });
  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const resendKey = "resend-key-1";
  const first = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: resendKey,
    idempotencyFingerprint: "fp-1",
    explicitResend: true,
    client: client as unknown as PrismaClient,
  });

  const second = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: resendKey,
    idempotencyFingerprint: "fp-1",
    explicitResend: true,
    client: client as unknown as PrismaClient,
  });

  assert.equal(first.sessionId, second.sessionId);
});

test("different concurrent creation key returns controlled 409", async () => {
  const client = createMemorySigningSessionClient([], [], { enforceActiveSessionUniqueness: true });
  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  await assert.rejects(
    createSigningSessionIdempotent({
      input: sampleSigningInput,
      idempotencyKey: "key-2",
      idempotencyFingerprint: "fp-1",
      client: client as unknown as PrismaClient,
    }),
    /ACTIVE_SIGNING_SESSION_CONFLICT/,
  );
});

// ---------------------------------------------------------------------------
// Authenticated delivery callback
// ---------------------------------------------------------------------------

function signCallbackBody(body: Record<string, unknown>, secret: string, timestamp?: string): {
  signature: string;
  timestamp: string;
} {
  const ts = timestamp ?? Math.floor(Date.now() / 1000).toString();
  const payload = JSON.stringify(body);
  const signature = buildCallbackSignature({ secret, body: payload, timestamp: ts });
  return { signature, timestamp: ts };
}

test("callback signature verification accepts a valid signature", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ tenantId: "t1", channel: "SMS", providerMessageId: "msg-1", status: "DELIVERED" });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = buildCallbackSignature({ secret, body, timestamp });

  const result = verifyCallbackSignature({
    secret,
    body,
    signatureHeader: signature,
    timestampHeader: timestamp,
  });

  assert.equal(result.valid, true);
});

test("callback signature verification rejects an invalid signature", () => {
  const result = verifyCallbackSignature({
    secret: "test-secret",
    body: JSON.stringify({}),
    signatureHeader: "invalid",
    timestampHeader: Math.floor(Date.now() / 1000).toString(),
  });
  assert.equal(result.valid, false);
  assert.ok((result as { reason: string }).reason.includes("Invalid callback signature"));
});

test("callback signature verification rejects expired replay", () => {
  const secret = "test-secret";
  const body = JSON.stringify({});
  const timestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
  const signature = buildCallbackSignature({ secret, body, timestamp });

  const result = verifyCallbackSignature({
    secret,
    body,
    signatureHeader: signature,
    timestampHeader: timestamp,
  });

  assert.equal(result.valid, false);
  assert.ok((result as { reason: string }).reason.includes("replay window"));
});

test("callback atomic update preserves original deliveredAt on duplicate", async () => {
  const client = createMemoryOutboxClient();
  const dispatch = await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );
  await recordDispatchAccepted(dispatch.id, "msg-1", client as unknown as PrismaClient);

  const firstDeliveredAt = new Date("2026-01-01T00:00:00Z");
  const first = await recordDeliveryCallback({
    tenantId: "t1",
    channel: PatientMessageChannel.SMS,
    providerMessageId: "msg-1",
    status: "DELIVERED",
    deliveredAt: firstDeliveredAt,
    client: client as unknown as PrismaClient,
  });
  assert.equal(first.updated, true);
  assert.equal(client.records[0].status, PatientMessageStatus.DELIVERED);
  assert.equal(client.records[0].deliveredAt?.getTime(), firstDeliveredAt.getTime());

  const secondDeliveredAt = new Date("2026-02-01T00:00:00Z");
  const second = await recordDeliveryCallback({
    tenantId: "t1",
    channel: PatientMessageChannel.SMS,
    providerMessageId: "msg-1",
    status: "DELIVERED",
    deliveredAt: secondDeliveredAt,
    client: client as unknown as PrismaClient,
  });
  assert.equal(second.updated, false);
  assert.equal(client.records[0].deliveredAt?.getTime(), firstDeliveredAt.getTime());
});

// ---------------------------------------------------------------------------
// Recipient resolver safety
// ---------------------------------------------------------------------------

test("test recipient registry is unavailable outside test environment", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  setNodeEnv("production");
  try {
    assert.throws(
      () => registerTestRecipient("t1", "ref", { mobile: "+966501234567" }),
      /only available when NODE_ENV === "test"/,
    );
  } finally {
    setNodeEnv(originalNodeEnv ?? "test");
  }
});

test("RECIPIENT_RESOLVER_DISABLE_DB is ignored in production", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDisable = process.env.RECIPIENT_RESOLVER_DISABLE_DB;
  setNodeEnv("production");
  process.env.RECIPIENT_RESOLVER_DISABLE_DB = "true";
  try {
    // Pre-register in memory; in production it must not be consulted.
    setNodeEnv("test");
    registerTestRecipient("t1", "consent_document:doc-1:mobile", { mobile: "+966501234567" });
    setNodeEnv("production");

    // Database is not available, so the resolver must propagate a retryable error
    // rather than silently returning the in-memory test registry.
    await assert.rejects(
      resolveRecipient({
        tenantId: "t1",
        reference: "consent_document:doc-1:mobile",
      }),
      /RESOLVER_UNAVAILABLE|Recipient resolver database unavailable/,
    );
  } finally {
    setNodeEnv("test");
    clearTestRecipients();
    setNodeEnv(originalNodeEnv ?? "test");
    process.env.RECIPIENT_RESOLVER_DISABLE_DB = originalDisable ?? "true";
  }
});

// ---------------------------------------------------------------------------
// Signing URL configuration
// ---------------------------------------------------------------------------

test("buildSigningUrl fails closed without trusted base URL", () => {
  const originalBase = process.env.SIGNING_BASE_URL;
  const originalNextauth = process.env.NEXTAUTH_URL;
  delete process.env.SIGNING_BASE_URL;
  delete process.env.NEXTAUTH_URL;
  try {
    assert.throws(() => buildSigningUrl("token"), /not configured/);
  } finally {
    if (originalBase) process.env.SIGNING_BASE_URL = originalBase;
    if (originalNextauth) process.env.NEXTAUTH_URL = originalNextauth;
  }
});

test("Preview URL cannot silently become Production", () => {
  const originalVercel = process.env.VERCEL_ENV;
  const originalBase = process.env.SIGNING_BASE_URL;
  process.env.VERCEL_ENV = "preview";
  process.env.SIGNING_BASE_URL = "https://wathiqcare.online/sign";
  try {
    assert.throws(
      () => buildSigningUrl("token"),
      /Preview environment cannot silently generate a production signing URL/,
    );
  } finally {
    process.env.VERCEL_ENV = originalVercel;
    if (originalBase) process.env.SIGNING_BASE_URL = originalBase;
  }
});

test("buildSigningUrl rejects unapproved hosts", () => {
  assert.throws(
    () => buildSigningUrl("token", "https://evil.example.com/sign"),
    /host is not approved/,
  );
});

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

test("verifySigningToken rejects malformed claims", () => {
  const secret = process.env.SIGNING_TOKEN_SECRET!;
  const invalidPayload = Buffer.from(JSON.stringify({})).toString("base64url");
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`v1:${invalidPayload}`)
    .digest("base64url");
  const token = `v1:${invalidPayload}:${hmac}`;

  assert.throws(() => verifySigningToken(token), /INVALID_TOKEN_VERSION/);
});

test("verifySigningToken rejects invalid expiry date", () => {
  const secret = process.env.SIGNING_TOKEN_SECRET!;
  const invalidPayload = Buffer.from(
    JSON.stringify({
      tenantId: "t1",
      sessionId: "s1",
      signerRole: "PATIENT",
      expiresAt: "not-a-date",
      tokenVersion: "v1",
    }),
  ).toString("base64url");
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`v1:${invalidPayload}`)
    .digest("base64url");
  const token = `v1:${invalidPayload}:${hmac}`;

  assert.throws(() => verifySigningToken(token), /INVALID_TOKEN_EXPIRY/);
});

// ---------------------------------------------------------------------------
// Atomic token consumption
// ---------------------------------------------------------------------------

test("markTokenUsed atomically consumes exactly one active token", async () => {
  const client = createMemorySigningSessionClient();
  const result = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const rawToken = result.tokens.PATIENT;
  assert.ok(rawToken);
  await markTokenUsed(rawToken, "127.0.0.1", client as unknown as PrismaClient);

  assert.ok(client.tokens[0].usedAt);
  assert.equal(client.tokens[0].ipOnUse, "127.0.0.1");
});

test("markTokenUsed rejects already used token", async () => {
  const client = createMemorySigningSessionClient();
  const result = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const rawToken = result.tokens.PATIENT;
  assert.ok(rawToken);
  await markTokenUsed(rawToken, undefined, client as unknown as PrismaClient);

  await assert.rejects(
    markTokenUsed(rawToken, undefined, client as unknown as PrismaClient),
    /Token already used/,
  );
});

test("markTokenUsed rejects expired token", async () => {
  const client = createMemorySigningSessionClient();
  const result = await createSigningSessionIdempotent({
    input: { ...sampleSigningInput, expiryHours: -1 },
    idempotencyKey: "key-1",
    idempotencyFingerprint: "fp-1",
    client: client as unknown as PrismaClient,
  });

  const rawToken = result.tokens.PATIENT;
  assert.ok(rawToken);
  await assert.rejects(
    markTokenUsed(rawToken, undefined, client as unknown as PrismaClient),
    /Token already used/,
  );
});

test("package1-final-review.tmp is absent", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  assert.ok(
    !fs.existsSync(path.resolve("package1-final-review.tmp")),
    "package1-final-review.tmp must be deleted",
  );
});

// ---------------------------------------------------------------------------
// Final Package 1 blocker regression tests
// ---------------------------------------------------------------------------

test("TEXT tenant/document identity columns are not cast to UUID", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const files = [
    "src/lib/server/patient-message-outbox-service.ts",
    "src/lib/server/module-secure-signing-service.ts",
    "src/lib/server/signing-session-service.ts",
    "src/lib/server/recipient-resolution-service.ts",
  ];

  for (const file of files) {
    const content = fs.readFileSync(path.resolve(file), "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const compact = line.replace(/\s+/g, " ");
      const castsTextColumnToUuid =
        /tenant_id\s*=.*::uuid/i.test(compact) ||
        /document_id\s*=.*::uuid/i.test(compact);
      assert.ok(
        !castsTextColumnToUuid,
        `${file} casts a TEXT identity column to UUID: ${line.trim()}`,
      );
    }
  }
});

test("accepted dispatch survives session reconciliation failure", async () => {
  const client = createMemoryOutboxClient();
  const dispatch = await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );

  const failingClient = {
    ...client,
    signingSession: {
      updateMany: async () => {
        throw new Error("simulated session update failure");
      },
    },
  };

  await recordDispatchAccepted(
    dispatch.id,
    "msg-accepted",
    failingClient as unknown as PrismaClient,
  );

  assert.equal(client.records[0].status, PatientMessageStatus.ACCEPTED);
  assert.equal(client.records[0].providerMessageId, "msg-accepted");

  const reclaimed = await claimDispatchForProcessing(
    "t1",
    new Date(),
    undefined,
    failingClient as unknown as Parameters<typeof claimDispatchForProcessing>[3],
  );
  assert.equal(reclaimed, null);
});

test("accepted dispatch cannot be reclaimed after provider acceptance", async () => {
  const client = createMemoryOutboxClient();
  const dispatch = await createPatientMessageDispatch(
    sampleDispatchInput(),
    client as unknown as Prisma.TransactionClient,
  );

  await recordDispatchAccepted(
    dispatch.id,
    "msg-accepted",
    client as unknown as PrismaClient,
  );

  const gateway = createFakeSmsGateway();
  const result = await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now: new Date(),
    client: client as unknown as PrismaClient,
  });

  assert.equal(result.processed, 0);
  assert.equal(client.records[0].status, PatientMessageStatus.ACCEPTED);
  assert.equal(gateway.calls.length, 0);
});

test("canonical contact source resolves the same address used for hashing", async () => {
  const mobile = "+966501234567";
  const email = "patient@example.com";
  registerTestRecipient("t1", "case:case-1:mobile", { mobile });
  registerTestRecipient("t1", "case:case-1:email", { email });

  const resolvedMobile = await resolveRecipient({
    tenantId: "t1",
    reference: "case:case-1:mobile",
  });
  const resolvedEmail = await resolveRecipient({
    tenantId: "t1",
    reference: "case:case-1:email",
  });

  assert.equal(
    hashRecipient(resolvedMobile?.mobile || "", { tenantId: "t1" }),
    hashRecipient(mobile, { tenantId: "t1" }),
  );
  assert.equal(
    hashRecipient(resolvedEmail?.email || "", { tenantId: "t1" }),
    hashRecipient(email, { tenantId: "t1" }),
  );

  clearTestRecipients();
});

test("signing session dispatch uses case reference when caseId is provided", async () => {
  const client = createMemorySigningSessionClient();
  const result = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-case-ref",
    idempotencyFingerprint: "fp-1",
    caseId: "case-1",
    client: client as unknown as PrismaClient,
  });

  assert.ok(result.dispatches?.length);
  const smsInput = client.dispatchInputs.find((d) => d.channel === "SMS");
  assert.ok(smsInput);
  assert.ok(
    smsInput!.recipientReference.startsWith("case:case-1:"),
    `expected case reference, got ${smsInput!.recipientReference}`,
  );
});

test("explicit resend requires a resend request key", async () => {
  await assert.rejects(
    sendModuleSecureSigningLink({
      tenantId: "t1",
      initiatedBy: "user-1",
      moduleKey: "informed_consent",
      moduleType: "informed_consent",
      documentId: "doc-1",
      caseId: "case-1",
      patientName: "Patient",
      mobileNumber: "+966501234567",
      recipientEmail: "patient@example.com",
      explicitResend: true,
    }),
    /resend request key/i,
  );
});

test("explicit resend with different request keys creates distinct replacement sessions", async () => {
  const client = createMemorySigningSessionClient();
  const base = {
    input: sampleSigningInput,
    idempotencyFingerprint: "fp-1",
    explicitResend: true,
    client: client as unknown as PrismaClient,
  };

  const first = await createSigningSessionIdempotent({
    ...base,
    idempotencyKey: "resend-a",
  });

  const second = await createSigningSessionIdempotent({
    ...base,
    idempotencyKey: "resend-b",
  });

  assert.notEqual(first.sessionId, second.sessionId);

  const firstSession = client.sessions.find((s) => s.id === first.sessionId);
  assert.equal(firstSession?.status, "REVOKED");
});

test("explicit resend with the same request key reuses the replacement session", async () => {
  const client = createMemorySigningSessionClient();
  const base = {
    input: sampleSigningInput,
    idempotencyFingerprint: "fp-1",
    explicitResend: true,
    client: client as unknown as PrismaClient,
  };

  const first = await createSigningSessionIdempotent({
    ...base,
    idempotencyKey: "resend-same",
  });
  const second = await createSigningSessionIdempotent({
    ...base,
    idempotencyKey: "resend-same",
  });

  assert.equal(first.sessionId, second.sessionId);
});

test("Preview OTP inspection requires both preview env and pilot flag", () => {
  const originalVercel = process.env.VERCEL_ENV;
  const originalPilot = process.env.ENABLE_IMC_PILOT_PATIENTS;

  try {
    process.env.VERCEL_ENV = "preview";
    delete process.env.ENABLE_IMC_PILOT_PATIENTS;
    assert.equal(isPreviewOtpInspectionEnabled(), false);

    process.env.ENABLE_IMC_PILOT_PATIENTS = "true";
    assert.equal(isPreviewOtpInspectionEnabled(), true);

    process.env.ENABLE_IMC_PILOT_PATIENTS = "1";
    assert.equal(isPreviewOtpInspectionEnabled(), true);

    process.env.ENABLE_IMC_PILOT_PATIENTS = "yes";
    assert.equal(isPreviewOtpInspectionEnabled(), true);

    process.env.VERCEL_ENV = "production";
    process.env.ENABLE_IMC_PILOT_PATIENTS = "true";
    assert.equal(isPreviewOtpInspectionEnabled(), false);
  } finally {
    process.env.VERCEL_ENV = originalVercel;
    process.env.ENABLE_IMC_PILOT_PATIENTS = originalPilot;
  }
});

test("PENDING and CLAIMED are neither sent nor failed", () => {
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.PENDING), false);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.CLAIMED), false);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.FAILED), false);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.PERMANENT_FAILURE), false);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.ACCEPTED), true);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.SENT), true);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.DELIVERED), true);

  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.PENDING), undefined);
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.CLAIMED), undefined);
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.FAILED), "failed");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.PERMANENT_FAILURE), "failed");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.ACCEPTED), "sent");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.SENT), "sent");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.DELIVERED), "sent");
  assert.equal(toLegacyDeliveryStatus(undefined), undefined);
});

test("informed-consents send route has no body contact declarations", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const content = fs.readFileSync(
    path.resolve("src/app/api/modules/informed-consents/send/route.ts"),
    "utf8",
  );

  assert.ok(
    !content.includes("const mobileNumber = String(body.mobileNumber"),
    "route must not declare mobileNumber from request body",
  );
  assert.ok(
    !content.includes("const recipientEmail = String(body.recipientEmail"),
    "route must not declare recipientEmail from request body",
  );
  assert.ok(
    !content.includes("mobileNumber || !recipientEmail"),
    "route must not require request-body mobile/email",
  );
  assert.ok(
    content.includes("resolveCanonicalCaseContact"),
    "route must resolve contacts from canonical case source",
  );
});

test("explicit resend without a client request key returns 400", async () => {
  await assert.rejects(
    sendModuleSecureSigningLink({
      tenantId: "t1",
      initiatedBy: "user-1",
      moduleKey: "informed_consent",
      moduleType: "informed_consent",
      documentId: "doc-1",
      caseId: "case-1",
      patientName: "Patient",
      mobileNumber: "+966501234567",
      recipientEmail: "patient@example.com",
      explicitResend: true,
    }),
    /resend request key/i,
  );
});

test("idempotencyKey cannot silently act as the resend request key", async () => {
  // Supplying a client idempotency key for an explicit resend must not be
  // accepted as the resend request key.
  await assert.rejects(
    sendModuleSecureSigningLink({
      tenantId: "t1",
      initiatedBy: "user-1",
      moduleKey: "informed_consent",
      moduleType: "informed_consent",
      documentId: "doc-1",
      caseId: "case-1",
      patientName: "Patient",
      mobileNumber: "+966501234567",
      recipientEmail: "patient@example.com",
      explicitResend: true,
      idempotencyKey: "client-root-key",
    }),
    /resend request key/i,
  );
});

test("refreshModuleSecureSigningStatus returns real session data and 404s for missing sessions", async () => {
  const fixedCreatedAt = new Date("2026-01-01T00:00:00Z");
  const fixedUpdatedAt = new Date("2026-01-01T01:00:00Z");
  const fixedExpiresAt = new Date("2026-01-02T00:00:00Z");

  const fakeSession = {
    id: "session-real",
    tenantId: "t1",
    documentId: "doc-real",
    moduleType: "informed_consent",
    expiresAt: fixedExpiresAt,
    createdAt: fixedCreatedAt,
    updatedAt: fixedUpdatedAt,
    dispatches: [
      {
        id: "dispatch-sms",
        channel: PatientMessageChannel.SMS,
        status: PatientMessageStatus.PENDING,
      },
      {
        id: "dispatch-email",
        channel: PatientMessageChannel.EMAIL,
        status: PatientMessageStatus.CLAIMED,
      },
    ],
  };

  const fakeClient = {
    signingSession: {
      findFirst: async () => fakeSession,
    },
    signingSecureToken: {
      findFirst: async () => null,
    },
    $queryRaw: async () => [],
  };

  const result = await refreshModuleSecureSigningStatus(
    { tenantId: "t1", sessionId: "session-real" },
    fakeClient as unknown as PrismaClient,
  );

  assert.equal(result.sessionId, "session-real");
  assert.equal(result.documentId, "doc-real");
  assert.equal(result.moduleKey, "informed_consent");
  assert.equal(result.expiresAt, fixedExpiresAt.toISOString());
  assert.equal(result.createdAt, fixedCreatedAt.toISOString());
  assert.equal(result.updatedAt, fixedUpdatedAt.toISOString());
  assert.equal(result.smsDispatchId, "dispatch-sms");
  assert.equal(result.emailDispatchId, "dispatch-email");
  assert.equal(result.dispatchStatuses.sms, PatientMessageStatus.PENDING);
  assert.equal(result.dispatchStatuses.email, PatientMessageStatus.CLAIMED);
  assert.equal(result.smsDeliveryStatus, undefined);
  assert.equal(result.emailDeliveryStatus, undefined);

  const missingClient = {
    signingSession: { findFirst: async () => null },
  };

  await assert.rejects(
    refreshModuleSecureSigningStatus(
      { tenantId: "t1", sessionId: "missing" },
      missingClient as unknown as PrismaClient,
    ),
    /Signing session not found/,
  );
});
