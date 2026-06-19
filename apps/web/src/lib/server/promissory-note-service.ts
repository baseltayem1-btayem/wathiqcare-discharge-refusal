import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { PromissoryNoteStatus } from "@/lib/server/prisma-enums";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { writeAuditLog } from "@/lib/server/saas-services";

type ListPromissoryArgs = {
  caseId?: string;
  status?: string;
  limit?: number;
};

type CreatePromissoryPayload = {
  caseId?: string;
  debtorName?: string;
  debtorIdNumber?: string;
  issuerName?: string;
  amount?: number | string;
  currency?: string;
  dueDate?: string;
  documentVersion?: string;
  metadata?: Record<string, unknown>;
};

const prisma = () => getPrisma();

function requireTenantId(auth: AuthContext): string {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }
  return auth.tenant_id;
}

function normalizePromissoryStatus(value: string | null | undefined): PromissoryNoteStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return Object.values(PromissoryNoteStatus).includes(normalized as PromissoryNoteStatus)
    ? (normalized as PromissoryNoteStatus)
    : null;
}

function buildNoteNumber(): string {
  const prefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const tail = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `PN-${prefix}-${tail}`;
}

function hashPromissoryPayload(payload: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function parseAmount(value: number | string | undefined): Prisma.Decimal {
  if (value === undefined || value === null || value === "") {
    throw new ApiError(400, "amount is required");
  }

  const numeric = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ApiError(400, "amount must be a positive number");
  }

  return new Prisma.Decimal(numeric);
}

function parseDueDate(value: string | undefined): Date {
  if (!value) {
    throw new ApiError(400, "dueDate is required");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "dueDate is invalid");
  }

  return parsed;
}

export async function listTenantPromissoryNotes(auth: AuthContext, args: ListPromissoryArgs = {}) {
  const tenantId = requireTenantId(auth);
  const status = normalizePromissoryStatus(args.status);
  if (args.status && !status) {
    throw new ApiError(400, "Invalid status");
  }

  const take = Math.min(Math.max(args.limit ?? 50, 1), 200);

  return prisma().promissoryNote.findMany({
    where: {
      tenantId,
      ...(args.caseId ? { caseId: args.caseId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          patientName: true,
          patientIdNumber: true,
          medicalRecordNo: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function createTenantPromissoryNote(
  auth: AuthContext,
  payload: CreatePromissoryPayload,
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const caseId = payload.caseId?.trim();
  const debtorName = payload.debtorName?.trim();

  if (!caseId) {
    throw new ApiError(400, "caseId is required");
  }
  if (!debtorName) {
    throw new ApiError(400, "debtorName is required");
  }

  const caseRecord = await prisma().case.findFirst({
    where: { id: caseId, tenantId },
    select: {
      id: true,
      caseNumber: true,
      patientName: true,
      patientIdNumber: true,
      medicalRecordNo: true,
    },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  const amount = parseAmount(payload.amount);
  const dueDate = parseDueDate(payload.dueDate);
  const documentPayload: Record<string, unknown> = {
    caseId,
    debtorName,
    debtorIdNumber: payload.debtorIdNumber?.trim() || null,
    issuerName: payload.issuerName?.trim() || null,
    amount: amount.toString(),
    currency: payload.currency?.trim().toUpperCase() || "SAR",
    dueDate: dueDate.toISOString(),
    documentVersion: payload.documentVersion?.trim() || "1.0",
    metadata: payload.metadata ?? null,
  };

  const created = await prisma().promissoryNote.create({
    data: {
      tenantId,
      caseId,
      noteNumber: buildNoteNumber(),
      debtorName,
      debtorIdNumber: payload.debtorIdNumber?.trim() || null,
      issuerName: payload.issuerName?.trim() || null,
      amount,
      currency: payload.currency?.trim().toUpperCase() || "SAR",
      dueDate,
      status: PromissoryNoteStatus.ACTIVE,
      documentVersion: payload.documentVersion?.trim() || "1.0",
      documentHash: hashPromissoryPayload(documentPayload),
      metadata: (payload.metadata ?? documentPayload) as JsonInputValue,
    },
  });

  await writeAuditLog({
    tenantId,
    userId: auth.sub,
    entityType: "promissory_note",
    entityId: created.id,
    action: "promissory_note_created",
    details: `Promissory note ${created.noteNumber} created`,
    caseId,
    metadataJson: {
      noteNumber: created.noteNumber,
      amount: created.amount.toString(),
      currency: created.currency,
      dueDate: created.dueDate.toISOString(),
    },
    request,
  });

  await appendAuditChainEvent({
    tenantId,
    caseId,
    eventType: "PROMISSORY_NOTE_CREATED",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Promissory note created (${created.noteNumber})`,
    documentVersion: created.documentVersion,
    metadataJson: {
      promissoryNoteId: created.id,
      noteNumber: created.noteNumber,
      documentHash: created.documentHash,
    },
    request,
  }).catch(() => undefined);

  return {
    ...created,
    case: caseRecord,
  };
}

type UpdatePromissoryLifecyclePayload = {
  reason?: string;
  reference?: string;
  amount?: number | string;
  method?: string;
};

function normalizeLifecycleMetadata(payload: UpdatePromissoryLifecyclePayload = {}) {
  return {
    reason: payload.reason?.trim() || null,
    reference: payload.reference?.trim() || null,
    amount: payload.amount === undefined || payload.amount === null || payload.amount === "" ? null : String(payload.amount),
    method: payload.method?.trim() || null,
  };
}


function requireLifecycleTransitionAllowed(
  currentStatus: PromissoryNoteStatus,
  nextStatus: PromissoryNoteStatus,
  payload: UpdatePromissoryLifecyclePayload,
): void {
  if (currentStatus === PromissoryNoteStatus.SETTLED) {
    throw new ApiError(409, "Settled promissory notes cannot be modified or voided");
  }

  if (currentStatus === PromissoryNoteStatus.VOID) {
    throw new ApiError(409, "Voided promissory notes cannot be modified or settled");
  }

  if (nextStatus === PromissoryNoteStatus.VOID) {
    const reason = payload.reason?.trim();
    if (!reason) {
      throw new ApiError(400, "reason is required when voiding a promissory note");
    }
  }

  if (nextStatus === PromissoryNoteStatus.SETTLED) {
    const reference = payload.reference?.trim();
    const method = payload.method?.trim();
    const amount = payload.amount === undefined || payload.amount === null || payload.amount === "" ? null : Number(payload.amount);

    if (!reference) {
      throw new ApiError(400, "reference is required when settling a promissory note");
    }

    if (!method) {
      throw new ApiError(400, "method is required when settling a promissory note");
    }

    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, "amount must be a positive number when settling a promissory note");
    }
  }
}

async function updateTenantPromissoryLifecycleStatus(
  auth: AuthContext,
  noteId: string,
  status: PromissoryNoteStatus,
  action: string,
  auditEventType: string,
  payload: UpdatePromissoryLifecyclePayload = {},
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const id = noteId?.trim();

  if (!id) {
    throw new ApiError(400, "promissory note id is required");
  }

  const existing = await prisma().promissoryNote.findFirst({
    where: { id, tenantId },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          patientName: true,
          patientIdNumber: true,
          medicalRecordNo: true,
        },
      },
    },
  });

  if (!existing) {
    throw new ApiError(404, "Promissory note not found");
  }

  requireLifecycleTransitionAllowed(existing.status, status, payload);

  const lifecycleMetadata = normalizeLifecycleMetadata(payload);
  const previousMetadata =
    existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const updated = await prisma().promissoryNote.update({
    where: { id: existing.id },
    data: {
      status,
      metadata: {
        ...previousMetadata,
        lifecycle: {
          status,
          action,
          previousStatus: existing.status,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.sub,
          ...lifecycleMetadata,
        },
      } as JsonInputValue,
    },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          patientName: true,
          patientIdNumber: true,
          medicalRecordNo: true,
        },
      },
    },
  });

  await writeAuditLog({
    tenantId,
    userId: auth.sub,
    entityType: "promissory_note",
    entityId: updated.id,
    action,
    details: `Promissory note ${updated.noteNumber} updated to ${status}`,
    caseId: updated.caseId,
    metadataJson: {
      noteNumber: updated.noteNumber,
      previousStatus: existing.status,
      status,
      ...lifecycleMetadata,
    },
    request,
  });

  await appendAuditChainEvent({
    tenantId,
    caseId: updated.caseId,
    eventType: auditEventType,
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Promissory note ${updated.noteNumber} updated to ${status}`,
    documentVersion: updated.documentVersion,
    metadataJson: {
      promissoryNoteId: updated.id,
      noteNumber: updated.noteNumber,
      previousStatus: existing.status,
      status,
      ...lifecycleMetadata,
    },
    request,
  }).catch(() => undefined);

  return updated;
}

export async function settleTenantPromissoryNote(
  auth: AuthContext,
  noteId: string,
  payload: UpdatePromissoryLifecyclePayload = {},
  request?: NextRequest,
) {
  return updateTenantPromissoryLifecycleStatus(
    auth,
    noteId,
    PromissoryNoteStatus.SETTLED,
    "promissory_note_settled",
    "PROMISSORY_NOTE_SETTLED",
    payload,
    request,
  );
}

export async function cancelTenantPromissoryNote(
  auth: AuthContext,
  noteId: string,
  payload: UpdatePromissoryLifecyclePayload = {},
  request?: NextRequest,
) {
  return updateTenantPromissoryLifecycleStatus(
    auth,
    noteId,
    PromissoryNoteStatus.VOID,
    "promissory_note_voided",
    "PROMISSORY_NOTE_VOIDED",
    payload,
    request,
  );
}



