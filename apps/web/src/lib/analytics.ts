export type AnalyticsPayload = Record<string, unknown>;

export type TrackingEventRecord = {
  id?: string;
  eventName: string;
  timestamp: string;
  route: string;
  role: string | null;
  payload: AnalyticsPayload;
  sentAt?: string | null;
};

export type AnalyticsCountEntry = {
  key: string;
  count: number;
};

export type AnalyticsDayRollup = {
  day: string;
  totalEvents: number;
  pageViews: number;
  actions: number;
  errors: number;
  completionCount: number;
  completionTotalMs: number;
  topPages: AnalyticsCountEntry[];
  mostUsedActions: AnalyticsCountEntry[];
  dropOffSteps: AnalyticsCountEntry[];
  errorFrequency: AnalyticsCountEntry[];
};

const UUID_SEGMENT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_SEGMENT_RE = /^\d{2,}$/;
const LONG_TOKEN_SEGMENT_RE = /^[A-Za-z0-9_-]{16,}$/;

export function clampAnalyticsRangeDays(value: number | string | null | undefined): 7 | 30 {
  const parsed = typeof value === "number" ? value : Number(value);
  return parsed === 30 ? 30 : 7;
}

export function dayKey(isoTs: string): string {
  const dt = new Date(isoTs);
  if (Number.isNaN(dt.getTime())) {
    return "invalid";
  }
  return dt.toISOString().slice(0, 10);
}

export function buildAnalyticsDayKeys(rangeDays: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = 0; offset < rangeDays; offset += 1) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    keys.push(dt.toISOString().slice(0, 10));
  }
  return keys;
}

export function normalizeAnalyticsRoute(route: string): string {
  const pathOnly = (route || "").split("?")[0].split("#")[0].trim() || "/";
  const normalizedSegments = pathOnly
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (UUID_SEGMENT_RE.test(segment) || NUMERIC_SEGMENT_RE.test(segment) || LONG_TOKEN_SEGMENT_RE.test(segment)) {
        return ":id";
      }
      return segment;
    });

  return normalizedSegments.length > 0 ? `/${normalizedSegments.join("/")}` : "/";
}

export function sanitizeAnalyticsKey(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, 120);
}

export function createEmptyAnalyticsDayRollup(day: string): AnalyticsDayRollup {
  return {
    day,
    totalEvents: 0,
    pageViews: 0,
    actions: 0,
    errors: 0,
    completionCount: 0,
    completionTotalMs: 0,
    topPages: [],
    mostUsedActions: [],
    dropOffSteps: [],
    errorFrequency: [],
  };
}

function sortCountEntries(counts: Map<string, number>, limit = 10): AnalyticsCountEntry[] {
  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export function hasAnalyticsData(days: AnalyticsDayRollup[]): boolean {
  return days.some((day) => day.totalEvents > 0 || day.pageViews > 0 || day.actions > 0 || day.errors > 0);
}

export function aggregateTrackingEvents(events: TrackingEventRecord[], rangeDays: number): AnalyticsDayRollup[] {
  const dayKeys = buildAnalyticsDayKeys(rangeDays);
  const allowedDays = new Set(dayKeys);
  const pageCountsByDay = new Map<string, Map<string, number>>();
  const actionCountsByDay = new Map<string, Map<string, number>>();
  const dropOffCountsByDay = new Map<string, Map<string, number>>();
  const errorCountsByDay = new Map<string, Map<string, number>>();
  const rollups = new Map<string, AnalyticsDayRollup>(
    dayKeys.map((day) => [day, createEmptyAnalyticsDayRollup(day)]),
  );

  for (const event of events) {
    const eventDay = dayKey(event.timestamp);
    if (!allowedDays.has(eventDay)) {
      continue;
    }

    const rollup = rollups.get(eventDay);
    if (!rollup) {
      continue;
    }

    rollup.totalEvents += 1;

    if (event.eventName === "page_view") {
      rollup.pageViews += 1;
      const route = normalizeAnalyticsRoute(event.route);
      if (!pageCountsByDay.has(eventDay)) {
        pageCountsByDay.set(eventDay, new Map<string, number>());
      }
      const counts = pageCountsByDay.get(eventDay)!;
      counts.set(route, (counts.get(route) ?? 0) + 1);
    }

    if (event.eventName === "primary_action_clicked") {
      rollup.actions += 1;
      const action = sanitizeAnalyticsKey(event.payload.action_name, "unknown_action");
      if (!actionCountsByDay.has(eventDay)) {
        actionCountsByDay.set(eventDay, new Map<string, number>());
      }
      const counts = actionCountsByDay.get(eventDay)!;
      counts.set(action, (counts.get(action) ?? 0) + 1);
    }

    if (event.eventName === "route_change") {
      const dropOffStep = sanitizeAnalyticsKey(event.payload.drop_off_step, "");
      if (dropOffStep) {
        if (!dropOffCountsByDay.has(eventDay)) {
          dropOffCountsByDay.set(eventDay, new Map<string, number>());
        }
        const counts = dropOffCountsByDay.get(eventDay)!;
        counts.set(dropOffStep, (counts.get(dropOffStep) ?? 0) + 1);
      }
    }

    if (event.eventName === "api_error" || event.eventName === "ui_error") {
      rollup.errors += 1;
      const labelSource = sanitizeAnalyticsKey(event.payload.operation, "") || sanitizeAnalyticsKey(event.payload.source, "unknown");
      const label = `${event.eventName}:${labelSource || "unknown"}`;
      if (!errorCountsByDay.has(eventDay)) {
        errorCountsByDay.set(eventDay, new Map<string, number>());
      }
      const counts = errorCountsByDay.get(eventDay)!;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    if (event.eventName === "step_completed") {
      const completionMs = event.payload.case_completion_time_ms;
      if (typeof completionMs === "number" && Number.isFinite(completionMs) && completionMs >= 0) {
        rollup.completionCount += 1;
        rollup.completionTotalMs += completionMs;
      }
    }
  }

  for (const [day, rollup] of rollups.entries()) {
    rollup.topPages = sortCountEntries(pageCountsByDay.get(day) ?? new Map<string, number>());
    rollup.mostUsedActions = sortCountEntries(actionCountsByDay.get(day) ?? new Map<string, number>());
    rollup.dropOffSteps = sortCountEntries(dropOffCountsByDay.get(day) ?? new Map<string, number>());
    rollup.errorFrequency = sortCountEntries(errorCountsByDay.get(day) ?? new Map<string, number>());
  }

  return dayKeys.map((day) => rollups.get(day) ?? createEmptyAnalyticsDayRollup(day));
}