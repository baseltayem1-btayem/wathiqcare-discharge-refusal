import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";

export type RuntimeSeverity = "debug" | "info" | "warn" | "error" | "critical";

type RuntimeMetricKey =
  | "response_time_ms"
  | "db_latency_ms"
  | "pdf_generation_duration_ms"
  | "session_validation_duration_ms";

type RuntimeIncidentType = "DB_FAILURE" | "PDF_FAILURE" | "QR_VERIFICATION_FAILURE" | "OTP_FAILURE" | "AUTH_FAILURE";

type RuntimeMetricsStore = {
  counters: Record<RuntimeMetricKey, number>;
  latestMs: Partial<Record<RuntimeMetricKey, number>>;
  updatedAt: string;
};

declare global {
  var __wathiqcareRuntimeMetrics__: RuntimeMetricsStore | undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rid-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function hashIdentifier(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function redactValue(key: string, value: unknown): unknown {
  if (value == null) {
    return value;
  }
  const normalized = key.toLowerCase();
  if (
    normalized.includes("patient")
    || normalized.includes("mrn")
    || normalized.includes("full_name")
    || normalized.includes("name")
    || normalized.includes("email")
  ) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    if (normalized.includes("userid") || normalized === "user_id" || normalized === "userid") {
      return `u_${hashIdentifier(value)}`;
    }
    if (normalized.includes("tenantid") || normalized === "tenant_id") {
      return `t_${hashIdentifier(value)}`;
    }
    if (value.length > 300) {
      return `${value.slice(0, 297)}...`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactValue(key, item));
  }

  if (typeof value === "object") {
    const safe: Record<string, unknown> = {};
    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      safe[nestedKey] = redactValue(nestedKey, nestedValue);
    }
    return safe;
  }

  return value;
}

function buildMetricsStore(): RuntimeMetricsStore {
  return {
    counters: {
      response_time_ms: 0,
      db_latency_ms: 0,
      pdf_generation_duration_ms: 0,
      session_validation_duration_ms: 0,
    },
    latestMs: {},
    updatedAt: nowIso(),
  };
}

function metricsStore(): RuntimeMetricsStore {
  if (!global.__wathiqcareRuntimeMetrics__) {
    global.__wathiqcareRuntimeMetrics__ = buildMetricsStore();
  }
  return global.__wathiqcareRuntimeMetrics__;
}

export function getRuntimeCorrelationId(request?: NextRequest | null): string {
  const fromHeader = request?.headers.get("x-runtime-correlation-id")?.trim();
  return fromHeader || randomId();
}

export function getRequestId(request?: NextRequest | null): string {
  const requestId = request?.headers.get("x-request-id")?.trim();
  return requestId || randomId();
}

export function recordRuntimeMetric(metric: RuntimeMetricKey, valueMs: number): void {
  if (!Number.isFinite(valueMs) || valueMs < 0) {
    return;
  }
  const store = metricsStore();
  store.counters[metric] += 1;
  store.latestMs[metric] = Math.round(valueMs);
  store.updatedAt = nowIso();
}

export function getRuntimeMetricsSnapshot() {
  const store = metricsStore();
  return {
    counters: { ...store.counters },
    latestMs: { ...store.latestMs },
    updatedAt: store.updatedAt,
  };
}

export function logRuntimeEvent(args: {
  request?: NextRequest | null;
  auth?: Pick<AuthContext, "sub"> | null;
  module: string;
  event: string;
  severity: RuntimeSeverity;
  details?: Record<string, unknown>;
  runtimeCorrelationId?: string;
}): void {
  const requestId = getRequestId(args.request);
  const runtimeCorrelationId = args.runtimeCorrelationId || getRuntimeCorrelationId(args.request);

  const payload = {
    timestamp: nowIso(),
    requestId,
    runtimeCorrelationId,
    userId: args.auth?.sub ? `u_${hashIdentifier(args.auth.sub)}` : null,
    module: args.module,
    severity: args.severity,
    event: args.event,
    details: redactValue("details", args.details ?? {}),
  };

  if (args.severity === "critical" || args.severity === "error") {
    console.error("RUNTIME_EVENT", JSON.stringify(payload));
    return;
  }

  if (args.severity === "warn") {
    console.warn("RUNTIME_EVENT", JSON.stringify(payload));
    return;
  }

  console.info("RUNTIME_EVENT", JSON.stringify(payload));
}

export function logRuntimeIncident(args: {
  request?: NextRequest | null;
  auth?: Pick<AuthContext, "sub"> | null;
  module: string;
  type: RuntimeIncidentType;
  error?: unknown;
  details?: Record<string, unknown>;
  runtimeCorrelationId?: string;
}): void {
  const errorName = args.error instanceof Error ? args.error.name : "UnknownError";
  const errorMessage = args.error instanceof Error ? args.error.message : args.error ? String(args.error) : "incident";

  logRuntimeEvent({
    request: args.request,
    auth: args.auth,
    module: args.module,
    event: args.type,
    severity: "error",
    runtimeCorrelationId: args.runtimeCorrelationId,
    details: {
      errorName,
      errorMessage,
      ...args.details,
    },
  });
}
