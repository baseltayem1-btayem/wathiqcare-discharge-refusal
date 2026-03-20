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

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.message);
  }

  console.error("API route error", error);
  return jsonError(500, "Internal server error");
}
