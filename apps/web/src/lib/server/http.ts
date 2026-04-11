import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
};

export function jsonSuccess<T>(data: T, init: JsonResponseInit = {}) {
  const traceId = buildTraceId();
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
  const traceId = buildTraceId();
  const timestamp = new Date().toISOString();

  return NextResponse.json(
    {
      success: false,
      data: null,
      error: detail,
      traceId,
      timestamp,
      detail,
      message: detail,
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

function readPrismaMeta(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const meta = (error as { meta?: unknown }).meta;
  return meta && typeof meta === "object" ? (meta as Record<string, unknown>) : null;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.message);
  }

  const prismaCode = readPrismaCode(error);
  if (prismaCode === "P2002") {
    const meta = readPrismaMeta(error);
    const target = Array.isArray(meta?.target)
      ? (meta?.target as unknown[]).join(", ")
      : typeof meta?.target === "string"
        ? meta.target
        : "unique field";
    return jsonError(409, `Duplicate value for ${target}`);
  }
  if (prismaCode === "P2003") {
    return jsonError(400, "Related record is missing or invalid");
  }
  if (prismaCode === "P2025") {
    return jsonError(404, "Requested record was not found");
  }
  if (prismaCode === "P2011" || prismaCode === "P2012") {
    return jsonError(400, "Required field is missing");
  }

  const status = readStatus(error);
  const message = readMessage(error);
  if (status && message) {
    return jsonError(status, message);
  }

  console.error("API route error", error);
  return jsonError(500, "Internal server error");
}
