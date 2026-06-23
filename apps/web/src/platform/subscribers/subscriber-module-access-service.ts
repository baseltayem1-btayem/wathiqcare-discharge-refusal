import { $Enums } from "@prisma/client";
import { SubscriberModuleAccessStatus } from "@/lib/server/prisma-enums";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { MODULE_DEFINITIONS, type ModuleKey } from "@/lib/modules/catalog";

const prisma = () => getPrisma();

export const MODULE_KEYS = MODULE_DEFINITIONS.map((item) => item.key);

export type SubscriberModuleAccessInput = {
  subscriberId: string;
  moduleKey: string;
  status: SubscriberModuleAccessStatus;
  activatedBy?: string | null;
  deactivatedBy?: string | null;
  subscriptionPlan?: string | null;
  expiryDate?: Date | null;
  notes?: string | null;
};

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return code === "P2021" || code === "P2022";
}

export function isSupportedModuleKey(value: string): value is ModuleKey {
  return MODULE_KEYS.includes(value as ModuleKey);
}

export function normalizeModuleKey(value: string | null | undefined): ModuleKey | null {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return isSupportedModuleKey(normalized) ? normalized : null;
}

export async function listSubscriberModuleAccess(subscriberId: string) {
  return prisma().subscriberModuleAccess.findMany({
    where: { subscriberId },
    orderBy: [{ moduleKey: "asc" }],
  });
}

export async function suspendAllSubscriberModules(subscriberId: string, actorId?: string | null, reason?: string | null) {
  const now = new Date();
  const notePrefix = reason?.trim() ? `Emergency suspension: ${reason.trim()}` : "Emergency suspension triggered";

  const result = await prisma().subscriberModuleAccess.updateMany({
    where: {
      subscriberId,
      status: {
        in: [
          SubscriberModuleAccessStatus.ACTIVE as $Enums.SubscriberModuleAccessStatus,
          SubscriberModuleAccessStatus.TRIAL as $Enums.SubscriberModuleAccessStatus,
        ],
      },
    },
    data: {
      status: SubscriberModuleAccessStatus.SUSPENDED as $Enums.SubscriberModuleAccessStatus,
      deactivatedBy: actorId ?? null,
      deactivatedAt: now,
      notes: notePrefix,
    },
  });

  return {
    subscriberId,
    suspendedCount: result.count,
    suspendedAt: now,
  };
}

export async function getSubscriberModuleAccessDashboard(
  subscriberId: string,
  options?: { lookbackDays?: number; expiryWarningDays?: number },
) {
  const lookbackDays = Math.max(1, Math.min(180, Math.floor(options?.lookbackDays ?? 30)));
  const expiryWarningDays = Math.max(1, Math.min(90, Math.floor(options?.expiryWarningDays ?? 14)));
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const expiryWarningCutoff = new Date(now.getTime() + expiryWarningDays * 24 * 60 * 60 * 1000);

  const [accessRows, activeUsersCount, recentAccessAuditEvents] = await Promise.all([
    listSubscriberModuleAccess(subscriberId),
    prisma().tenantMembership.count({
      where: {
        tenantId: subscriberId,
        status: "ACTIVE",
        user: { isActive: true },
      },
    }),
    prisma().auditLog.findMany({
      where: {
        tenantId: subscriberId,
        entityType: "subscriber_module_access",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const modules = await Promise.all(
    accessRows.map(async (row) => {
      const [moduleUsageEvents, moduleAuditEvents] = await Promise.all([
        prisma().auditLog.count({
          where: {
            tenantId: subscriberId,
            createdAt: { gte: lookbackStart },
            metadataJson: {
              path: ["moduleKey"],
              equals: row.moduleKey,
            },
          },
        }),
        prisma().auditLog.findMany({
          where: {
            tenantId: subscriberId,
            entityType: "subscriber_module_access",
            OR: [
              { entityId: row.id },
              {
                metadataJson: {
                  path: ["moduleKey"],
                  equals: row.moduleKey,
                },
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      const isExpired = Boolean(row.expiryDate && row.expiryDate.getTime() < now.getTime());
      const expiresSoon = Boolean(
        row.expiryDate
        && row.expiryDate.getTime() >= now.getTime()
        && row.expiryDate.getTime() <= expiryWarningCutoff.getTime(),
      );

      return {
        moduleKey: row.moduleKey,
        status: row.status,
        subscriptionPlan: row.subscriptionPlan,
        expiryDate: row.expiryDate,
        expiresSoon,
        isExpired,
        emergencySuspended: row.status === SubscriberModuleAccessStatus.SUSPENDED,
        activatedAt: row.activatedAt,
        activatedBy: row.activatedBy,
        deactivatedAt: row.deactivatedAt,
        deactivatedBy: row.deactivatedBy,
        notes: row.notes,
        activeUsersCount,
        usageEventsInWindow: moduleUsageEvents,
        activationHistory: moduleAuditEvents.map((event) => ({
          id: event.id,
          action: event.action,
          details: event.details,
          userId: event.userId,
          createdAt: event.createdAt,
          metadataJson: event.metadataJson,
        })),
      };
    }),
  );

  return {
    subscriberId,
    generatedAt: now,
    lookbackDays,
    expiryWarningDays,
    activeUsersCount,
    modules,
    recentAccessAuditEvents: recentAccessAuditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      details: event.details,
      userId: event.userId,
      entityId: event.entityId,
      createdAt: event.createdAt,
      metadataJson: event.metadataJson,
    })),
  };
}

export async function upsertSubscriberModuleAccess(input: SubscriberModuleAccessInput) {
  const isActivating = input.status === SubscriberModuleAccessStatus.ACTIVE || input.status === SubscriberModuleAccessStatus.TRIAL;

  return prisma().subscriberModuleAccess.upsert({
    where: {
      subscriberId_moduleKey: {
        subscriberId: input.subscriberId,
        moduleKey: input.moduleKey,
      },
    },
    update: {
      status: input.status as $Enums.SubscriberModuleAccessStatus,
      activatedBy: isActivating ? (input.activatedBy || null) : undefined,
      activatedAt: isActivating ? new Date() : undefined,
      deactivatedBy: !isActivating ? (input.deactivatedBy || null) : undefined,
      deactivatedAt: !isActivating ? new Date() : undefined,
      subscriptionPlan: input.subscriptionPlan || null,
      expiryDate: input.expiryDate || null,
      notes: input.notes || null,
    },
    create: {
      subscriberId: input.subscriberId,
      moduleKey: input.moduleKey,
      status: input.status as $Enums.SubscriberModuleAccessStatus,
      activatedBy: isActivating ? (input.activatedBy || null) : null,
      activatedAt: isActivating ? new Date() : null,
      deactivatedBy: !isActivating ? (input.deactivatedBy || null) : null,
      deactivatedAt: !isActivating ? new Date() : null,
      subscriptionPlan: input.subscriptionPlan || null,
      expiryDate: input.expiryDate || null,
      notes: input.notes || null,
    },
  });
}

export async function bootstrapSubscriberModuleAccess(subscriberId: string) {
  try {
    for (const moduleKey of MODULE_KEYS) {
       await prisma().subscriberModuleAccess.upsert({
        where: {
          subscriberId_moduleKey: {
            subscriberId,
            moduleKey,
          },
        },
        update: {},
        create: {
          subscriberId,
          moduleKey,
          status: SubscriberModuleAccessStatus.ACTIVE as $Enums.SubscriberModuleAccessStatus,
          activatedAt: new Date(),
          notes: "Default activation at subscriber creation",
        },
      });
    }
  } catch (error) {
    if (isMissingTableError(error)) {
      return;
    }
    throw error;
  }
}

export async function assertSubscriberModuleAccess(args: {
  subscriberId: string;
  moduleKey: ModuleKey;
}) {
  const subscriber = await prisma().tenant.findUnique({
    where: { id: args.subscriberId },
    select: { id: true, isActive: true },
  });

  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found");
  }

  if (!subscriber.isActive) {
    throw new ApiError(403, "Subscriber is inactive");
  }

  const moduleAccess = await prisma().subscriberModuleAccess.findUnique({
    where: {
      subscriberId_moduleKey: {
        subscriberId: args.subscriberId,
        moduleKey: args.moduleKey,
      },
    },
  });

  if (!moduleAccess) {
    throw new ApiError(403, `Module ${args.moduleKey} is not activated for this subscriber`);
  }

  if (
    moduleAccess.status !== SubscriberModuleAccessStatus.ACTIVE
    && moduleAccess.status !== SubscriberModuleAccessStatus.TRIAL
  ) {
    throw new ApiError(403, `Module ${args.moduleKey} is ${moduleAccess.status.toLowerCase()} for this subscriber`);
  }

  if (moduleAccess.expiryDate && moduleAccess.expiryDate.getTime() < Date.now()) {
    throw new ApiError(403, `Module ${args.moduleKey} access has expired`);
  }

  return moduleAccess;
}

export function toModuleAccessStatus(value: string | null | undefined): SubscriberModuleAccessStatus | null {
  const normalized = (value || "").trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  return Object.values(SubscriberModuleAccessStatus).includes(normalized as $Enums.SubscriberModuleAccessStatus)
    ? (normalized as $Enums.SubscriberModuleAccessStatus)
    : null;
}

export function toNullableDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Invalid expiryDate");
  }
  return parsed;
}
