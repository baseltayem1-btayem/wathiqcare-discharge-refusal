import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";

export type RuntimeSeverity = "trace" | "debug" | "info" | "warn" | "error" | "critical";

type RuntimeMetricKey =
  | "response_time_ms"
  | "db_latency_ms"
  | "pdf_generation_duration_ms"
  | "session_validation_duration_ms";

type RuntimeIncidentType =
  | "DB_FAILURE"
  | "PDF_FAILURE"
  | "QR_VERIFICATION_FAILURE"
  | "OTP_FAILURE"
  | "AUTH_FAILURE"
  | "AUTHORIZATION_FAILURE"
  | "EXTERNAL_SERVICE_FAILURE"
  | "TIMEOUT"
  | "CIRCUIT_BREAKER_OPEN"
  | "UNHANDLED_EXCEPTION";

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

// Matches keys that should never be emitted in plain text, regardless of value.
const SENSITIVE_KEY_PATTERNS = [
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "auth",
  "authorization",
  "cookie",
  "session",
  "otp",
  "code",
  "signature",
  "signaturedataurl",
  "signature_image",
  "privatekey",
  "private_key",
  "connectionstring",
  "connection_string",
  "databaseurl",
  "database_url",
];

// Matches keys whose *values* are likely to contain PHI/PII and must be redacted.
const PHI_KEY_PATTERNS = [
  "patient",
  "patientname",
  "fullname",
  "firstname",
  "lastname",
  "mrn",
  "medicalrecord",
  "nationalid",
  "national_id",
  "iqama",
  "idnumber",
  "id_number",
  "email",
  "phone",
  "mobile",
  "address",
  "dob",
  "dateofbirth",
  "birth",
  "gender",
  "diagnosis",
  "clinicalnotes",
  "clinical_notes",
  "medicalhistory",
  "medical_history",
  "allergies",
  "medication",
  "treatment",
  "procedure",
  "physicianname",
  "signername",
  "witnessname",
  "guardianname",
  "interpretername",
];

function keyMatchesAny(key: string, patterns: string[]): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, "");
  return patterns.some((pattern) => normalized.includes(pattern.replace(/[-_\s]/g, "")));
}

function isSensitiveKey(key: string): boolean {
  return keyMatchesAny(key, SENSITIVE_KEY_PATTERNS);
}

function isPhiKey(key: string): boolean {
  return keyMatchesAny(key, PHI_KEY_PATTERNS);
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "[REDACTED_PHONE]";
  }
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

function maskEmail(value: string): string {
  const [localPart, domain] = value.split("@");
  if (!domain) {
    return "[REDACTED_EMAIL]";
  }
  const visibleLocal = localPart.slice(0, 2);
  const visibleDomain = domain.split(".")[0]?.slice(0, 2) ?? "";
  const tld = domain.slice(domain.lastIndexOf("."));
  return `${visibleLocal}****@${visibleDomain}****${tld}`;
}

function redactStringForKey(key: string, value: string): string {
  if (isSensitiveKey(key)) {
    return "[REDACTED]";
  }

  const lowerKey = key.toLowerCase();

  if (lowerKey.includes("user_id") || lowerKey.includes("userid") || lowerKey === "sub") {
    return `u_${hashIdentifier(value)}`;
  }

  if (lowerKey.includes("tenant_id") || lowerKey.includes("tenantid")) {
    return `t_${hashIdentifier(value)}`;
  }

  if (lowerKey.includes("email")) {
    return maskEmail(value);
  }

  if (lowerKey.includes("phone") || lowerKey.includes("mobile") || lowerKey.includes("msisdn")) {
    return maskPhone(value);
  }

  if (isPhiKey(key)) {
    return "[REDACTED]";
  }

  if (value.length > 1000) {
    return `${value.slice(0, 997)}...`;
  }

  return value;
}

export function redactValue(key: string, value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    return redactStringForKey(key, value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
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

export function sanitizeLogDetails(details: Record<string, unknown>): Record<string, unknown> {
  return redactValue("details", details) as Record<string, unknown>;
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
  const fromRuntimeHeader = request?.headers.get("x-runtime-correlation-id")?.trim();
  const fromCorrelationHeader = request?.headers.get("x-correlation-id")?.trim();
  return fromRuntimeHeader || fromCorrelationHeader || randomId();
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
  operation?: string;
  service?: string;
  tenantId?: string | null;
  durationMs?: number;
  details?: Record<string, unknown>;
  runtimeCorrelationId?: string;
  requestId?: string;
}): void {
  const requestId = args.requestId ?? getRequestId(args.request);
  const runtimeCorrelationId = args.runtimeCorrelationId ?? getRuntimeCorrelationId(args.request);
  const tenantId = args.tenantId ?? (args.auth?.tenant_id || null);

  const payload = {
    timestamp: nowIso(),
    service: args.service ?? "wathiqcare-web",
    module: args.module,
    operation: args.operation ?? args.event,
    severity: args.severity,
    event: args.event,
    requestId,
    runtimeCorrelationId,
    userId: args.auth?.sub ? `u_${hashIdentifier(args.auth.sub)}` : null,
    tenantId: tenantId ? `t_${hashIdentifier(tenantId)}` : null,
    durationMs: args.durationMs ?? null,
    details: sanitizeLogDetails(args.details ?? {}),
  };

  const serialized = JSON.stringify(payload);

  switch (args.severity) {
    case "critical":
    case "error":
      console.error("RUNTIME_EVENT", serialized);
      break;
    case "warn":
      console.warn("RUNTIME_EVENT", serialized);
      break;
    case "debug":
    case "trace":
      console.debug("RUNTIME_EVENT", serialized);
      break;
    default:
      console.info("RUNTIME_EVENT", serialized);
  }
}

export function logRuntimeIncident(args: {
  request?: NextRequest | null;
  auth?: Pick<AuthContext, "sub"> | null;
  module: string;
  type: RuntimeIncidentType;
  operation?: string;
  error?: unknown;
  details?: Record<string, unknown>;
  runtimeCorrelationId?: string;
  tenantId?: string | null;
  durationMs?: number;
}): void {
  const errorName = args.error instanceof Error ? args.error.name : "UnknownError";
  const errorMessage = args.error instanceof Error ? args.error.message : args.error ? String(args.error) : "incident";

  logRuntimeEvent({
    request: args.request,
    auth: args.auth,
    module: args.module,
    operation: args.operation,
    event: args.type,
    severity: "error",
    runtimeCorrelationId: args.runtimeCorrelationId,
    tenantId: args.tenantId,
    durationMs: args.durationMs,
    details: {
      errorName,
      errorMessage,
      ...args.details,
    },
  });
}
