import { getPrisma } from "@/lib/server/prisma";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";
import {
  extractContactDetails,
  normalizePhoneNumber,
  normalizeRecipientEmail,
} from "@/lib/server/workspace-consent-helpers";

export type ResolvedRecipient = {
  mobile?: string;
  email?: string;
};

export class RecipientResolverError extends Error {
  public readonly code: string;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "RecipientResolverError";
    this.code = code;
    if (options?.cause) {
      (this as unknown as Record<string, unknown>).cause = options.cause;
    }
  }
}

const inMemoryStore = new Map<string, ResolvedRecipient>();

function storeKey(tenantId: string, reference: string): string {
  return `${tenantId}:${reference}`;
}

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function guardTestOnly(operation: string): void {
  if (!isTestEnvironment()) {
    throw new Error(`${operation} is only available when NODE_ENV === "test"`);
  }
}

/**
 * Register a resolved recipient in the in-memory resolver (tests only).
 */
export function registerTestRecipient(
  tenantId: string,
  reference: string,
  contact: ResolvedRecipient,
): void {
  guardTestOnly("registerTestRecipient");
  inMemoryStore.set(storeKey(tenantId, reference), contact);
}

/**
 * Clear all test registrations.
 */
export function clearTestRecipients(): void {
  guardTestOnly("clearTestRecipients");
  inMemoryStore.clear();
}

function parseReference(reference: string): {
  kind: string;
  referenceId: string;
  channelHint: string;
} {
  const parts = reference.split(":");
  return {
    kind: parts[0] || "",
    referenceId: parts[1] || "",
    channelHint: parts[2] || "",
  };
}

function contactsFromCaseMetadata(metadata: unknown): ResolvedRecipient {
  const { mobileNumber, email } = extractContactDetails(metadata);
  return {
    mobile: mobileNumber ? normalizePhoneNumber(mobileNumber) : undefined,
    email: email ? normalizeRecipientEmail(email) : undefined,
  };
}

function pickChannel(
  contacts: ResolvedRecipient,
  channelHint: string,
): ResolvedRecipient | null {
  if (channelHint === "mobile") {
    return contacts.mobile ? { mobile: contacts.mobile } : null;
  }
  if (channelHint === "email") {
    return contacts.email ? { email: contacts.email } : null;
  }
  return contacts;
}

/**
 * Resolve the canonical tenant-scoped contact for a case from the case
 * metadata. This is the same source used by the direct consent workflow
 * helpers to produce the mobile/email before enqueueing a signing link.
 */
export async function resolveCanonicalCaseContact(args: {
  tenantId: string;
  caseId: string;
}): Promise<ResolvedRecipient | null> {
  try {
    const prisma = getPrisma();
    const caseRecord = await prisma.case.findFirst({
      where: { id: args.caseId, tenantId: args.tenantId },
      select: { metadata: true },
    });

    if (!caseRecord) return null;

    return contactsFromCaseMetadata(caseRecord.metadata);
  } catch (error) {
    logRuntimeIncident({
      module: "recipient-resolution",
      type: "DB_FAILURE",
      operation: "resolveCanonicalCaseContact",
      tenantId: args.tenantId,
      error: error instanceof Error ? error : new Error(String(error)),
      details: { caseId: args.caseId },
    });
    throw new RecipientResolverError(
      "Canonical case contact resolver database unavailable",
      "RESOLVER_UNAVAILABLE",
      { cause: error },
    );
  }
}

/**
 * Resolve a recipient reference to a plaintext mobile/email.
 *
 * Resolution is tenant-scoped and fails closed. The in-memory test registry
 * is consulted only in test mode and never overrides the database in
 * production. The canonical contact source is the case metadata; document
 * metadata is no longer used as a fallback. Plaintext is never persisted by
 * this service.
 */
export async function resolveRecipient(args: {
  tenantId: string;
  reference: string;
}): Promise<ResolvedRecipient | null> {
  const { kind, referenceId, channelHint } = parseReference(args.reference);

  // In test mode the in-memory registry may be used for deterministic,
  // database-free unit tests.
  if (isTestEnvironment()) {
    const key = storeKey(args.tenantId, args.reference);
    const inMemory = inMemoryStore.get(key);
    if (inMemory) return inMemory;

    const disableDb = process.env.RECIPIENT_RESOLVER_DISABLE_DB === "true";
    if (disableDb) return null;
  }

  // In production the disable flag is ignored safely so resolution never
  // bypasses the database.
  if (isProduction() && process.env.RECIPIENT_RESOLVER_DISABLE_DB === "true") {
    logRuntimeIncident({
      module: "recipient-resolution",
      type: "UNHANDLED_EXCEPTION",
      operation: "resolveRecipient",
      tenantId: args.tenantId,
      error: new Error("RECIPIENT_RESOLVER_DISABLE_DB ignored in production"),
      details: { referenceKind: kind, channelHint },
    });
  }

  if (kind === "case" && referenceId) {
    const contacts = await resolveCanonicalCaseContact({
      tenantId: args.tenantId,
      caseId: referenceId,
    });
    if (!contacts) return null;
    return pickChannel(contacts, channelHint);
  }

  if (kind === "consent_document" && referenceId) {
    try {
      const prisma = getPrisma();
      const doc = await prisma.consentDocument.findFirst({
        where: { id: referenceId, tenantId: args.tenantId },
        select: { case: { select: { metadata: true } } },
      });

      if (!doc?.case) return null;

      const contacts = contactsFromCaseMetadata(doc.case.metadata);
      return pickChannel(contacts, channelHint);
    } catch (error) {
      logRuntimeIncident({
        module: "recipient-resolution",
        type: "DB_FAILURE",
        operation: "resolveRecipient",
        tenantId: args.tenantId,
        error: error instanceof Error ? error : new Error(String(error)),
        details: { referenceKind: kind, channelHint },
      });
      throw new RecipientResolverError(
        "Recipient resolver database unavailable",
        "RESOLVER_UNAVAILABLE",
        { cause: error },
      );
    }
  }

  return null;
}
