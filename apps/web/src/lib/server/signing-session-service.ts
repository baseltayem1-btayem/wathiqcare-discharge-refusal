import { Prisma, PrismaClient, PatientMessageStatus } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";
import {
  type SignerRole,
  type SigningSessionInput,
  computeSigningExpiry,
} from "@/lib/core/signature-core";
import {
  generateSigningToken,
  computeTokenHash,
} from "@/lib/server/signing-token-service";
import {
  createPatientMessageDispatch,
  type CreateDispatchInput,
} from "@/lib/server/patient-message-outbox-service";
import {
  hashRecipient,
  computePayloadFingerprint,
  deriveChildIdempotencyKey,
  validateIdempotencyKey,
} from "@/lib/server/idempotency-core";
import { writeConsentAuditInTx } from "@/lib/server/consent-audit-service";
import { ApiError } from "@/lib/server/http";

const prisma = () => getPrisma();

export type SigningSessionResult = {
  sessionId: string;
  status: string;
  expiresAt: Date | null;
  tokenHashes: Array<{ signerRole: string; tokenHash: string }>;
  createdAt: Date;
  updatedAt: Date;
  revokedCount: number;
};

export type TokenMap = Record<string, string>;

export type SigningSessionWithTokens = SigningSessionResult & {
  tokens: TokenMap;
  dispatches?: Array<{
    id: string;
    channel: string;
    status: PatientMessageStatus;
  }>;
};

type CreateSigningSessionOptions = {
  input: SigningSessionInput;
  idempotencyKey?: string;
  idempotencyFingerprint?: string;
  approvedPdfHash?: string;
  explicitResend?: boolean;
  caseId?: string;
  client?: PrismaClient;
  metadata?: Record<string, unknown>;
};

const ACTIVE_STATUSES = ["PENDING", "SENT", "PARTIALLY_SIGNED"];
const MAX_SERIALIZATION_RETRIES = 3;

function isSerializationFailure(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
    || (error instanceof Error
      && /deadlock|could not serialize|serialization failure/i.test(error.message))
  );
}

async function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getActiveSigningSession(
  tenantId: string,
  documentId: string,
  client?: PrismaClient,
) {
  const db = client ?? prisma();
  return db.signingSession.findFirst({
    where: {
      tenantId,
      documentId,
      status: { in: ACTIVE_STATUSES },
    },
    include: { tokens: true, dispatches: true },
    orderBy: { createdAt: "desc" },
  });
}

async function findSessionByIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
  client?: PrismaClient,
) {
  const db = client ?? prisma();
  return db.signingSession.findFirst({
    where: { tenantId, idempotencyKey },
    include: { tokens: true, dispatches: true },
    orderBy: { createdAt: "desc" },
  });
}

async function revokeActiveSessionsForDocument(
  tenantId: string,
  documentId: string,
  revokedBy: string,
  reason: string,
  tx: Prisma.TransactionClient,
): Promise<string[]> {
  const now = new Date();

  const activeSessions = await tx.signingSession.findMany({
    where: {
      tenantId,
      documentId,
      status: { in: ACTIVE_STATUSES },
    },
    select: { id: true },
  });

  const sessionIds = activeSessions.map((s) => s.id);

  if (sessionIds.length > 0) {
    await tx.signingSession.updateMany({
      where: { id: { in: sessionIds } },
      data: {
        status: "REVOKED",
        revokedAt: now,
        revokedReason: reason,
        updatedAt: now,
      },
    });

    await tx.signingSecureToken.updateMany({
      where: {
        sessionId: { in: sessionIds },
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    for (const sessionId of sessionIds) {
      const existing = await tx.signingSession.findUnique({
        where: { id: sessionId },
        select: { metadata: true },
      });
      const existingMeta = (existing?.metadata || {}) as Record<string, unknown>;
      await tx.signingSession.update({
        where: { id: sessionId },
        data: {
          metadata: {
            ...existingMeta,
            revocation: {
              revokedBy,
              reason,
              revokedAt: now.toISOString(),
            },
          },
        },
      });
    }
  }

  return sessionIds;
}

async function createSessionAndTokens(
  input: SigningSessionInput,
  idempotencyKey: string | undefined,
  idempotencyFingerprint: string | undefined,
  approvedPdfHash: string | undefined,
  caseId: string | undefined,
  metadata: Record<string, unknown> | undefined,
  tx: Prisma.TransactionClient,
): Promise<{ result: SigningSessionResult; tokens: TokenMap; dispatches: Array<{ id: string; channel: string; status: PatientMessageStatus }> }> {
  if (!idempotencyKey) {
    throw new ApiError(400, "Idempotency-Key is required for signing session creation");
  }
  validateIdempotencyKey(idempotencyKey);

  const expiresAt = computeSigningExpiry(input.expiryHours);

  const session = await tx.signingSession.create({
    data: {
      tenantId: input.tenantId,
      documentId: input.documentId,
      moduleType: input.moduleType,
      providerKey: "internal_secure_link",
      status: "PENDING",
      requiredSigners: input.signers.map((s) => s.role) as string[],
      completedSigners: [],
      signerLinks: {},
      expiresAt,
      initiatedById: input.initiatedBy,
      idempotencyKey: idempotencyKey ?? null,
      idempotencyFingerprint: idempotencyFingerprint ?? null,
      metadata: {
        pdfBytesLength: input.pdfBytes?.length ?? 0,
        approvedPdfHash: approvedPdfHash ?? null,
        ...(metadata || {}),
      },
    },
  });

  // Re-create deterministic tokens now that we have the real session id.
  const finalTokens: Array<{
    signerRole: SignerRole;
    token: string;
    tokenHash: string;
    expiresAt: Date;
  }> = [];
  for (const signer of input.signers) {
    const token = generateSigningToken({
      tenantId: input.tenantId,
      sessionId: session.id,
      signerRole: signer.role,
      expiresAt,
    });
    finalTokens.push({
      signerRole: signer.role,
      token,
      tokenHash: computeTokenHash(token),
      expiresAt,
    });
  }

  for (const t of finalTokens) {
    await tx.signingSecureToken.create({
      data: {
        sessionId: session.id,
        tenantId: input.tenantId,
        signerRole: t.signerRole,
        tokenHash: t.tokenHash,
        expiresAt: t.expiresAt,
      },
    });
  }

  const tokensByRole: TokenMap = {};
  for (const t of finalTokens) {
    tokensByRole[t.signerRole] = t.token;
  }

  const dispatches: Array<{
    id: string;
    channel: string;
    status: PatientMessageStatus;
  }> = [];
  const rootFingerprint = idempotencyFingerprint ?? computePayloadFingerprint(input);

  for (const signer of input.signers) {
    if (signer.mobile) {
      const dispatch = await createPatientMessageDispatch(
        {
          tenantId: input.tenantId,
          signingSessionId: session.id,
          channel: "SMS",
          idempotencyKey: deriveChildIdempotencyKey(
            deriveChildIdempotencyKey(idempotencyKey, "PATIENT_MESSAGE_SMS"),
            signer.role,
          ),
          idempotencyFingerprint: rootFingerprint,
          recipientHash: hashRecipient(signer.mobile, { tenantId: input.tenantId }),
          recipientReference: caseId
            ? `case:${caseId}:mobile`
            : `consent_document:${input.documentId}:mobile`,
          templateKey: "secure_signing_link_sms",
          locale: (input as { locale?: "ar" | "en" }).locale ?? "ar",
          signerRole: signer.role,
          expiresAt,
        } as CreateDispatchInput,
        tx,
      );
      dispatches.push({ id: dispatch.id, channel: "SMS", status: dispatch.status });
    }

    if (signer.email) {
      const dispatch = await createPatientMessageDispatch(
        {
          tenantId: input.tenantId,
          signingSessionId: session.id,
          channel: "EMAIL",
          idempotencyKey: deriveChildIdempotencyKey(
            deriveChildIdempotencyKey(idempotencyKey, "PATIENT_MESSAGE_EMAIL"),
            signer.role,
          ),
          idempotencyFingerprint: rootFingerprint,
          recipientHash: hashRecipient(signer.email, { tenantId: input.tenantId }),
          recipientReference: caseId
            ? `case:${caseId}:email`
            : `consent_document:${input.documentId}:email`,
          templateKey: "secure_signing_link_email",
          locale: (input as { locale?: "ar" | "en" }).locale ?? "ar",
          signerRole: signer.role,
          expiresAt,
        } as CreateDispatchInput,
        tx,
      );
      dispatches.push({ id: dispatch.id, channel: "EMAIL", status: dispatch.status });
    }
  }

  await writeConsentAuditInTx(tx, {
    tenantId: input.tenantId,
    actorUserId: input.initiatedBy,
    actorRole: "system",
    action: "secure_signing_session_created",
    summary: `Secure signing session ${session.id} created for document ${input.documentId}`,
    source: "signing-session-service",
    consentDocumentId: input.documentId,
    metadata: {
      sessionId: session.id,
      documentId: input.documentId,
      moduleType: input.moduleType,
      signerRoles: input.signers.map((s) => s.role),
      dispatchChannels: dispatches.map((d) => d.channel),
    },
  });

  return {
    result: {
      sessionId: session.id,
      status: session.status,
      expiresAt,
      tokenHashes: finalTokens.map((t) => ({
        signerRole: t.signerRole,
        tokenHash: t.tokenHash,
      })),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      revokedCount: 0,
    },
    tokens: tokensByRole,
    dispatches,
  };
}

function mapSessionToResult(
  session: {
    id: string;
    status: string;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    tokens: Array<{ signerRole: string; tokenHash: string | null }>;
  },
  revokedCount = 0,
): SigningSessionResult {
  return {
    sessionId: session.id,
    status: session.status,
    expiresAt: session.expiresAt,
    tokenHashes: session.tokens.map((t) => ({
      signerRole: t.signerRole,
      tokenHash: t.tokenHash || "",
    })),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    revokedCount,
  };
}

export async function createSigningSessionIdempotent(
  options: CreateSigningSessionOptions,
): Promise<SigningSessionWithTokens> {
  const { input, idempotencyKey, idempotencyFingerprint, approvedPdfHash, explicitResend, caseId, client, metadata } =
    options;

  // Resend idempotency: a stable resend key should return the same replacement session.
  if (idempotencyKey && explicitResend) {
    const existing = await findSessionByIdempotencyKey(
      input.tenantId,
      idempotencyKey,
      client,
    );
    if (existing) {
      if (existing.idempotencyFingerprint !== idempotencyFingerprint) {
        throw new ApiError(409, "IDEMPOTENCY_CONFLICT", {
          code: "IDEMPOTENCY_CONFLICT",
        });
      }
      return {
        ...mapSessionToResult(existing),
        tokens: {},
      };
    }
  }

  // Normal idempotency: reuse an active session created with the same key.
  if (idempotencyKey && !explicitResend) {
    const existing = await findSessionByIdempotencyKey(
      input.tenantId,
      idempotencyKey,
      client,
    );
    if (existing) {
      if (existing.idempotencyFingerprint !== idempotencyFingerprint) {
        throw new ApiError(409, "IDEMPOTENCY_CONFLICT", {
          code: "IDEMPOTENCY_CONFLICT",
        });
      }
      return {
        ...mapSessionToResult(existing),
        tokens: {},
      };
    }
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      const db = client ?? prisma();
      return await db.$transaction(
        async (tx: Prisma.TransactionClient) => {
          let revokedCount = 0;
          if (explicitResend) {
            revokedCount = (
              await revokeActiveSessionsForDocument(
                input.tenantId,
                input.documentId,
                input.initiatedBy,
                "Explicit resend requested",
                tx,
              )
            ).length;
          }

          const { result, tokens, dispatches } = await createSessionAndTokens(
            input,
            idempotencyKey,
            idempotencyFingerprint,
            approvedPdfHash,
            caseId,
            metadata,
            tx,
          );

          return {
            ...result,
            revokedCount,
            tokens,
            dispatches,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      lastError = error;
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

      if (isUniqueViolation && idempotencyKey) {
        const existing = await findSessionByIdempotencyKey(
          input.tenantId,
          idempotencyKey,
          client,
        );
        if (existing) {
          if (existing.idempotencyFingerprint !== idempotencyFingerprint) {
            throw new ApiError(409, "IDEMPOTENCY_CONFLICT", {
              code: "IDEMPOTENCY_CONFLICT",
            });
          }
          return {
            ...mapSessionToResult(existing),
            tokens: {},
          };
        }
      }

      if (isUniqueViolation) {
        throw new ApiError(409, "ACTIVE_SIGNING_SESSION_CONFLICT", {
          code: "ACTIVE_SIGNING_SESSION_CONFLICT",
        });
      }

      if (isSerializationFailure(error) && attempt < MAX_SERIALIZATION_RETRIES) {
        const jitter = 50 + Math.floor(Math.random() * 101); // 50–150ms
        await sleepMs(jitter);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export async function markSessionSentIfPending(
  tenantId: string,
  sessionId: string,
  client: PrismaClient | Prisma.TransactionClient,
): Promise<boolean> {
  const result = await client.signingSession.updateMany({
    where: {
      id: sessionId,
      tenantId,
      status: "PENDING",
    },
    data: {
      status: "SENT",
      updatedAt: new Date(),
    },
  });
  return result.count > 0;
}

export async function revokeSigningSessionForDocument(
  tenantId: string,
  documentId: string,
  revokedBy: string,
  reason?: string,
): Promise<{ revokedAt: string; revokedSessions: number; documentId: string }> {
  const now = new Date();

  const revokedSessionIds = await prisma().$transaction(async (tx) => {
    return revokeActiveSessionsForDocument(
      tenantId,
      documentId,
      revokedBy,
      reason || "Revoked from signing session service",
      tx,
    );
  });

  return {
    revokedAt: now.toISOString(),
    revokedSessions: revokedSessionIds.length,
    documentId,
  };
}
