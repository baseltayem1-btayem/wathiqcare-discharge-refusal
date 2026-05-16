import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

type WordingLifecycleStatus =
  | "DRAFT"
  | "PENDING_LEGAL_REVIEW"
  | "PENDING_MEDICAL_REVIEW"
  | "PENDING_COMPLIANCE_REVIEW"
  | "APPROVED"
  | "ACTIVE"
  | "RETIRED";

export type WordingGovernanceRecord = {
  wordingId: string;
  wordingType: string;
  language: string;
  title: string;
  bodyAr: string;
  bodyEn: string;
  status: WordingLifecycleStatus;
  version: string;
  effectiveFrom: string | null;
  retiredAt: string | null;
  createdBy: string | null;
  approvedByLegal: string | null;
  approvedByMedical: string | null;
  approvedByCompliance: string | null;
  approvedAtLegal: string | null;
  approvedAtMedical: string | null;
  approvedAtCompliance: string | null;
  immutableSnapshotHash: string;
  createdAt: string;
  updatedAt: string;
  comments: Array<{ reviewerId: string; stage: string; comment: string; timestamp: string }>;
};

function requireTenantId(auth: AuthContext): string {
  const tenantId = (auth.tenant_id || "").trim();
  if (!tenantId) throw new ApiError(400, "Missing tenant context");
  return tenantId;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function computeImmutableHash(input: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asComments(value: unknown): Array<{ reviewerId: string; stage: string; comment: string; timestamp: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        reviewerId: normalizeText(record.reviewerId),
        stage: normalizeText(record.stage),
        comment: normalizeText(record.comment),
        timestamp: normalizeText(record.timestamp),
      };
    });
}

function mapLifecycle(record: {
  id: string;
  wordingType: string;
  wordingAr: string;
  wordingEn: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  metadata: unknown;
}): WordingGovernanceRecord {
  const metadata = asRecord(record.metadata);
  const approvals = asRecord(metadata.approvals);
  const lifecycle = asRecord(metadata.lifecycle);

  const title = normalizeText(metadata.title || `${record.wordingType} wording`);
  const language = normalizeText(metadata.language || "bilingual");
  const version = normalizeText(metadata.version || "1.0.0");
  const status = normalizeText(lifecycle.status || (record.isActive ? "ACTIVE" : "DRAFT")) as WordingLifecycleStatus;

  const immutableSnapshotHash =
    normalizeText(metadata.immutableSnapshotHash) ||
    computeImmutableHash({
      wordingType: record.wordingType,
      wordingAr: record.wordingAr,
      wordingEn: record.wordingEn,
      version,
    });

  return {
    wordingId: record.id,
    wordingType: record.wordingType,
    language,
    title,
    bodyAr: record.wordingAr,
    bodyEn: record.wordingEn,
    status,
    version,
    effectiveFrom: normalizeText(lifecycle.effectiveFrom) || null,
    retiredAt: normalizeText(lifecycle.retiredAt) || null,
    createdBy: normalizeText(lifecycle.createdBy) || null,
    approvedByLegal: normalizeText(approvals.approvedByLegal) || null,
    approvedByMedical: normalizeText(approvals.approvedByMedical) || null,
    approvedByCompliance: normalizeText(approvals.approvedByCompliance) || null,
    approvedAtLegal: normalizeText(approvals.approvedAtLegal) || null,
    approvedAtMedical: normalizeText(approvals.approvedAtMedical) || null,
    approvedAtCompliance: normalizeText(approvals.approvedAtCompliance) || null,
    immutableSnapshotHash,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    comments: asComments(metadata.comments),
  };
}

async function appendAudit(args: {
  tenantId: string;
  auth: AuthContext;
  wordingId: string;
  action: string;
  details: string;
  metadata: Prisma.InputJsonValue;
  request?: NextRequest;
}) {
  await writeAuditLog({
    tenantId: args.tenantId,
    userId: args.auth.sub,
    entityType: "consent_wording_governance",
    entityId: args.wordingId,
    action: args.action,
    details: args.details,
    moduleKey: "informed-consents",
    metadataJson: args.metadata as Prisma.InputJsonValue,
    request: args.request,
  });
}

export async function listWordingGovernance(auth: AuthContext): Promise<{ rows: WordingGovernanceRecord[] }> {
  const tenantId = requireTenantId(auth);
  const rows = await prisma().consentWordingRepository.findMany({
    where: { tenantId },
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
  });

  return {
    rows: rows.map((item) =>
      mapLifecycle({
        id: item.id,
        wordingType: item.wordingType,
        wordingAr: item.wordingAr,
        wordingEn: item.wordingEn,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        approvedByUserId: item.approvedByUserId,
        approvedAt: item.approvedAt,
        metadata: item.metadata,
      }),
    ),
  };
}

export async function createWordingDraft(
  auth: AuthContext,
  payload: {
    wordingType?: string;
    language?: string;
    title?: string;
    bodyAr?: string;
    bodyEn?: string;
    specialty?: string;
    consentType?: string;
    procedureKey?: string;
    version?: string;
  },
  request?: NextRequest,
): Promise<WordingGovernanceRecord> {
  const tenantId = requireTenantId(auth);
  const wordingType = normalizeText(payload.wordingType).toUpperCase();
  const bodyAr = normalizeText(payload.bodyAr);
  const bodyEn = normalizeText(payload.bodyEn);

  if (!wordingType || !bodyAr || !bodyEn) {
    throw new ApiError(400, "wordingType, bodyAr and bodyEn are required");
  }

  const metadata = {
    language: normalizeText(payload.language || "bilingual"),
    title: normalizeText(payload.title || `${wordingType} Draft`),
    version: normalizeText(payload.version || "1.0.0"),
    immutableSnapshotHash: computeImmutableHash({ wordingType, bodyAr, bodyEn, version: payload.version || "1.0.0" }),
    approvals: {
      approvedByLegal: null,
      approvedByMedical: null,
      approvedByCompliance: null,
      approvedAtLegal: null,
      approvedAtMedical: null,
      approvedAtCompliance: null,
    },
    lifecycle: {
      status: "DRAFT",
      createdBy: auth.sub,
      effectiveFrom: null,
      retiredAt: null,
    },
    comments: [],
  };

  const row = await prisma().consentWordingRepository.create({
    data: {
      tenantId,
      specialty: normalizeText(payload.specialty || "GENERAL_MEDICINE").toUpperCase(),
      consentType: normalizeText(payload.consentType || "GENERAL_CONSENT").toUpperCase(),
      procedureKey: normalizeText(payload.procedureKey) || null,
      wordingType,
      wordingAr: bodyAr,
      wordingEn: bodyEn,
      isActive: false,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await appendAudit({
    tenantId,
    auth,
    wordingId: row.id,
    action: "wording_draft_created",
    details: `Draft wording created for ${wordingType}`,
    metadata,
    request,
  });

  return mapLifecycle({
    id: row.id,
    wordingType: row.wordingType,
    wordingAr: row.wordingAr,
    wordingEn: row.wordingEn,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    approvedByUserId: row.approvedByUserId,
    approvedAt: row.approvedAt,
    metadata: row.metadata,
  });
}

export async function progressWordingReview(
  auth: AuthContext,
  payload: {
    wordingId?: string;
    stage?: "LEGAL" | "MEDICAL" | "COMPLIANCE";
    decision?: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
    comment?: string;
  },
  request?: NextRequest,
): Promise<WordingGovernanceRecord> {
  const tenantId = requireTenantId(auth);
  const wordingId = normalizeText(payload.wordingId);
  const stage = normalizeText(payload.stage).toUpperCase() as "LEGAL" | "MEDICAL" | "COMPLIANCE";
  const decision = normalizeText(payload.decision).toUpperCase() as "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";

  if (!wordingId || !stage || !decision) {
    throw new ApiError(400, "wordingId, stage and decision are required");
  }

  const row = await prisma().consentWordingRepository.findFirst({ where: { id: wordingId, tenantId } });
  if (!row) throw new ApiError(404, "Wording entry not found");

  const metadata = asRecord(row.metadata);
  const approvals = asRecord(metadata.approvals);
  const lifecycle = asRecord(metadata.lifecycle);
  const comments = asComments(metadata.comments);

  const now = new Date().toISOString();
  const nextStatusByStage: Record<typeof stage, WordingLifecycleStatus> = {
    LEGAL: "PENDING_MEDICAL_REVIEW",
    MEDICAL: "PENDING_COMPLIANCE_REVIEW",
    COMPLIANCE: "APPROVED",
  };

  if (decision !== "APPROVED") {
    lifecycle.status = "DRAFT";
  } else {
    lifecycle.status = nextStatusByStage[stage];
  }

  if (stage === "LEGAL") {
    approvals.approvedByLegal = decision === "APPROVED" ? auth.sub : null;
    approvals.approvedAtLegal = decision === "APPROVED" ? now : null;
  }
  if (stage === "MEDICAL") {
    approvals.approvedByMedical = decision === "APPROVED" ? auth.sub : null;
    approvals.approvedAtMedical = decision === "APPROVED" ? now : null;
  }
  if (stage === "COMPLIANCE") {
    approvals.approvedByCompliance = decision === "APPROVED" ? auth.sub : null;
    approvals.approvedAtCompliance = decision === "APPROVED" ? now : null;
  }

  comments.push({
    reviewerId: auth.sub,
    stage,
    comment: normalizeText(payload.comment) || `${stage} review ${decision}`,
    timestamp: now,
  });

  const updated = await prisma().consentWordingRepository.update({
    where: { id: wordingId },
    data: {
      metadata: {
        ...metadata,
        approvals,
        lifecycle,
        comments,
      } as Prisma.InputJsonValue,
    },
  });

  await appendAudit({
    tenantId,
    auth,
    wordingId,
    action: "wording_review_progressed",
    details: `${stage} review: ${decision}`,
    metadata: { stage, decision, comment: normalizeText(payload.comment) || null },
    request,
  });

  return mapLifecycle({
    id: updated.id,
    wordingType: updated.wordingType,
    wordingAr: updated.wordingAr,
    wordingEn: updated.wordingEn,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    approvedByUserId: updated.approvedByUserId,
    approvedAt: updated.approvedAt,
    metadata: updated.metadata,
  });
}

export async function activateWordingVersion(
  auth: AuthContext,
  payload: { wordingId?: string },
  request?: NextRequest,
): Promise<WordingGovernanceRecord> {
  const tenantId = requireTenantId(auth);
  const wordingId = normalizeText(payload.wordingId);
  if (!wordingId) throw new ApiError(400, "wordingId is required");

  const row = await prisma().consentWordingRepository.findFirst({ where: { id: wordingId, tenantId } });
  if (!row) throw new ApiError(404, "Wording entry not found");

  const metadata = asRecord(row.metadata);
  const approvals = asRecord(metadata.approvals);
  if (!approvals.approvedByLegal || !approvals.approvedByMedical || !approvals.approvedByCompliance) {
    throw new ApiError(409, "Cannot activate wording without legal, medical, and compliance approvals");
  }

  await prisma().consentWordingRepository.updateMany({
    where: {
      tenantId,
      wordingType: row.wordingType,
      consentType: row.consentType,
      specialty: row.specialty,
      isActive: true,
      NOT: { id: row.id },
    },
    data: {
      isActive: false,
      metadata: {
        ...(asRecord(row.metadata) || {}),
        lifecycle: {
          ...(asRecord(asRecord(row.metadata).lifecycle) || {}),
          status: "RETIRED",
          retiredAt: new Date().toISOString(),
        },
      } as Prisma.InputJsonValue,
    },
  });

  const updated = await prisma().consentWordingRepository.update({
    where: { id: wordingId },
    data: {
      isActive: true,
      approvedByUserId: auth.sub,
      approvedAt: new Date(),
      metadata: {
        ...metadata,
        lifecycle: {
          ...(asRecord(metadata.lifecycle) || {}),
          status: "ACTIVE",
          effectiveFrom: new Date().toISOString(),
        },
      } as Prisma.InputJsonValue,
    },
  });

  await appendAudit({
    tenantId,
    auth,
    wordingId,
    action: "wording_version_activated",
    details: "Wording version activated",
    metadata: { wordingType: row.wordingType },
    request,
  });

  return mapLifecycle({
    id: updated.id,
    wordingType: updated.wordingType,
    wordingAr: updated.wordingAr,
    wordingEn: updated.wordingEn,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    approvedByUserId: updated.approvedByUserId,
    approvedAt: updated.approvedAt,
    metadata: updated.metadata,
  });
}

export async function retireWordingVersion(
  auth: AuthContext,
  payload: { wordingId?: string },
  request?: NextRequest,
): Promise<WordingGovernanceRecord> {
  const tenantId = requireTenantId(auth);
  const wordingId = normalizeText(payload.wordingId);
  if (!wordingId) throw new ApiError(400, "wordingId is required");

  const row = await prisma().consentWordingRepository.findFirst({ where: { id: wordingId, tenantId } });
  if (!row) throw new ApiError(404, "Wording entry not found");

  const metadata = asRecord(row.metadata);
  const updated = await prisma().consentWordingRepository.update({
    where: { id: wordingId },
    data: {
      isActive: false,
      metadata: {
        ...metadata,
        lifecycle: {
          ...(asRecord(metadata.lifecycle) || {}),
          status: "RETIRED",
          retiredAt: new Date().toISOString(),
        },
      } as Prisma.InputJsonValue,
    },
  });

  await appendAudit({
    tenantId,
    auth,
    wordingId,
    action: "wording_version_retired",
    details: "Wording version retired",
    metadata: {},
    request,
  });

  return mapLifecycle({
    id: updated.id,
    wordingType: updated.wordingType,
    wordingAr: updated.wordingAr,
    wordingEn: updated.wordingEn,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    approvedByUserId: updated.approvedByUserId,
    approvedAt: updated.approvedAt,
    metadata: updated.metadata,
  });
}

export async function compareWordingVersions(
  auth: AuthContext,
  payload: { previousWordingId?: string; nextWordingId?: string },
): Promise<{
  previous: WordingGovernanceRecord;
  next: WordingGovernanceRecord;
  highlights: { arChanged: boolean; enChanged: boolean };
}> {
  const tenantId = requireTenantId(auth);
  const previousId = normalizeText(payload.previousWordingId);
  const nextId = normalizeText(payload.nextWordingId);

  if (!previousId || !nextId) {
    throw new ApiError(400, "previousWordingId and nextWordingId are required");
  }

  const [previousRow, nextRow] = await Promise.all([
    prisma().consentWordingRepository.findFirst({ where: { id: previousId, tenantId } }),
    prisma().consentWordingRepository.findFirst({ where: { id: nextId, tenantId } }),
  ]);

  if (!previousRow || !nextRow) {
    throw new ApiError(404, "Wording version not found");
  }

  const previous = mapLifecycle({
    id: previousRow.id,
    wordingType: previousRow.wordingType,
    wordingAr: previousRow.wordingAr,
    wordingEn: previousRow.wordingEn,
    isActive: previousRow.isActive,
    createdAt: previousRow.createdAt,
    updatedAt: previousRow.updatedAt,
    approvedByUserId: previousRow.approvedByUserId,
    approvedAt: previousRow.approvedAt,
    metadata: previousRow.metadata,
  });

  const next = mapLifecycle({
    id: nextRow.id,
    wordingType: nextRow.wordingType,
    wordingAr: nextRow.wordingAr,
    wordingEn: nextRow.wordingEn,
    isActive: nextRow.isActive,
    createdAt: nextRow.createdAt,
    updatedAt: nextRow.updatedAt,
    approvedByUserId: nextRow.approvedByUserId,
    approvedAt: nextRow.approvedAt,
    metadata: nextRow.metadata,
  });

  return {
    previous,
    next,
    highlights: {
      arChanged: previous.bodyAr !== next.bodyAr,
      enChanged: previous.bodyEn !== next.bodyEn,
    },
  };
}
