import type { ModuleKey } from "@/lib/modules/catalog";
import { getPrisma } from "@/lib/server/prisma";

const prisma = getPrisma();

export type ModuleUsageEventInput = {
  tenantId: string;
  moduleKey: ModuleKey;
  userId: string;
  actionType: string;
  documentId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  timestamp?: Date;
  metadataJson?: Record<string, unknown> | null;
};

export type ModuleUsageSummaryRow = {
  moduleKey: string;
  actionType: string;
  total: number;
};

function sanitizeKey(value: string, fallback: string): string {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return normalized.replace(/[^a-z0-9_\-:.]/g, "_").slice(0, 80);
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function trackModuleUsageEvent(input: ModuleUsageEventInput): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO module_usage_events (
      tenant_id,
      module_key,
      user_id,
      action_type,
      document_id,
      request_id,
      correlation_id,
      occurred_at,
      metadata_json
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    input.tenantId,
    input.moduleKey,
    input.userId,
    sanitizeKey(input.actionType, "unknown_action"),
    input.documentId ?? null,
    input.requestId ?? null,
    input.correlationId ?? null,
    (input.timestamp ?? new Date()).toISOString(),
    JSON.stringify(input.metadataJson ?? {}),
  );
}

export async function getTenantModuleUsage(
  tenantId: string,
  moduleKey: ModuleKey,
  days = 30,
): Promise<Array<{ day: string; actionType: string; total: number }>> {
  const safeDays = Math.max(1, Math.min(365, Math.floor(days || 30)));

  const rows = await prisma.$queryRawUnsafe<Array<{ day: string; action_type: string; total: bigint | number }>>(
    `SELECT occurred_at::date::text AS day, action_type, COUNT(*) AS total
     FROM module_usage_events
     WHERE tenant_id = $1
       AND module_key = $2
       AND occurred_at >= NOW() - ($3 || ' days')::interval
     GROUP BY occurred_at::date, action_type
     ORDER BY day DESC, action_type ASC`,
    tenantId,
    moduleKey,
    safeDays.toString(),
  );

  return rows.map((row) => ({
    day: row.day,
    actionType: row.action_type,
    total: Number(row.total),
  }));
}

export async function getModuleActivitySummary(
  tenantId: string,
  moduleKey: ModuleKey,
  days = 30,
): Promise<{ totalEvents: number; activeUsers: number; uniqueDocuments: number; byAction: ModuleUsageSummaryRow[] }> {
  const safeDays = Math.max(1, Math.min(365, Math.floor(days || 30)));

  const [aggregateRows, actionRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ total_events: bigint | number; active_users: bigint | number; unique_documents: bigint | number }>>(
      `SELECT
         COUNT(*) AS total_events,
         COUNT(DISTINCT user_id) AS active_users,
         COUNT(DISTINCT document_id) AS unique_documents
       FROM module_usage_events
       WHERE tenant_id = $1
         AND module_key = $2
         AND occurred_at >= NOW() - ($3 || ' days')::interval`,
      tenantId,
      moduleKey,
      safeDays.toString(),
    ),
    prisma.$queryRawUnsafe<Array<{ module_key: string; action_type: string; total: bigint | number }>>(
      `SELECT module_key, action_type, COUNT(*) AS total
       FROM module_usage_events
       WHERE tenant_id = $1
         AND module_key = $2
         AND occurred_at >= NOW() - ($3 || ' days')::interval
       GROUP BY module_key, action_type
       ORDER BY total DESC, action_type ASC`,
      tenantId,
      moduleKey,
      safeDays.toString(),
    ),
  ]);

  const agg = aggregateRows[0] || { total_events: 0, active_users: 0, unique_documents: 0 };

  return {
    totalEvents: Number(agg.total_events),
    activeUsers: Number(agg.active_users),
    uniqueDocuments: Number(agg.unique_documents),
    byAction: actionRows.map((row) => ({
      moduleKey: row.module_key,
      actionType: row.action_type,
      total: Number(row.total),
    })),
  };
}

export async function getSubscriberUsageByModule(
  tenantId: string,
  days = 30,
): Promise<Array<{ moduleKey: string; totalEvents: number; activeUsers: number; uniqueDocuments: number }>> {
  const safeDays = Math.max(1, Math.min(365, Math.floor(days || 30)));

  const rows = await prisma.$queryRawUnsafe<Array<{ module_key: string; total_events: bigint | number; active_users: bigint | number; unique_documents: bigint | number }>>(
    `SELECT
       module_key,
       COUNT(*) AS total_events,
       COUNT(DISTINCT user_id) AS active_users,
       COUNT(DISTINCT document_id) AS unique_documents
     FROM module_usage_events
     WHERE tenant_id = $1
       AND occurred_at >= NOW() - ($2 || ' days')::interval
     GROUP BY module_key
     ORDER BY module_key ASC`,
    tenantId,
    safeDays.toString(),
  );

  return rows.map((row) => ({
    moduleKey: row.module_key,
    totalEvents: Number(row.total_events),
    activeUsers: Number(row.active_users),
    uniqueDocuments: Number(row.unique_documents),
  }));
}

export async function getModuleActiveUsers(
  tenantId: string,
  moduleKey: ModuleKey,
  days = 30,
): Promise<Array<{ userId: string; totalEvents: number; lastEventAt: string }>> {
  const safeDays = Math.max(1, Math.min(365, Math.floor(days || 30)));

  const rows = await prisma.$queryRawUnsafe<Array<{ user_id: string; total_events: bigint | number; last_event_at: Date }>>(
    `SELECT
       user_id,
       COUNT(*) AS total_events,
       MAX(occurred_at) AS last_event_at
     FROM module_usage_events
     WHERE tenant_id = $1
       AND module_key = $2
       AND occurred_at >= NOW() - ($3 || ' days')::interval
     GROUP BY user_id
     ORDER BY total_events DESC, user_id ASC`,
    tenantId,
    moduleKey,
    safeDays.toString(),
  );

  return rows.map((row) => ({
    userId: row.user_id,
    totalEvents: Number(row.total_events),
    lastEventAt: row.last_event_at.toISOString(),
  }));
}

export async function getMonthlyUsageByModule(
  tenantId: string,
  months = 6,
): Promise<Array<{ month: string; moduleKey: string; totalEvents: number }>> {
  const safeMonths = Math.max(1, Math.min(36, Math.floor(months || 6)));
  const fromDate = monthStart(new Date());
  fromDate.setUTCMonth(fromDate.getUTCMonth() - (safeMonths - 1));

  const rows = await prisma.$queryRawUnsafe<Array<{ month: string; module_key: string; total_events: bigint | number }>>(
    `SELECT
       to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS month,
       module_key,
       COUNT(*) AS total_events
     FROM module_usage_events
     WHERE tenant_id = $1
       AND occurred_at >= $2::timestamptz
     GROUP BY date_trunc('month', occurred_at), module_key
     ORDER BY month ASC, module_key ASC`,
    tenantId,
    fromDate.toISOString(),
  );

  return rows.map((row) => ({
    month: row.month,
    moduleKey: row.module_key,
    totalEvents: Number(row.total_events),
  }));
}

export async function recordCanonicalModuleEvents(args: {
  tenantId: string;
  moduleKey: ModuleKey;
  userId: string;
  actionType: string;
  documentId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
}) {
  await trackModuleUsageEvent({
    tenantId: args.tenantId,
    moduleKey: args.moduleKey,
    userId: args.userId,
    actionType: args.actionType,
    documentId: args.documentId,
    requestId: args.requestId,
    correlationId: args.correlationId,
  });
}

export function analyticsDateToDay(value?: Date | null): string {
  if (!value) {
    return toIsoDay(new Date());
  }
  return toIsoDay(value);
}
