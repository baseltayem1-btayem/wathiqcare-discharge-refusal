import type { TrackingEventRecord } from "@/lib/analytics";

type TrackingEventName =
  | "page_view"
  | "route_change"
  | "case_opened"
  | "step_viewed"
  | "step_completed"
  | "primary_action_clicked"
  | "pdf_generated"
  | "legal_package_generated"
  | "api_error"
  | "ui_error";

type TrackingPayload = Record<string, unknown>;

type TrackingMetrics = {
  pageLoadAtByRoute: Record<string, number>;
  firstActionCapturedByRoute: Record<string, boolean>;
  caseOpenedAtByRoute: Record<string, number>;
  dropOffStepByRoute: Record<string, string>;
};

type PendingBatch = {
  batchId: string;
  eventIds: string[];
  createdAt: string;
};

const TRACKING_BUFFER_KEY = "wc_tracking_buffer_v1";
const TRACKING_METRICS_KEY = "wc_tracking_metrics_v1";
const TRACKING_PENDING_BATCH_KEY = "wc_tracking_pending_batch_v1";
const MAX_BUFFER_EVENTS = 200;
const FLUSH_EVENT_THRESHOLD = 15;
const FLUSH_INTERVAL_MS = 45000;
const MAX_FLUSH_BATCH_SIZE = 20;

let flushLoopStarted = false;
let flushListenersRegistered = false;
let flushInFlight = false;

const FORBIDDEN_KEYS = new Set([
  "patient",
  "patient_name",
  "patientname",
  "mrn",
  "medicalrecordno",
  "medical_record_number",
  "diagnosis",
  "signer_name",
  "witness_name",
  "iqama",
  "national_id",
  "id_number",
  "case_id",
  "caseid",
]);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isTrackingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TRACKING === "true";
}

function getCurrentRoute(): string {
  if (!isBrowser()) return "";
  const path = window.location.pathname || "";
  const query = window.location.search || "";
  return `${path}${query}`;
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateTrackingId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `trk-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeBufferEvents(events: TrackingEventRecord[]): TrackingEventRecord[] {
  let changed = false;

  const normalized = events.map((event) => {
    const nextEvent = { ...event };
    if (!nextEvent.id) {
      nextEvent.id = generateTrackingId();
      changed = true;
    }
    if (nextEvent.sentAt === undefined) {
      nextEvent.sentAt = null;
      changed = true;
    }
    return nextEvent;
  });

  if (changed) {
    writeBuffer(normalized);
  }

  return normalized;
}

export function readTrackingBuffer(): TrackingEventRecord[] {
  if (!isBrowser()) return [];
  return normalizeBufferEvents(safeParseJson<TrackingEventRecord[]>(window.sessionStorage.getItem(TRACKING_BUFFER_KEY), []));
}

function writeBuffer(events: TrackingEventRecord[]): void {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.setItem(TRACKING_BUFFER_KEY, JSON.stringify(events.slice(-MAX_BUFFER_EVENTS)));
  } catch {
    // ignore storage failures
  }
}

function readPendingBatch(): PendingBatch | null {
  if (!isBrowser()) return null;
  return safeParseJson<PendingBatch | null>(window.sessionStorage.getItem(TRACKING_PENDING_BATCH_KEY), null);
}

function writePendingBatch(batch: PendingBatch | null): void {
  if (!isBrowser()) return;

  try {
    if (!batch) {
      window.sessionStorage.removeItem(TRACKING_PENDING_BATCH_KEY);
      return;
    }
    window.sessionStorage.setItem(TRACKING_PENDING_BATCH_KEY, JSON.stringify(batch));
  } catch {
    // ignore storage failures
  }
}

function readMetrics(): TrackingMetrics {
  if (!isBrowser()) {
    return {
      pageLoadAtByRoute: {},
      firstActionCapturedByRoute: {},
      caseOpenedAtByRoute: {},
      dropOffStepByRoute: {},
    };
  }

  return safeParseJson<TrackingMetrics>(window.sessionStorage.getItem(TRACKING_METRICS_KEY), {
    pageLoadAtByRoute: {},
    firstActionCapturedByRoute: {},
    caseOpenedAtByRoute: {},
    dropOffStepByRoute: {},
  });
}

function writeMetrics(metrics: TrackingMetrics): void {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.setItem(TRACKING_METRICS_KEY, JSON.stringify(metrics));
  } catch {
    // ignore storage failures
  }
}

function scheduleNonBlocking(task: () => void): void {
  if (!isBrowser()) return;

  const win = window as Window & {
    requestIdleCallback?: (callback: () => void) => number;
  };

  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => {
      try {
        task();
      } catch {
        // ignore errors in tracking path
      }
    });
    return;
  }

  window.setTimeout(() => {
    try {
      task();
    } catch {
      // ignore errors in tracking path
    }
  }, 0);
}

function sanitizePayloadValue(value: unknown, depth = 0): unknown {
  if (depth > 3) {
    return undefined;
  }

  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    return value.slice(0, 160);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => sanitizePayloadValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase().trim();
      if (FORBIDDEN_KEYS.has(normalizedKey)) {
        continue;
      }

      const sanitized = sanitizePayloadValue(nestedValue, depth + 1);
      if (sanitized !== undefined) {
        out[key] = sanitized;
      }
    }

    return out;
  }

  return undefined;
}

function sanitizePayload(payload: TrackingPayload): TrackingPayload {
  const sanitized = sanitizePayloadValue(payload);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
    return {};
  }
  return sanitized as TrackingPayload;
}

function appendEvent(event: TrackingEventRecord): void {
  const existing = readTrackingBuffer();
  existing.push(event);
  writeBuffer(existing);
}

function getUnsentEvents(buffer = readTrackingBuffer()): TrackingEventRecord[] {
  return buffer.filter((event) => !event.sentAt && event.id);
}

function markEventsSent(eventIds: string[]): void {
  if (!eventIds.length) {
    return;
  }

  const eventIdSet = new Set(eventIds);
  const sentAt = new Date().toISOString();
  const nextBuffer = readTrackingBuffer().map((event) =>
    event.id && eventIdSet.has(event.id)
      ? { ...event, sentAt }
      : event,
  );
  writeBuffer(nextBuffer);
}

function ensureFlushLoop(): void {
  if (!isTrackingEnabled() || !isBrowser()) {
    return;
  }

  if (!flushLoopStarted) {
    window.setInterval(() => {
      void flushBufferedEvents();
    }, FLUSH_INTERVAL_MS);
    flushLoopStarted = true;
  }

  if (!flushListenersRegistered) {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushBufferedEvents();
      }
    };

    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", () => {
      void flushBufferedEvents();
    });
    flushListenersRegistered = true;
  }
}

async function postBatch(batch: PendingBatch, events: TrackingEventRecord[]): Promise<boolean> {
  try {
    const response = await fetch("/api/analytics/events", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchId: batch.batchId, events }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function flushBufferedEvents(): Promise<void> {
  if (!isTrackingEnabled() || !isBrowser() || flushInFlight) {
    return;
  }

  ensureFlushLoop();

  const buffer = readTrackingBuffer();
  let pendingBatch = readPendingBatch();
  let batchEvents: TrackingEventRecord[];

  if (pendingBatch) {
    const eventIdSet = new Set(pendingBatch.eventIds);
    batchEvents = buffer.filter((event) => event.id && eventIdSet.has(event.id));
    if (batchEvents.length === 0) {
      writePendingBatch(null);
      pendingBatch = null;
    }
  }

  if (!pendingBatch) {
    const unsentEvents = getUnsentEvents(buffer).slice(0, MAX_FLUSH_BATCH_SIZE);
    if (unsentEvents.length === 0) {
      return;
    }

    pendingBatch = {
      batchId: generateTrackingId(),
      eventIds: unsentEvents.map((event) => event.id!).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    batchEvents = unsentEvents;
    writePendingBatch(pendingBatch);
  }

  flushInFlight = true;
  try {
    const ok = await postBatch(pendingBatch, batchEvents!);
    if (!ok) {
      return;
    }

    markEventsSent(pendingBatch.eventIds);
    writePendingBatch(null);
  } finally {
    flushInFlight = false;
  }
}

export function beginTrackingForRoute(route = getCurrentRoute()): void {
  if (!isTrackingEnabled() || !isBrowser() || !route) return;

  ensureFlushLoop();

  const metrics = readMetrics();
  metrics.pageLoadAtByRoute[route] = Date.now();
  metrics.firstActionCapturedByRoute[route] = false;
  writeMetrics(metrics);
}

function readTimeToFirstActionMs(route: string): number | undefined {
  if (!route) return undefined;

  const metrics = readMetrics();
  const startedAt = metrics.pageLoadAtByRoute[route];
  const alreadyCaptured = metrics.firstActionCapturedByRoute[route];

  if (!startedAt || alreadyCaptured) {
    return undefined;
  }

  metrics.firstActionCapturedByRoute[route] = true;
  writeMetrics(metrics);

  return Math.max(0, Date.now() - startedAt);
}

function consumeDropOffStep(route: string): string | null {
  if (!route) return null;

  const metrics = readMetrics();
  const step = metrics.dropOffStepByRoute[route] || null;
  delete metrics.dropOffStepByRoute[route];
  writeMetrics(metrics);
  return step;
}

function maybeReadCaseCompletionMs(route: string, stepKey: string): number | undefined {
  if (stepKey !== "closure") {
    return undefined;
  }

  const metrics = readMetrics();
  const caseOpenedAt = metrics.caseOpenedAtByRoute[route];

  if (!caseOpenedAt) {
    return undefined;
  }

  return Math.max(0, Date.now() - caseOpenedAt);
}

export function setDropOffStep(stepKey: string, route = getCurrentRoute()): void {
  if (!isTrackingEnabled() || !isBrowser() || !route || !stepKey) return;

  const metrics = readMetrics();
  metrics.dropOffStepByRoute[route] = stepKey;
  writeMetrics(metrics);
}

export function trackEvent(eventName: TrackingEventName, payload: TrackingPayload = {}): void {
  if (!isTrackingEnabled() || !isBrowser()) return;

  scheduleNonBlocking(() => {
    ensureFlushLoop();

    const route = getCurrentRoute();
    const role = typeof payload.role === "string" ? payload.role : null;
    const { role: _ignoredRole, ...rawPayload } = payload;

    appendEvent({
      id: generateTrackingId(),
      eventName,
      timestamp: new Date().toISOString(),
      route,
      role,
      payload: sanitizePayload(rawPayload),
      sentAt: null,
    });

    if (getUnsentEvents().length >= FLUSH_EVENT_THRESHOLD) {
      void flushBufferedEvents();
    }
  });
}

export function trackPageView(payload: TrackingPayload = {}): void {
  trackEvent("page_view", payload);
}

export function trackRouteChange(from: string, to: string, payload: TrackingPayload = {}): void {
  const dropOffStep = consumeDropOffStep(from);
  trackEvent("route_change", {
    from,
    to,
    ...(dropOffStep ? { drop_off_step: dropOffStep } : {}),
    ...payload,
  });
}

export function trackCaseOpened(payload: TrackingPayload = {}): void {
  if (!isTrackingEnabled() || !isBrowser()) return;

  const route = getCurrentRoute();
  const metrics = readMetrics();
  metrics.caseOpenedAtByRoute[route] = Date.now();
  writeMetrics(metrics);

  trackEvent("case_opened", payload);
}

export function trackStepViewed(stepKey: string, payload: TrackingPayload = {}): void {
  if (!stepKey) return;
  setDropOffStep(stepKey);
  trackEvent("step_viewed", { step_key: stepKey, ...payload });
}

export function trackStepCompleted(stepKey: string, payload: TrackingPayload = {}): void {
  if (!stepKey) return;

  const route = getCurrentRoute();
  const caseCompletionMs = maybeReadCaseCompletionMs(route, stepKey);

  trackEvent("step_completed", {
    step_key: stepKey,
    ...(caseCompletionMs !== undefined ? { case_completion_time_ms: caseCompletionMs } : {}),
    ...payload,
  });
}

export function trackPrimaryAction(actionName: string, payload: TrackingPayload = {}): void {
  if (!actionName) return;

  const route = getCurrentRoute();
  const timeToFirstActionMs = readTimeToFirstActionMs(route);

  trackEvent("primary_action_clicked", {
    action_name: actionName,
    ...(timeToFirstActionMs !== undefined ? { time_to_first_action_ms: timeToFirstActionMs } : {}),
    ...payload,
  });
}

export function trackPdfGenerated(payload: TrackingPayload = {}): void {
  trackEvent("pdf_generated", payload);
}

export function trackLegalPackageGenerated(payload: TrackingPayload = {}): void {
  trackEvent("legal_package_generated", payload);
}

export function trackApiError(payload: TrackingPayload = {}): void {
  trackEvent("api_error", payload);
}

export function trackUiError(payload: TrackingPayload = {}): void {
  trackEvent("ui_error", payload);
}
