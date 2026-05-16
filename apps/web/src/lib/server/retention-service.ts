import { DataClassification, RetentionActionStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

export function calculateRetentionDueDate(createdAt: Date | string, retentionYears: number) {
  const source = new Date(createdAt);
  const due = new Date(source);
  due.setUTCFullYear(due.getUTCFullYear() + Math.max(1, retentionYears));
  return due;
}

export async function ensureDefaultRetentionPolicy(tenantId: string) {
  return prisma().retentionPolicy.upsert({
    where: {
      tenantId_recordCategory: {
        tenantId,
        recordCategory: "discharge_refusal_cases",
      },
    },
    update: {
      dataType: DataClassification.PATIENT_SENSITIVE,
      retentionYears: 10,
      legalHoldRequired: true,
      requiresLegalApproval: true,
      autoDeleteEnabled: false,
      secureDeletionStandard: "crypto-shred",
    },
    create: {
      tenantId,
      dataType: DataClassification.PATIENT_SENSITIVE,
      recordCategory: "discharge_refusal_cases",
      retentionYears: 10,
      legalHoldRequired: true,
      requiresLegalApproval: true,
      autoDeleteEnabled: false,
      secureDeletionStandard: "crypto-shred",
    },
  }).catch(() => null);
}

export async function getRetentionDashboard(tenantId: string) {
  await ensureDefaultRetentionPolicy(tenantId);

  const [policies, actions] = await Promise.all([
    prisma().retentionPolicy.findMany({ where: { tenantId }, orderBy: { recordCategory: "asc" } }).catch(() => []),
    prisma().retentionAction.findMany({ where: { tenantId }, orderBy: { scheduledFor: "asc" }, take: 100 }).catch(() => []),
  ]);

  const upcomingActions = actions.filter((item) => item.status === RetentionActionStatus.PENDING);

  return {
    policies,
    actions,
    upcomingActions,
    defaultCaseRetentionYears: 10,
    metrics: {
      policyCount: policies.length,
      actionCount: actions.length,
      upcomingActionCount: upcomingActions.length,
      legalHoldCount: actions.filter((item) => item.status === RetentionActionStatus.LEGAL_HOLD).length,
    },
  };
}

export async function createRetentionEntry(
  auth: AuthContext,
  payload: {
    recordCategory?: string;
    retentionYears?: number;
    targetType?: string;
    targetId?: string;
    caseId?: string | null;
    scheduledFor?: string;
    holdReason?: string;
  },
  request?: NextRequest,
) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  if (payload.recordCategory?.trim()) {
    const policy = await prisma().retentionPolicy.upsert({
      where: {
        tenantId_recordCategory: {
          tenantId: auth.tenant_id,
          recordCategory: payload.recordCategory.trim(),
        },
      },
      update: {
        retentionYears: Math.max(1, Math.floor(payload.retentionYears ?? 10)),
      },
      create: {
        tenantId: auth.tenant_id,
        dataType: DataClassification.PATIENT_SENSITIVE,
        recordCategory: payload.recordCategory.trim(),
        retentionYears: Math.max(1, Math.floor(payload.retentionYears ?? 10)),
      },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "retention_policy",
      entityId: policy.id,
      action: "retention_policy_upserted",
      details: `Retention policy saved for ${policy.recordCategory}`,
      metadataJson: {
        retentionYears: policy.retentionYears,
      },
      request,
    }).catch(() => undefined);

    return policy;
  }

  if (!payload.targetType?.trim() || !payload.targetId?.trim()) {
    throw new ApiError(400, "Either a policy recordCategory or an action targetType/targetId is required");
  }

  const policy = await ensureDefaultRetentionPolicy(auth.tenant_id);
  const action = await prisma().retentionAction.create({
    data: {
      tenantId: auth.tenant_id,
      caseId: payload.caseId?.trim() || null,
      policyId: policy?.id ?? null,
      targetType: payload.targetType.trim(),
      targetId: payload.targetId.trim(),
      holdReason: payload.holdReason?.trim() || null,
      status: payload.holdReason ? RetentionActionStatus.LEGAL_HOLD : RetentionActionStatus.PENDING,
      scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : calculateRetentionDueDate(new Date(), 10),
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "retention_action",
    entityId: action.id,
    action: "retention_action_created",
    details: `Retention action created for ${action.targetType}`,
    caseId: action.caseId,
    metadataJson: {
      status: action.status,
      targetId: action.targetId,
    },
    request,
  }).catch(() => undefined);

  return action;
}