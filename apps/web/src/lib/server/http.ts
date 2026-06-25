import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  statusCode: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    options?: {
      code?: string;
      fields?: Record<string, string>;
    },
  ) {
    super(message);
    this.status = status;
    this.statusCode = status;
    this.code = options?.code;
    this.fields = options?.fields;
  }
}

function buildTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `trace-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

type JsonResponseInit = {
  status?: number;
  headers?: HeadersInit;
  traceId?: string;
  code?: string;
  fields?: Record<string, string>;
};

function resolveTraceId(init: JsonResponseInit = {}): string {
  const requestedTraceId = init.traceId?.trim();
  return requestedTraceId && requestedTraceId.length > 0 ? requestedTraceId : buildTraceId();
}

type FailureLogContext = {
  traceId: string;
  status: number;
  message: string;
  error: unknown;
  code?: string | null;
};

export function logApiFailure(context: FailureLogContext): void {
  const payload = {
    traceId: context.traceId,
    status: context.status,
    message: context.message,
    code: context.code ?? null,
    errorName: context.error instanceof Error ? context.error.name : undefined,
  };

  if (context.status >= 500) {
    console.error("API_FAILURE", payload, context.error);
    return;
  }

  console.warn("API_FAILURE", payload);
}

export function jsonSuccess<T>(data: T, init: JsonResponseInit = {}) {
  const traceId = resolveTraceId(init);
  const timestamp = new Date().toISOString();
  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>) }
      : {};

  return NextResponse.json(
    {
      success: true,
      data,
      error: null,
      traceId,
      timestamp,
      ...payload,
    },
    {
      status: init.status ?? 200,
      headers: {
        "x-trace-id": traceId,
        ...(init.headers ?? {}),
      },
    },
  );
}

export function jsonError(status: number, detail: string, init: JsonResponseInit = {}) {
  const traceId = resolveTraceId(init);
  const timestamp = new Date().toISOString();
  const errorCode = init.code;
  const fields = init.fields;

  return NextResponse.json(
    {
      success: false,
      data: null,
      error: detail,
      traceId,
      timestamp,
      detail,
      message: detail,
      ...(errorCode ? { code: errorCode } : {}),
      ...(fields ? { fields } : {}),
    },
    {
      status,
      headers: {
        "x-trace-id": traceId,
        ...(init.headers ?? {}),
      },
    },
  );
}

function readStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const status = (error as { status?: unknown; statusCode?: unknown }).status;
  const statusCode = (error as { status?: unknown; statusCode?: unknown }).statusCode;
  const candidate = typeof status === "number" ? status : statusCode;

  if (
    typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate >= 400 &&
    candidate <= 599
  ) {
    return candidate;
  }

  return null;
}

function readMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const message = (error as { message?: unknown; detail?: unknown }).message;
  const detail = (error as { message?: unknown; detail?: unknown }).detail;
  const candidate = typeof message === "string" && message.length > 0 ? message : detail;

  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function readPrismaCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.length > 0 ? code : null;
}

function readErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.length > 0 ? code : null;
}

function readPrismaMeta(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const meta = (error as { meta?: unknown }).meta;
  return meta && typeof meta === "object" ? (meta as Record<string, unknown>) : null;
}

export function handleApiError(error: unknown) {
  const traceId = buildTraceId();

  if (error instanceof ApiError) {
    logApiFailure({
      traceId,
      status: error.status,
      message: error.message,
      error,
    });
    return jsonError(error.status, error.message, {
      traceId,
      ...(error.code ? { code: error.code } : {}),
      ...(error.fields ? { fields: error.fields } : {}),
    });
  }

  const domainCode = readErrorCode(error);
  if (domainCode === "SIGNATURE_EXPIRED") {
    const message = "Invalid or expired signing token";
    logApiFailure({ traceId, status: 404, message, error, code: domainCode });
    return jsonError(404, message, { traceId, code: domainCode });
  }

  const prismaCode = readPrismaCode(error);
  if (prismaCode === "P2002") {
    const meta = readPrismaMeta(error);
    const target = Array.isArray(meta?.target)
      ? (meta?.target as unknown[]).join(", ")
      : typeof meta?.target === "string"
        ? meta.target
        : "unique field";
    const message = `Duplicate value for ${target}`;
    logApiFailure({ traceId, status: 409, message, error, code: prismaCode });
    return jsonError(409, message, { traceId });
  }
  if (prismaCode === "P2003") {
    const message = "Related record is missing or invalid";
    logApiFailure({ traceId, status: 400, message, error, code: prismaCode });
    return jsonError(400, message, { traceId });
  }
  if (prismaCode === "P2025") {
    const message = "Requested record was not found";
    logApiFailure({ traceId, status: 404, message, error, code: prismaCode });
    return jsonError(404, message, { traceId });
  }
  if (prismaCode === "P2021" || prismaCode === "P2022") {
    const message = "Database schema is not ready — pending migrations";
    logApiFailure({ traceId, status: 503, message, error, code: prismaCode });
    return jsonError(503, message, { traceId });
  }
  if (prismaCode === "P2011" || prismaCode === "P2012") {
    const message = "Required field is missing";
    logApiFailure({ traceId, status: 400, message, error, code: prismaCode });
    return jsonError(400, message, { traceId });
  }

  const status = readStatus(error);
  const message = readMessage(error);
  if (status && message) {
    logApiFailure({ traceId, status, message, error, code: prismaCode });
    return jsonError(status, message, { traceId });
  }

  logApiFailure({
    traceId,
    status: 500,
    message: "Internal server error",
    error,
    code: prismaCode,
  });
  return jsonError(500, "Internal server error", { traceId });
}
