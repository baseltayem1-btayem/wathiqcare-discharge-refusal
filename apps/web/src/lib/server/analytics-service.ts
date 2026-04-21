import { getPrisma } from "@/lib/server/prisma";
import {
  buildAnalyticsDayKeys,
  clampAnalyticsRangeDays,
  createEmptyAnalyticsDayRollup,
  normalizeAnalyticsRoute,
  sanitizeAnalyticsKey,
  type AnalyticsDayRollup,
  type TrackingEventRecord,
} from "@/lib/analytics";

type AnalyticsMetricGroup = "summary" | "page" | "action" | "drop_off" | "error";

type AnalyticsMetricIncrement = {
  day: string;
  group: AnalyticsMetricGroup;
  key: string;
  value: number;
};

const TABLES_READY_CACHE = new Set<string>();

function cacheKeyForDatabase(): string {
  return process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || "default";
}

async function ensureAnalyticsTables(): Promise<void> {
  const cacheKey = cacheKeyForDatabase();
  if (TABLES_READY_CACHE.has(cacheKey)) {
    return;
  }

  const prisma = getPrisma();

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
      tenant_id TEXT NOT NULL,
      metric_date DATE NOT NULL,
      metric_group TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      metric_value BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, metric_date, metric_group, metric_key)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS analytics_ingest_batches (
      batch_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_tenant_date
    ON analytics_daily_metrics (tenant_id, metric_date DESC)
  `);

  TABLES_READY_CACHE.add(cacheKey);
}

function recordIncrement(increments: Map<string, AnalyticsMetricIncrement>, increment: AnalyticsMetricIncrement): void {
  const compositeKey = `${increment.day}::${increment.group}::${increment.key}`;
  const existing = increments.get(compositeKey);
  if (existing) {
    existing.value += increment.value;
    return;
  }
  increments.set(compositeKey, increment);
}

function eventDayOrNull(timestamp: string): string | null {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function aggregateEventsForPersistence(events: TrackingEventRecord[]): AnalyticsMetricIncrement[] {
  const increments = new Map<string, AnalyticsMetricIncrement>();

  for (const event of events) {
    const day = eventDayOrNull(event.timestamp);
    if (!day) {
      continue;
    }

    recordIncrement(increments, { day, group: "summary", key: "total_events", value: 1 });

    if (event.eventName === "page_view") {
      recordIncrement(increments, { day, group: "summary", key: "page_views", value: 1 });
      recordIncrement(increments, {
        day,
        group: "page",
        key: normalizeAnalyticsRoute(event.route),
        value: 1,
      });
    }

    if (event.eventName === "primary_action_clicked") {
      recordIncrement(increments, { day, group: "summary", key: "actions", value: 1 });
      recordIncrement(increments, {
        day,
        group: "action",
        key: sanitizeAnalyticsKey(event.payload.action_name, "unknown_action"),
        value: 1,
      });
    }

    if (event.eventName === "route_change") {
      const dropOffStep = sanitizeAnalyticsKey(event.payload.drop_off_step, "");
      if (dropOffStep) {
        recordIncrement(increments, {
          day,
          group: "drop_off",
          key: dropOffStep,
          value: 1,
        });
      }
    }

    if (event.eventName === "api_error" || event.eventName === "ui_error") {
      recordIncrement(increments, { day, group: "summary", key: "errors", value: 1 });
      const detail = sanitizeAnalyticsKey(event.payload.operation, "") || sanitizeAnalyticsKey(event.payload.source, "unknown");
      recordIncrement(increments, {
        day,
        group: "error",
        key: `${event.eventName}:${detail || "unknown"}`,
        value: 1,
      });
    }

    if (event.eventName === "step_completed") {
      const completionMs = event.payload.case_completion_time_ms;
      if (typeof completionMs === "number" && Number.isFinite(completionMs) && completionMs >= 0) {
        recordIncrement(increments, { day, group: "summary", key: "completion_count", value: 1 });
        recordIncrement(increments, {
          day,
          group: "summary",
          key: "completion_total_ms",
          value: Math.round(completionMs),
        });
      }
    }
  }

  return Array.from(increments.values());
}

export async function ingestAnalyticsBatch(args: {
  tenantId: string;
  batchId: string;
  events: TrackingEventRecord[];
}): Promise<{ accepted: boolean; duplicate: boolean; processedCount: number }> {
  await ensureAnalyticsTables();

  const prisma = getPrisma();
  const increments = aggregateEventsForPersistence(args.events);

  return prisma.$transaction(async (tx) => {
    const insertedRows = await tx.$queryRaw<Array<{ inserted: boolean }>>`
      WITH inserted AS (
        INSERT INTO analytics_ingest_batches (batch_id, tenant_id, processed_at)
        VALUES (${args.batchId}, ${args.tenantId}, NOW())
        ON CONFLICT DO NOTHING
        RETURNING 1
      )
      SELECT EXISTS(SELECT 1 FROM inserted) AS inserted
    `;

    const inserted = Boolean(insertedRows[0]?.inserted);
    if (!inserted) {
      return { accepted: true, duplicate: true, processedCount: 0 };
    }

    for (const increment of increments) {
      await tx.$executeRaw`
        INSERT INTO analytics_daily_metrics (
          tenant_id,
          metric_date,
          metric_group,
          metric_key,
          metric_value,
          created_at,
          updated_at
        ) VALUES (
          ${args.tenantId},
          ${increment.day}::date,
          ${increment.group},
          ${increment.key},
          ${increment.value},
          NOW(),
          NOW()
        )
        ON CONFLICT (tenant_id, metric_date, metric_group, metric_key)
        DO UPDATE SET
          metric_value = analytics_daily_metrics.metric_value + EXCLUDED.metric_value,
          updated_at = NOW()
      `;
    }

    return {
      accepted: true,
      duplicate: false,
      processedCount: increments.length,
    };
  });
}

export async function loadAnalyticsRollups(tenantId: string, requestedDays: number | string | null | undefined): Promise<{
  rangeDays: 7 | 30;
  days: AnalyticsDayRollup[];
}> {
  await ensureAnalyticsTables();

  const rangeDays = clampAnalyticsRangeDays(requestedDays);
  const dayKeys = buildAnalyticsDayKeys(rangeDays);
  const oldestDay = dayKeys[dayKeys.length - 1];
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<Array<{
    day: string;
    metric_group: string;
    metric_key: string;
    metric_value: bigint | number | string;
  }>>`
    SELECT
      metric_date::text AS day,
      metric_group,
      metric_key,
      metric_value
    FROM analytics_daily_metrics
    WHERE tenant_id = ${tenantId}
      AND metric_date >= ${oldestDay}::date
      AND metric_date <= CURRENT_DATE
  `;

  const pageCounts = new Map<string, Map<string, number>>();
  const actionCounts = new Map<string, Map<string, number>>();
  const dropOffCounts = new Map<string, Map<string, number>>();
  const errorCounts = new Map<string, Map<string, number>>();
  const rollups = new Map<string, AnalyticsDayRollup>(
    dayKeys.map((day) => [day, createEmptyAnalyticsDayRollup(day)]),
  );

  for (const row of rows) {
    const rollup = rollups.get(row.day);
    if (!rollup) {
      continue;
    }

    const value = Number(row.metric_value);
    if (!Number.isFinite(value)) {
      continue;
    }

    if (row.metric_group === "summary") {
      if (row.metric_key === "total_events") {
        rollup.totalEvents = value;
      }
      if (row.metric_key === "page_views") {
        rollup.pageViews = value;
      }
      if (row.metric_key === "actions") {
        rollup.actions = value;
      }
      if (row.metric_key === "errors") {
        rollup.errors = value;
      }
      if (row.metric_key === "completion_count") {
        rollup.completionCount = value;
      }
      if (row.metric_key === "completion_total_ms") {
        rollup.completionTotalMs = value;
      }
      continue;
    }

    if (row.metric_group === "page") {
      if (!pageCounts.has(row.day)) {
        pageCounts.set(row.day, new Map<string, number>());
      }
      pageCounts.get(row.day)!.set(row.metric_key, value);
      continue;
    }

    if (row.metric_group === "action") {
      if (!actionCounts.has(row.day)) {
        actionCounts.set(row.day, new Map<string, number>());
      }
      actionCounts.get(row.day)!.set(row.metric_key, value);
      continue;
    }

    if (row.metric_group === "drop_off") {
      if (!dropOffCounts.has(row.day)) {
        dropOffCounts.set(row.day, new Map<string, number>());
      }
      dropOffCounts.get(row.day)!.set(row.metric_key, value);
      continue;
    }

    if (row.metric_group === "error") {
      if (!errorCounts.has(row.day)) {
        errorCounts.set(row.day, new Map<string, number>());
      }
      errorCounts.get(row.day)!.set(row.metric_key, value);
    }
  }

  for (const day of dayKeys) {
    const rollup = rollups.get(day)!;
    rollup.topPages = Array.from((pageCounts.get(day) ?? new Map<string, number>()).entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));
    rollup.mostUsedActions = Array.from((actionCounts.get(day) ?? new Map<string, number>()).entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));
    rollup.dropOffSteps = Array.from((dropOffCounts.get(day) ?? new Map<string, number>()).entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));
    rollup.errorFrequency = Array.from((errorCounts.get(day) ?? new Map<string, number>()).entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));
  }

  return {
    rangeDays,
    days: dayKeys.map((day) => rollups.get(day) ?? createEmptyAnalyticsDayRollup(day)),
  };
}