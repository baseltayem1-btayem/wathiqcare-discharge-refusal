import { PatientMessageChannel, PatientMessageStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

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

type ConsentDocumentRecord = {
  id: string;
  tenantId: string;
  patientName: string | null;
  mrn: string | null;
  dob: string | null;
  physicianName: string | null;
  physicianSpecialty: string | null;
  metadata: unknown;
  [key: string]: unknown;
};

export function createMemoryPrismaClient(options: { signingSessionUpdateManyThrows?: boolean } = {}) {
  const sessions = new Map<string, SessionRecord>();
  const tokens = new Map<string, TokenRecord>();
  const dispatches = new Map<string, DispatchRecord>();
  const consentDocuments = new Map<string, ConsentDocumentRecord>();
  let sessionIdCounter = 1;
  let tokenIdCounter = 1;
  let dispatchIdCounter = 1;

  function sessionMatches(session: SessionRecord, where: Record<string, unknown>): boolean {
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

  function findUniqueSession(args: { where: { id?: string } }): SessionRecord | null {
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
      if (record.status === PatientMessageStatus.CLAIMED && record.claimExpiresAt && record.claimExpiresAt <= now) {
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
      | { event_type: string; count: number }
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
    if (sql.includes("update patient_message_dispatches")) {
      const tenantId = query.values[0] as string;
      const channelFilter = (query.values[1] ?? null) as PatientMessageChannel | null;
      const dates = query.values.filter((v): v is Date => v instanceof Date);
      const now = dates[0] ?? new Date();
      const leaseExpiresAt = dates.length > 1 ? dates.slice(1).reduce((max, d) => (d > max ? d : max), now) : now;
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
    if (sql.includes("from webhook_events")) {
      return [];
    }
    return [];
  }

  async function transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
    return callback(modelApi);
  }

  const modelApi = {
    consentDocument: {
      findFirst: async (args: { where: Record<string, unknown> }) => {
        const { tenantId, id } = args.where as { tenantId?: string; id?: string };
        for (const doc of consentDocuments.values()) {
          if (tenantId !== undefined && doc.tenantId !== tenantId) continue;
          if (id !== undefined && doc.id !== id) continue;
          return structuredClone(doc);
        }
        return null;
      },
    },
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
      findFirst: async (args: { where: Record<string, unknown> }) => {
        const { sessionId, tenantId, signerRole } = args.where as {
          sessionId?: string;
          tenantId?: string;
          signerRole?: string;
        };
        const candidates = Array.from(tokens.values()).filter((t) => {
          if (sessionId !== undefined && t.sessionId !== sessionId) return false;
          if (tenantId !== undefined && t.tenantId !== tenantId) return false;
          if (signerRole !== undefined && t.signerRole !== signerRole) return false;
          return true;
        });
        candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return candidates[0] ? structuredClone(candidates[0]) : null;
      },
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
    get consentDocuments() {
      return Array.from(consentDocuments.values()).map((d) => structuredClone(d));
    },
    setConsentDocument(record: ConsentDocumentRecord) {
      consentDocuments.set(record.id, record);
    },
  };

  return client;
}
