import crypto from "node:crypto";
import { Prisma, PrismaClient, PatientMessageChannel, PatientMessageStatus } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";
import { buildSecureSigningLinkSms } from "@/services/sms/smsTemplates";
import {
  generateSigningToken,
  buildSigningUrl,
} from "@/lib/server/signing-token-service";
import { resolveRecipient } from "@/lib/server/recipient-resolution-service";
import { markSessionSentIfPending } from "@/lib/server/signing-session-service";
import { hashRecipient } from "@/lib/server/idempotency-core";
import {
  normalizePhoneNumber,
  normalizeRecipientEmail,
} from "@/lib/server/workspace-consent-helpers";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";

const prisma = () => getPrisma();

const CLAIM_LEASE_SECONDS = 60;
const MAX_BATCH_SIZE = 100;
const MAX_BACKOFF_SECONDS = 3600;
const BASE_BACKOFF_SECONDS = 15;
const MAX_ERROR_MESSAGE_LENGTH = 500;

export type SmsGateway = {
  send(args: {
    recipient: string;
    message: string;
    idempotencyKey?: string;
  }): Promise<{
    ok: boolean;
    providerMessageId?: string | null;
    errorCode?: string;
    errorMessage?: string;
  }>;
};

export type EmailGateway = {
  send(args: {
    recipient: string;
    subject: string;
    html: string;
    text: string;
    idempotencyKey?: string;
  }): Promise<{
    ok: boolean;
    providerMessageId?: string | null;
    errorCode?: string;
    errorMessage?: string;
  }>;
};

export type MessageGateway = SmsGateway | EmailGateway;

export type CreateDispatchInput = {
  tenantId: string;
  signingSessionId: string;
  channel: PatientMessageChannel;
  idempotencyKey: string;
  idempotencyFingerprint: string;
  recipientHash: string;
  recipientReference: string;
  templateKey: string;
  locale: "ar" | "en";
  signerRole: string;
  expiresAt: Date;
  maxAttempts?: number;
  nextAttemptAt?: Date;
};

export type ClaimedDispatch = {
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

function computeBackoffSeconds(attemptCount: number): number {
  const exponential = BASE_BACKOFF_SECONDS * 2 ** Math.max(0, attemptCount - 1);
  return Math.min(exponential, MAX_BACKOFF_SECONDS);
}

export function isPermanentError(
  errorCode?: string | null,
  errorMessage?: string | null,
): boolean {
  if (!errorCode && !errorMessage) return false;
  const text = `${errorCode || ""} ${errorMessage || ""}`.toLowerCase();
  const permanentCodes = [
    "invalid_recipient",
    "invalid_number",
    "invalid_email",
    "authentication_failed",
    "unauthorized",
    "forbidden",
    "unknown_provider",
    "provider_not_configured",
    "bad_request",
    "resolver_not_found",
    "recipient_not_found",
  ];
  return permanentCodes.some((code) => text.includes(code));
}

function sanitizeErrorMessage(message?: string | null): string | null {
  if (!message) return null;
  const redacted = message
    .replace(/https?:\/\/[^\s]+/gi, "[REDACTED_URL]")
    .replace(/v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]")
    .replace(/\+?\d[\d\s\-()]{6,}\d/g, "[REDACTED_RECIPIENT]")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[REDACTED_EMAIL]");
  return redacted.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function buildDispatchMetadata(input: CreateDispatchInput): Record<string, unknown> {
  return {
    templateKey: input.templateKey,
    locale: input.locale,
    signingSessionId: input.signingSessionId,
    signerRole: input.signerRole,
    expiresAt: input.expiresAt.toISOString(),
    recipientReference: input.recipientReference,
  };
}

export async function createPatientMessageDispatch(
  input: CreateDispatchInput,
  tx?: Prisma.TransactionClient,
): Promise<{ id: string; status: PatientMessageStatus }> {
  const client = tx ?? prisma();

  const existing = await client.patientMessageDispatch.findUnique({
    where: {
      tenantId_signingSessionId_channel_idempotencyKey: {
        tenantId: input.tenantId,
        signingSessionId: input.signingSessionId,
        channel: input.channel,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });

  if (existing) {
    if (existing.idempotencyFingerprint !== input.idempotencyFingerprint) {
      throw new Error("IDEMPOTENCY_CONFLICT");
    }
    return { id: existing.id, status: existing.status };
  }

  const dispatch = await client.patientMessageDispatch.create({
    data: {
      tenantId: input.tenantId,
      signingSessionId: input.signingSessionId,
      channel: input.channel,
      idempotencyKey: input.idempotencyKey,
      idempotencyFingerprint: input.idempotencyFingerprint,
      recipientHash: input.recipientHash,
      recipientReference: input.recipientReference,
      status: PatientMessageStatus.PENDING,
      attemptCount: 0,
      maxAttempts: input.maxAttempts ?? 5,
      nextAttemptAt: input.nextAttemptAt ?? new Date(),
      metadata: buildDispatchMetadata(input) as Prisma.InputJsonValue,
    },
  });

  return { id: dispatch.id, status: dispatch.status };
}

/**
 * Atomically claim the next eligible dispatch for processing.
 * Uses SELECT FOR UPDATE SKIP LOCKED inside a CTE to avoid duplicate work.
 */
export async function claimDispatchForProcessing(
  tenantId: string,
  now: Date,
  channel?: PatientMessageChannel,
  client?: PrismaClient,
): Promise<ClaimedDispatch | null> {
  const db = client ?? prisma();
  const leaseExpiresAt = new Date(now.getTime() + CLAIM_LEASE_SECONDS * 1000);
  const channelFilter = channel ?? null;

  const rows = await db.$queryRaw<
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
  >(
    Prisma.sql`
    WITH next_dispatch AS (
      SELECT id
      FROM patient_message_dispatches
      WHERE tenant_id = ${tenantId}
        AND (${channelFilter}::text IS NULL OR channel = ${channelFilter}::"PatientMessageChannel")
        AND (
          (status = 'PENDING' AND next_attempt_at <= ${now})
          OR (status = 'FAILED' AND next_attempt_at <= ${now})
          OR (status = 'CLAIMED' AND claim_expires_at <= ${now})
        )
      ORDER BY next_attempt_at ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE patient_message_dispatches d
    SET status = 'CLAIMED',
        claimed_at = ${now},
        claim_expires_at = ${leaseExpiresAt},
        attempt_count = attempt_count + 1,
        last_attempt_at = ${now}
    FROM next_dispatch
    WHERE d.id = next_dispatch.id
    RETURNING d.id, d.channel, d.tenant_id, d.signing_session_id,
              d.recipient_reference, d.metadata ->> 'templateKey' AS template_key,
              d.metadata ->> 'locale' AS locale,
              d.metadata ->> 'signerRole' AS signer_role,
              (d.metadata ->> 'expiresAt')::timestamptz AS expires_at,
              d.recipient_hash
    `,
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    channel: row.channel,
    tenantId: row.tenant_id,
    signingSessionId: row.signing_session_id,
    recipientReference: row.recipient_reference,
    templateKey: row.template_key,
    locale: row.locale as "ar" | "en",
    signerRole: row.signer_role,
    expiresAt: row.expires_at,
    recipientHash: row.recipient_hash,
  };
}

function statusGuard(
  current: PatientMessageStatus,
  expected: PatientMessageStatus | PatientMessageStatus[],
): void {
  const expectedSet = Array.isArray(expected) ? expected : [expected];
  if (!expectedSet.includes(current)) {
    throw new Error(
      `Invalid status transition from ${current} to ${expectedSet.join("/")}`,
    );
  }
}

const IDEMPOTENT_ACCEPTED_STATUSES = [
  PatientMessageStatus.ACCEPTED,
  PatientMessageStatus.SENT,
  PatientMessageStatus.DELIVERED,
];

export async function recordDispatchAccepted(
  dispatchId: string,
  providerMessageId?: string | null,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const db = client ?? prisma();
  const acceptedAt = new Date();

  // First, durably persist the provider acceptance with an expected-state update.
  // Only PENDING/CLAIMED/FAILED rows may transition; an already-accepted row is
  // left untouched and treated as an idempotent success. This update is never
  // wrapped in a transaction with the SigningSession promotion, because a
  // session reconciliation failure must never roll back a provider acceptance.
  const result = await db.patientMessageDispatch.updateMany({
    where: {
      id: dispatchId,
      status: {
        in: [
          PatientMessageStatus.PENDING,
          PatientMessageStatus.CLAIMED,
          PatientMessageStatus.FAILED,
        ],
      },
    },
    data: {
      status: PatientMessageStatus.ACCEPTED,
      acceptedAt,
      ...(providerMessageId ? { providerMessageId } : {}),
    },
  });

  if (result.count === 1) {
    const dispatch = await db.patientMessageDispatch.findUnique({
      where: { id: dispatchId },
      select: { tenantId: true, signingSessionId: true },
    });

    if (dispatch) {
      try {
        // Use the passed client when it looks like a real Prisma client (it has
        // $transaction); otherwise fall back to the default prisma instance.
        const sessionClient =
          client && "$transaction" in client && typeof (client as PrismaClient).$transaction === "function"
            ? (client as PrismaClient)
            : prisma();
        await markSessionSentIfPending(
          dispatch.tenantId,
          dispatch.signingSessionId,
          sessionClient,
        );
      } catch (sessionError) {
        logRuntimeIncident({
          module: "patient_message_outbox",
          type: "UNHANDLED_EXCEPTION",
          operation: "recordDispatchAccepted",
          tenantId: dispatch.tenantId,
          error:
            sessionError instanceof Error
              ? sessionError
              : new Error(String(sessionError)),
          details: {
            dispatchId,
            reason: "session_reconciliation_failed_after_provider_acceptance",
          },
        });
      }
    }
    return;
  }

  // No row was updated. Verify that the dispatch is already in a terminal sent
  // state and treat the call as idempotent; otherwise the status is unexpected.
  const dispatch = await db.patientMessageDispatch.findUnique({
    where: { id: dispatchId },
  });
  if (!dispatch) return;
  if (
    (IDEMPOTENT_ACCEPTED_STATUSES as PatientMessageStatus[]).includes(
      dispatch.status,
    )
  ) {
    return;
  }
  throw new Error(
    `Invalid status transition from ${dispatch.status} to ACCEPTED`,
  );
}

export async function recordDispatchSent(
  dispatchId: string,
  providerMessageId?: string | null,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const db = client ?? prisma();
  const dispatch = await db.patientMessageDispatch.findUnique({
    where: { id: dispatchId },
  });
  if (!dispatch) return;
  statusGuard(dispatch.status, [PatientMessageStatus.ACCEPTED]);

  await db.patientMessageDispatch.update({
    where: { id: dispatchId },
    data: {
      status: PatientMessageStatus.SENT,
      sentAt: new Date(),
      providerMessageId: providerMessageId ?? dispatch.providerMessageId,
    },
  });
}

export async function recordDispatchDelivered(
  dispatchId: string,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const db = client ?? prisma();
  const dispatch = await db.patientMessageDispatch.findUnique({
    where: { id: dispatchId },
  });
  if (!dispatch) return;
  statusGuard(dispatch.status, [PatientMessageStatus.ACCEPTED, PatientMessageStatus.SENT]);

  await db.patientMessageDispatch.update({
    where: { id: dispatchId },
    data: {
      status: PatientMessageStatus.DELIVERED,
      deliveredAt: dispatch.deliveredAt ?? new Date(),
    },
  });
}

export async function recordDispatchFailed(
  dispatchId: string,
  errorCode: string,
  errorMessage: string,
  client?: PrismaClient | Prisma.TransactionClient,
  now?: Date,
): Promise<void> {
  const db = client ?? prisma();
  const referenceTime = now ?? new Date();

  const dispatch = await db.patientMessageDispatch.findUnique({
    where: { id: dispatchId },
  });
  if (!dispatch) return;
  statusGuard(dispatch.status, [
    PatientMessageStatus.PENDING,
    PatientMessageStatus.CLAIMED,
    PatientMessageStatus.FAILED,
  ]);

  const permanent = isPermanentError(errorCode, errorMessage);
  const exhausted = dispatch.attemptCount >= dispatch.maxAttempts;
  const nextStatus =
    permanent || exhausted
      ? PatientMessageStatus.PERMANENT_FAILURE
      : PatientMessageStatus.FAILED;

  const nextAttemptAt =
    nextStatus === PatientMessageStatus.FAILED
      ? new Date(
          referenceTime.getTime() +
            computeBackoffSeconds(dispatch.attemptCount) * 1000,
        )
      : dispatch.nextAttemptAt;

  await db.patientMessageDispatch.update({
    where: { id: dispatchId },
    data: {
      status: nextStatus,
      lastErrorCode: errorCode,
      lastErrorMessage: sanitizeErrorMessage(errorMessage),
      nextAttemptAt,
    },
  });
}

export async function recordDispatchPermanentFailure(
  dispatchId: string,
  errorCode: string,
  errorMessage: string,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const db = client ?? prisma();
  const dispatch = await db.patientMessageDispatch.findUnique({
    where: { id: dispatchId },
  });
  if (!dispatch) return;
  statusGuard(dispatch.status, [
    PatientMessageStatus.PENDING,
    PatientMessageStatus.CLAIMED,
    PatientMessageStatus.FAILED,
  ]);

  await db.patientMessageDispatch.update({
    where: { id: dispatchId },
    data: {
      status: PatientMessageStatus.PERMANENT_FAILURE,
      lastErrorCode: errorCode,
      lastErrorMessage: sanitizeErrorMessage(errorMessage),
    },
  });
}

function verifyResolvedRecipientHash(args: {
  tenantId: string;
  channel: PatientMessageChannel;
  resolved: { mobile?: string; email?: string };
  recipientHash: string;
}): { ok: boolean; error?: string } {
  const address =
    args.channel === PatientMessageChannel.SMS
      ? normalizePhoneNumber(args.resolved.mobile || "")
      : normalizeRecipientEmail(args.resolved.email || "");

  if (!address) {
    return { ok: false, error: `No ${args.channel.toLowerCase()} address resolved` };
  }

  const recomputed = hashRecipient(address, { tenantId: args.tenantId });
  const expected = Buffer.from(args.recipientHash, "utf8");
  const actual = Buffer.from(recomputed, "utf8");

  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return { ok: false, error: "Resolved recipient hash does not match dispatch fingerprint" };
  }

  return { ok: true };
}

function buildMessage(args: {
  channel: PatientMessageChannel;
  templateKey: string;
  locale: "ar" | "en";
  signingUrl: string;
  expiresAt: Date;
}): { subject?: string; html?: string; text: string } {
  const expiresMinutes = Math.max(
    1,
    Math.round((args.expiresAt.getTime() - Date.now()) / 60000),
  );

  if (args.channel === PatientMessageChannel.SMS) {
    return {
      text: buildSecureSigningLinkSms({
        signingUrl: args.signingUrl,
        expiresMinutes,
        locale: args.locale,
      }),
    };
  }

  const isAr = args.locale === "ar";
  const text = isAr
    ? `استخدم هذا الرابط للتوقيع: ${args.signingUrl}`
    : `Use this link to sign: ${args.signingUrl}`;
  return {
    subject: isAr ? "رابط التوقيع الآمن" : "Secure Signing Link",
    html: `<p>${text}</p>`,
    text,
  };
}

/**
 * Process eligible outbox dispatches.
 *
 * Note on provider-side idempotency: the gateway receives the dispatch id as an
 * idempotency key, but the ACCEPTED status is recorded in a separate database
 * update. If the process crashes after the gateway accepts but before ACCEPTED
 * is persisted, the next claim will retry the same dispatch. The gateway must
 * therefore treat the dispatch id as an idempotent key and return the original
 * provider message id on replay.
 */
export async function processPendingDispatches(args: {
  tenantId: string;
  smsGateway?: SmsGateway;
  emailGateway?: EmailGateway;
  now?: Date;
  client?: PrismaClient;
}): Promise<{ processed: number }> {
  const { tenantId, smsGateway, emailGateway, now = new Date(), client } = args;
  let processed = 0;

  for (let iteration = 0; iteration < MAX_BATCH_SIZE; iteration += 1) {
    // Refresh the claim time each iteration. When the caller supplies a fixed
    // clock (tests), advance it slightly so leases/backoff remain deterministic.
    const iterationNow = args.now
      ? new Date(args.now.getTime() + iteration)
      : new Date();
    const claim = await claimDispatchForProcessing(tenantId, iterationNow, undefined, client);
    if (!claim) break;

    processed += 1;

    try {
      const resolved = await resolveRecipient({
        tenantId: claim.tenantId,
        reference: claim.recipientReference,
      });

      if (!resolved) {
        await recordDispatchFailed(
          claim.id,
          "RECIPIENT_NOT_FOUND",
          "Recipient resolver returned no contact for reference",
          client,
          iterationNow,
        );
        continue;
      }

      const hashCheck = verifyResolvedRecipientHash({
        tenantId: claim.tenantId,
        channel: claim.channel,
        resolved,
        recipientHash: claim.recipientHash,
      });

      if (!hashCheck.ok) {
        await recordDispatchPermanentFailure(
          claim.id,
          "RECIPIENT_HASH_MISMATCH",
          hashCheck.error || "Resolved recipient hash mismatch",
          client,
        );
        continue;
      }

      const token = generateSigningToken({
        tenantId: claim.tenantId,
        sessionId: claim.signingSessionId,
        signerRole: claim.signerRole,
        expiresAt: claim.expiresAt,
      });
      const signingUrl = buildSigningUrl(token);

      if (claim.channel === PatientMessageChannel.SMS && smsGateway) {
        const message = buildMessage({
          channel: claim.channel,
          templateKey: claim.templateKey,
          locale: claim.locale,
          signingUrl,
          expiresAt: claim.expiresAt,
        });
        const result = await smsGateway.send({
          recipient: resolved.mobile as string,
          message: message.text,
          idempotencyKey: claim.id,
        });

        if (!result.ok) {
          await recordDispatchFailed(
            claim.id,
            result.errorCode || "SMS_GATEWAY_FAILED",
            result.errorMessage || "SMS gateway returned failure",
            client,
            iterationNow,
          );
          continue;
        }

        try {
          await recordDispatchAccepted(claim.id, result.providerMessageId, client);
        } catch (acceptError) {
          logRuntimeIncident({
            module: "patient_message_outbox",
            type: "UNHANDLED_EXCEPTION",
            operation: "processPendingDispatches",
            tenantId: claim.tenantId,
            error: acceptError instanceof Error ? acceptError : new Error(String(acceptError)),
            details: { dispatchId: claim.id, reason: "reconciliation_failed_after_provider_acceptance" },
          });
        }
        continue;
      } else if (claim.channel === PatientMessageChannel.EMAIL && emailGateway) {
        const message = buildMessage({
          channel: claim.channel,
          templateKey: claim.templateKey,
          locale: claim.locale,
          signingUrl,
          expiresAt: claim.expiresAt,
        });
        const result = await emailGateway.send({
          recipient: resolved.email as string,
          subject: message.subject || "",
          html: message.html || "",
          text: message.text,
          idempotencyKey: claim.id,
        });

        if (!result.ok) {
          await recordDispatchFailed(
            claim.id,
            result.errorCode || "EMAIL_GATEWAY_FAILED",
            result.errorMessage || "Email gateway returned failure",
            client,
            iterationNow,
          );
          continue;
        }

        try {
          await recordDispatchAccepted(claim.id, result.providerMessageId, client);
        } catch (acceptError) {
          logRuntimeIncident({
            module: "patient_message_outbox",
            type: "UNHANDLED_EXCEPTION",
            operation: "processPendingDispatches",
            tenantId: claim.tenantId,
            error: acceptError instanceof Error ? acceptError : new Error(String(acceptError)),
            details: { dispatchId: claim.id, reason: "reconciliation_failed_after_provider_acceptance" },
          });
        }
        continue;
      } else {
        await recordDispatchFailed(
          claim.id,
          "GATEWAY_NOT_CONFIGURED",
          `No gateway configured for channel ${claim.channel}`,
          client,
          iterationNow,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await recordDispatchFailed(
        claim.id,
        "PROCESSING_EXCEPTION",
        message,
        client,
        iterationNow,
      );
    }
  }

  return { processed };
}

/**
 * Idempotent, atomic delivery callback state transition.
 *
 * Updates are guarded by expected current statuses (ACCEPTED/SENT), so a
 * duplicate or out-of-order callback is a no-op and the original deliveredAt
 * is preserved.
 */
export async function recordDeliveryCallback(args: {
  tenantId: string;
  channel: PatientMessageChannel;
  providerMessageId: string;
  status: "DELIVERED" | "SENT" | "ACCEPTED" | "FAILED";
  deliveredAt?: Date;
  client?: PrismaClient | Prisma.TransactionClient;
}): Promise<{ updated: boolean }> {
  const db = args.client ?? prisma();

  if (args.status !== "DELIVERED") {
    return { updated: false };
  }

  const deliveredAt = args.deliveredAt ?? new Date();

  const result = await db.patientMessageDispatch.updateMany({
    where: {
      tenantId: args.tenantId,
      channel: args.channel,
      providerMessageId: args.providerMessageId,
      status: {
        in: [PatientMessageStatus.ACCEPTED, PatientMessageStatus.SENT],
      },
    },
    data: {
      status: PatientMessageStatus.DELIVERED,
      deliveredAt,
    },
  });

  return { updated: result.count > 0 };
}
