import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(status: number, detail: string) {
  return NextResponse.json({ detail }, { status });
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

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.message);
  }

  const status = readStatus(error);
  const message = readMessage(error);
  if (status && message) {
    return jsonError(status, message);
  }

  console.error("API route error", error);
  return jsonError(500, "Internal server error");
}
