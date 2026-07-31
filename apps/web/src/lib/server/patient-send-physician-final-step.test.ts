import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, PatientMessageChannel, PatientMessageStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.SIGNING_TOKEN_SECRET = "test-signing-token-secret-32-bytes-long!!";
process.env.RECIPIENT_HASH_PEPPER = "test-recipient-hash-pepper-32-bytes!!";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";
process.env.RECIPIENT_RESOLVER_DISABLE_DB = "true";
process.env.SIGNING_BASE_URL = "https://localhost:3000/sign";
process.env.SIGNING_URL_APPROVED_HOSTS = "localhost,127.0.0.1,test.wathiqcare.local";

import {
  deriveSendRootOperationKey,
  resolveTrustedPdfHash,
} from "@/lib/server/module-secure-signing-service";
import { createSigningSessionIdempotent } from "@/lib/server/signing-session-service";
import {
  createPatientMessageDispatch,
  processPendingDispatches,
  recordDispatchAccepted,
} from "@/lib/server/patient-message-outbox-service";
import { createFakeSmsGateway } from "@/lib/server/fake-sms-gateway";
import {
  registerTestRecipient,
  clearTestRecipients,
} from "@/lib/server/recipient-resolution-service";
import {
  evaluateWitnessPolicy,
  assertWitnessSatisfied,
} from "@/lib/server/witness-policy-service";
import { assertWitnessEligibility } from "@/lib/server/witness-requirement-service";
import { hashRecipient } from "@/lib/server/idempotency-core";

type SessionRecord = {
  id: string;
  tenantId: string;
  documentId: string;
  moduleType: string;
  providerKey: string;
  status: string;
  requiredSigners: unknown;
  completedSigners: unknown;
  signerLinks: unknown;
  expiresAt: Date | null;
  initiatedById: string;
  resendCount: number;
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
  createdAt: Date;
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
  metadata: unknown;
  createdAt: Date;
  acceptedAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
};

function createMemoryPrismaClient(options: { signingSessionUpdateManyThrows?: boolean } = {}) {
  const sessions = new Map<string, SessionRecord>();
  const tokens = new Map<string, TokenRecord>();
  const dispatches = new Map<string, DispatchRecord>();
  let sessionIdCounter = 1;
  let tokenIdCounter = 1;
  let dispatchIdCounter = 1;

  function sessionMatches(
    session: SessionRecord,
    where: Record<string, unknown>,
  ): boolean {
    if (where.tenantId !== undefined && session.tenantId !== where.tenantId) return false;
    if (where.documentId !== undefined && session.documentId !== where.documentId) return false;
    if (where.id !== undefined) {
      const idSet =
        typeof where.id === "string"
          ? new Set([where.id])
          : new Set((where.id as { in: string[] }).in);
      if (!idSet.has(session.id)) return false;
    }
    if (where.idempotencyKey !== undefined && session.idempotencyKey !== where.idempotencyKey) {
      return false;
    }
    if (where.status !== undefined) {
      if (typeof where.status === "string" && session.status !== where.status) return false;
      const notIn = (where.status as { notIn?: string[] } | undefined)?.notIn;
      if (notIn && notIn.includes(session.status)) return false;
      const inSet = (where.status as { in?: string[] } | undefined)?.in;
      if (inSet && !inSet.includes(session.status)) return false;
    }
    return true;
  }

  function findUniqueSession(args: {
    where: { id?: string };
  }): SessionRecord | null {
    if (args.where.id) {
      return structuredClone(sessions.get(args.where.id) ?? null);
    }
    return null;
  }

  function findFirstSession(args: {
    where: Record<string, unknown>;
    include?: { tokens?: boolean };
    orderBy?: unknown;
  }): SessionRecord | null {
    const candidates = Array.from(sessions.values()).filter((s) => sessionMatches(s, args.where));
    candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const result = candidates[0] ?? null;
    if (!result) return null;
    const clone = structuredClone(result) as SessionRecord & { tokens?: TokenRecord[] };
    if ((args.include as { tokens?: boolean } | undefined)?.tokens) {
      clone.tokens = Array.from(tokens.values())
        .filter((t) => t.sessionId === result.id)
        .map((t) => structuredClone(t));
    }
    return clone;
  }

  function findManySessions(args: { where: Record<string, unknown> }): SessionRecord[] {
    return Array.from(sessions.values()).filter((s) => sessionMatches(s, args.where));
  }

  function createSession(args: { data: Partial<SessionRecord> }): SessionRecord {
    const id = `session-${sessionIdCounter++}`;
    const record = {
      ...args.data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SessionRecord;
    sessions.set(id, record);
    return structuredClone(record);
  }

  function updateManySessions(args: {
    where: Record<string, unknown>;
    data: Partial<SessionRecord>;
  }): { count: number } {
    if (options.signingSessionUpdateManyThrows) {
      throw new Error("simulated session update failure");
    }
    let count = 0;
    for (const session of sessions.values()) {
      if (sessionMatches(session, args.where)) {
        Object.assign(session, args.data);
        count += 1;
      }
    }
    return { count };
  }

  function updateSession(args: { where: { id: string }; data: Partial<SessionRecord> }): SessionRecord {
    const session = sessions.get(args.where.id);
    if (!session) throw new Error("Session not found");
    Object.assign(session, args.data);
    return structuredClone(session);
  }

  function createToken(args: { data: Partial<TokenRecord> }): TokenRecord {
    const id = `token-${tokenIdCounter++}`;
    const record = {
      usedAt: null,
      revokedAt: null,
      ...args.data,
      id,
      createdAt: new Date(),
    } as TokenRecord;
    tokens.set(id, record);
    return structuredClone(record);
  }

  function updateManyTokens(args: {
    where: { sessionId?: { in: string[] }; usedAt?: null; revokedAt?: null };
    data: Partial<TokenRecord>;
  }): { count: number } {
    let count = 0;
    const sessionIds = args.where.sessionId?.in ?? [];
    for (const token of tokens.values()) {
      if (!sessionIds.includes(token.sessionId)) continue;
      if (args.where.usedAt === null && token.usedAt !== null) continue;
      if (args.where.revokedAt === null && token.revokedAt !== null) continue;
      Object.assign(token, args.data);
      count += 1;
    }
    return { count };
  }

  function findUniqueDispatch(args: {
    where: { id?: string; tenantId_signingSessionId_channel_idempotencyKey?: Record<string, unknown> };
  }): DispatchRecord | null {
    if (args.where.id) {
      return structuredClone(dispatches.get(args.where.id) ?? null);
    }
    const key = args.where.tenantId_signingSessionId_channel_idempotencyKey;
    if (key) {
      for (const record of dispatches.values()) {
        if (
          record.tenantId === key.tenantId &&
          record.signingSessionId === key.signingSessionId &&
          record.channel === key.channel &&
          record.idempotencyKey === key.idempotencyKey
        ) {
          return structuredClone(record);
        }
      }
    }
    return null;
  }

  function createDispatch(args: { data: Partial<DispatchRecord> }): DispatchRecord {
    const id = `dispatch-${dispatchIdCounter++}`;
    const record = {
      ...args.data,
      id,
      createdAt: new Date(),
    } as DispatchRecord;
    dispatches.set(id, record);
    return structuredClone(record);
  }

  function updateDispatch(args: {
    where: { id: string; status?: PatientMessageStatus };
    data: Partial<DispatchRecord>;
  }): DispatchRecord {
    const record = dispatches.get(args.where.id);
    if (!record) throw new Error("Dispatch not found");
    if (args.where.status !== undefined && record.status !== args.where.status) {
      throw new Error("Dispatch status mismatch");
    }
    for (const [key, value] of Object.entries(args.data)) {
      const recordRef = record as unknown as Record<string, unknown>;
      if (value && typeof value === "object" && "increment" in value) {
        recordRef[key] = (recordRef[key] as number) + (value as { increment: number }).increment;
      } else {
        recordRef[key] = value;
      }
    }
    return structuredClone(record);
  }

  function updateManyDispatches(args: {
    where: {
      tenantId?: string;
      channel?: PatientMessageChannel;
      providerMessageId?: string;
      status?: { in?: PatientMessageStatus[] };
    };
    data: Partial<DispatchRecord>;
  }): { count: number } {
    let count = 0;
    for (const record of dispatches.values()) {
      if (args.where.tenantId !== undefined && record.tenantId !== args.where.tenantId) continue;
      if (args.where.channel !== undefined && record.channel !== args.where.channel) continue;
      if (args.where.providerMessageId !== undefined && record.providerMessageId !== args.where.providerMessageId) continue;
      if (args.where.status?.in && !args.where.status.in.includes(record.status)) continue;
      Object.assign(record, args.data);
      count += 1;
    }
    return { count };
  }

  function claimNextEligible(
    tenantId: string,
    channelFilter: PatientMessageChannel | null,
    now: Date,
    leaseExpiresAt: Date,
  ): DispatchRecord | null {
    console.log("CLAIM", tenantId, channelFilter, now.toISOString(), dispatches.size);
    for (const d of dispatches.values()) {
      console.log("DISPATCH", d.nextAttemptAt.toISOString(), d.status, d.tenantId);
    }
    const matches: DispatchRecord[] = [];
    for (const record of dispatches.values()) {
      if (record.tenantId !== tenantId) continue;
      if (channelFilter !== null && record.channel !== channelFilter) continue;
      let eligible = false;
      if (
        (record.status === PatientMessageStatus.PENDING || record.status === PatientMessageStatus.FAILED) &&
        record.nextAttemptAt <= now
      ) {
        eligible = true;
      }
      if (
        record.status === PatientMessageStatus.CLAIMED &&
        record.claimExpiresAt &&
        record.claimExpiresAt <= now
      ) {
        eligible = true;
      }
      if (eligible) matches.push(record);
    }
    matches.sort((a, b) => {
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
    return structuredClone(row);
  }

  async function queryRaw(
    query: { sql: string; values: unknown[] },
  ): Promise<
    Array<
      | {
          event_type: string;
          count: number;
        }
      | {
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
        }
    >
  > {
    const sql = query.sql.toLowerCase();
    console.log("QUERYRAW", sql.slice(0, 60), query.values);
    if (sql.includes("update patient_message_dispatches")) {
      const tenantId = query.values[0] as string;
      const channelFilter = (query.values[1] ?? null) as PatientMessageChannel | null;
      const dates = query.values.filter((v): v is Date => v instanceof Date);
      const now = dates[0] ?? new Date();
      const leaseExpiresAt =
        dates.length > 1
          ? dates.slice(1).reduce((max, d) => (d > max ? d : max), now)
          : now;
      const claim = claimNextEligible(tenantId, channelFilter, now, leaseExpiresAt);
      if (!claim) return [];
      const metadata = (claim.metadata || {}) as Record<string, unknown>;
      return [
        {
          id: claim.id,
          channel: claim.channel,
          tenant_id: claim.tenantId,
          signing_session_id: claim.signingSessionId,
          recipient_reference: claim.recipientReference,
          template_key: String(metadata.templateKey || ""),
          locale: String(metadata.locale || "ar"),
          signer_role: String(metadata.signerRole || ""),
          expires_at: new Date(String(metadata.expiresAt || new Date().toISOString())),
          recipient_hash: claim.recipientHash,
        },
      ];
    }
    return [];
  }

  async function transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
    return callback(modelApi);
  }

  const modelApi = {
    signingSession: {
      findUnique: findUniqueSession,
      findFirst: findFirstSession,
      findMany: findManySessions,
      create: createSession,
      updateMany: updateManySessions,
      update: updateSession,
    },
    signingSecureToken: {
      create: createToken,
      updateMany: updateManyTokens,
    },
    patientMessageDispatch: {
      findUnique: findUniqueDispatch,
      create: createDispatch,
      update: updateDispatch,
      updateMany: updateManyDispatches,
    },
    consentAuditEvent: { create: async () => undefined },
    consentTimelineEvent: { create: async () => undefined },
  };

  const client = {
    ...modelApi,
    $queryRaw: queryRaw as unknown as PrismaClient["$queryRaw"],
    $transaction: transaction as unknown as PrismaClient["$transaction"],
    get sessions() {
      return Array.from(sessions.values()).map((s) => structuredClone(s));
    },
    get tokens() {
      return Array.from(tokens.values()).map((t) => structuredClone(t));
    },
    get dispatches() {
      return Array.from(dispatches.values()).map((d) => structuredClone(d));
    },
  };

  return client;
}

const sampleSigningInput = {
  tenantId: "t1",
  documentId: "doc-1",
  moduleType: "informed_consent" as const,
  initiatedBy: "user-1",
  pdfBytes: Buffer.from("pdf"),
  signers: [
    {
      role: "PATIENT" as const,
      name: "Patient",
      mobile: "+966501234567",
      email: "patient@example.com",
    },
  ],
  expiryHours: 1,
  locale: "ar" as const,
};

// -----------------------------------------------------------------------------
// Routine path
// -----------------------------------------------------------------------------

test("routine path creates one session and one intended dispatch per channel", async () => {
  const client = createMemoryPrismaClient();
  const result = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-routine",
    idempotencyFingerprint: "fp-routine",
    approvedPdfHash: "pdf-hash-routine",
    caseId: "case-1",
    client: client as unknown as PrismaClient,
  });

  assert.equal(client.sessions.length, 1);
  assert.equal(client.tokens.length, 1);
  assert.equal(client.dispatches.length, 2);

  const smsDispatch = client.dispatches.find((d) => d.channel === PatientMessageChannel.SMS);
  const emailDispatch = client.dispatches.find((d) => d.channel === PatientMessageChannel.EMAIL);

  assert.ok(smsDispatch);
  assert.ok(emailDispatch);
  assert.equal(smsDispatch?.status, PatientMessageStatus.PENDING);
  assert.equal(emailDispatch?.status, PatientMessageStatus.PENDING);
  assert.equal(smsDispatch?.recipientReference, "case:case-1:mobile");
  assert.equal(emailDispatch?.recipientReference, "case:case-1:email");

  const session = client.sessions[0];
  assert.equal(session.status, "PENDING");
  assert.equal(session.idempotencyKey, "key-routine");
  const metadata = session.metadata as Record<string, unknown>;
  assert.equal(metadata.approvedPdfHash, "pdf-hash-routine");

  assert.ok(result.tokens.PATIENT);
  assert.equal(result.dispatches?.length, 2);
});

test("repeat click with the same idempotency key returns the same session", async () => {
  const client = createMemoryPrismaClient();
  const first = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-repeat",
    idempotencyFingerprint: "fp-repeat",
    caseId: "case-1",
    client: client as unknown as PrismaClient,
  });

  const second = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-repeat",
    idempotencyFingerprint: "fp-repeat",
    caseId: "case-1",
    client: client as unknown as PrismaClient,
  });

  assert.equal(first.sessionId, second.sessionId);
  assert.equal(client.sessions.length, 1);
  assert.equal(client.dispatches.length, 2);
});

test("no raw token or signing URL is persisted in the session", async () => {
  const client = createMemoryPrismaClient();
  await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-raw",
    idempotencyFingerprint: "fp-raw",
    caseId: "case-1",
    client: client as unknown as PrismaClient,
  });

  const session = client.sessions[0];
  const sessionJson = JSON.stringify(session);
  assert.ok(!sessionJson.includes("http"));
  assert.ok(!sessionJson.includes("/sign/"));
  assert.ok(!sessionJson.includes("v1:"));

  for (const token of client.tokens) {
    assert.equal((token as unknown as Record<string, unknown>).token, undefined);
    assert.ok(token.tokenHash);
  }
});

test("resolveTrustedPdfHash prefers the first-party immutablePdfHash column", () => {
  assert.equal(
    resolveTrustedPdfHash({
      immutablePdfHash: "column-hash",
      metadata: { immutablePdfHash: "meta-hash", checksum: "checksum-hash" },
    }),
    "column-hash",
  );
  assert.equal(
    resolveTrustedPdfHash({
      immutablePdfHash: null,
      metadata: { checksum: "checksum-hash" },
    }),
    "checksum-hash",
  );
});

test("canonical send root key is deterministic and includes PDF hash", () => {
  const base = {
    tenantId: "t1",
    caseId: "case-1",
    documentId: "doc-1",
    approvedConsentFormKey: "adenotonsillectomy" as const,
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
});

// -----------------------------------------------------------------------------
// Triggered path
// -----------------------------------------------------------------------------

test("routine conditional policy permits zero witnesses when no triggers fire", () => {
  const decision = evaluateWitnessPolicy({
    templateRequiresWitness: false,
    templateRiskLevel: "MEDIUM",
    templatePolicy: {
      witnessMode: "CONDITIONAL",
      requiredWitnessRoles: ["NURSING_REPRESENTATIVE"],
    },
    triggers: {
      substituteDecisionMaker: false,
      lacksCapacity: false,
      cannotReadOrUseJourney: false,
      communicationBarrier: false,
      disputedOrObjected: false,
      refusalOrAma: false,
    },
  });

  assert.equal(decision.requiredWitnessCount, 0);
  assert.doesNotThrow(() => assertWitnessSatisfied(decision, []));
});

test("fired trigger escalates conditional policy to require a human witness", () => {
  const decision = evaluateWitnessPolicy({
    templateRequiresWitness: false,
    templateRiskLevel: "MEDIUM",
    templatePolicy: {
      witnessMode: "CONDITIONAL",
      requiredWitnessRoles: ["NURSING_REPRESENTATIVE"],
    },
    triggers: {
      substituteDecisionMaker: true,
      lacksCapacity: false,
      cannotReadOrUseJourney: false,
      communicationBarrier: false,
      disputedOrObjected: false,
      refusalOrAma: false,
    },
  });

  assert.equal(decision.requiredWitnessCount, 1);
  assert.throws(() => assertWitnessSatisfied(decision, []), /witness/);
  assert.doesNotThrow(() =>
    assertWitnessSatisfied(decision, [{ role: "NURSING_REPRESENTATIVE", userId: "nurse-1" }]),
  );
});

test("self-witnessing and duplicate signatures are blocked", () => {
  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "doc-1",
        candidateRole: "NURSING_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        clinicianUserId: "doc-1",
        existingWitnesses: [],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_SELF_WITNESSING",
  );

  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "nurse-1",
        candidateRole: "NURSING_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        existingWitnesses: [{ userId: "nurse-1", role: "NURSING_REPRESENTATIVE" }],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_DUPLICATE_SIGNATURE",
  );
});

test("witness must sign in the exact required role", () => {
  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "nurse-1",
        candidateRole: "PATIENT_EXPERIENCE_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        existingWitnesses: [],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_ROLE_MISMATCH",
  );
});

// -----------------------------------------------------------------------------
// Failure path
// -----------------------------------------------------------------------------

test("fake retryable failure is retried successfully without duplicate gateway calls", async () => {
  const client = createMemoryPrismaClient();
  const gateway = createFakeSmsGateway();
  gateway.setFailureCount(1);
  const now = new Date("2026-01-01T00:00:00Z");

  await createPatientMessageDispatch(
    {
      tenantId: "t1",
      signingSessionId: "session-1",
      channel: PatientMessageChannel.SMS,
      idempotencyKey: "key-retry",
      idempotencyFingerprint: "fp-retry",
      recipientHash: hashRecipient("+966501234567", { tenantId: "t1" }),
      recipientReference: "case:case-1:mobile",
      templateKey: "secure_signing_link_sms",
      locale: "ar",
      signerRole: "PATIENT",
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      nextAttemptAt: now,
    },
    client as unknown as Prisma.TransactionClient,
  );

  registerTestRecipient("t1", "case:case-1:mobile", { mobile: "+966501234567" });
  const resolved = await (await import("@/lib/server/recipient-resolution-service")).resolveRecipient({
    tenantId: "t1",
    reference: "case:case-1:mobile",
  });
  console.log("RESOLVED", resolved);

  const first = await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });
  console.log("FIRST", first, client.dispatches[0]);
  assert.equal(first.processed, 1);
  assert.equal(gateway.calls.length, 1);
  assert.equal(client.dispatches[0].status, PatientMessageStatus.FAILED);

  const later = new Date(now.getTime() + 60_000);
  const second = await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now: later,
    client: client as unknown as PrismaClient,
  });
  assert.equal(second.processed, 1);
  assert.equal(gateway.calls.length, 2);
  assert.equal(client.dispatches[0].status, PatientMessageStatus.ACCEPTED);

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

test("permanent failure is surfaced and stops retry", async () => {
  const client = createMemoryPrismaClient();
  const gateway = createFakeSmsGateway({ errorCode: "invalid_recipient" });
  gateway.setPermanentFailure();
  const now = new Date("2026-01-01T00:00:00Z");

  await createPatientMessageDispatch(
    {
      tenantId: "t1",
      signingSessionId: "session-1",
      channel: PatientMessageChannel.SMS,
      idempotencyKey: "key-perm",
      idempotencyFingerprint: "fp-perm",
      recipientHash: hashRecipient("+966501234567", { tenantId: "t1" }),
      recipientReference: "case:case-1:mobile",
      templateKey: "secure_signing_link_sms",
      locale: "ar",
      signerRole: "PATIENT",
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      nextAttemptAt: now,
    },
    client as unknown as Prisma.TransactionClient,
  );

  registerTestRecipient("t1", "case:case-1:mobile", { mobile: "+966501234567" });

  await processPendingDispatches({
    tenantId: "t1",
    smsGateway: gateway,
    now,
    client: client as unknown as PrismaClient,
  });

  assert.equal(client.dispatches[0].status, PatientMessageStatus.PERMANENT_FAILURE);
  assert.equal(client.dispatches[0].lastErrorCode, "invalid_recipient");

  clearTestRecipients();
});

test("accepted dispatch survives session reconciliation failure", async () => {
  const client = createMemoryPrismaClient({ signingSessionUpdateManyThrows: true });
  const dispatch = await createPatientMessageDispatch(
    {
      tenantId: "t1",
      signingSessionId: "session-1",
      channel: PatientMessageChannel.SMS,
      idempotencyKey: "key-accept",
      idempotencyFingerprint: "fp-accept",
      recipientHash: hashRecipient("+966501234567", { tenantId: "t1" }),
      recipientReference: "case:case-1:mobile",
      templateKey: "secure_signing_link_sms",
      locale: "ar",
      signerRole: "PATIENT",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
    client as unknown as Prisma.TransactionClient,
  );

  await recordDispatchAccepted(dispatch.id, "msg-1", client as unknown as PrismaClient);

  assert.equal(client.dispatches[0].status, PatientMessageStatus.ACCEPTED);
  assert.equal(client.dispatches[0].providerMessageId, "msg-1");
});

test("explicit resend invalidates the previous session and is idempotent", async () => {
  const client = createMemoryPrismaClient();
  const first = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: "key-resend",
    idempotencyFingerprint: "fp-resend",
    caseId: "case-1",
    client: client as unknown as PrismaClient,
  });

  const resendKey = "resend-request-1";
  const second = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: resendKey,
    idempotencyFingerprint: "fp-resend",
    explicitResend: true,
    caseId: "case-1",
    client: client as unknown as PrismaClient,
  });

  assert.notEqual(first.sessionId, second.sessionId);
  const oldSession = client.sessions.find((s) => s.id === first.sessionId);
  assert.equal(oldSession?.status, "REVOKED");
  const newSession = client.sessions.find((s) => s.id === second.sessionId);
  assert.equal(newSession?.status, "PENDING");

  const third = await createSigningSessionIdempotent({
    input: sampleSigningInput,
    idempotencyKey: resendKey,
    idempotencyFingerprint: "fp-resend",
    explicitResend: true,
    caseId: "case-1",
    client: client as unknown as PrismaClient,
  });

  assert.equal(second.sessionId, third.sessionId);
  assert.equal(client.sessions.filter((s) => s.status !== "REVOKED").length, 1);
});
