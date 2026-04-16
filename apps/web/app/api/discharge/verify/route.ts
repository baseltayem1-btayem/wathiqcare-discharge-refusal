import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";
import { jsonError } from "@/lib/server/http";

function buildVerifyPath(search: string): string {
  return `/api/discharge/verify${search}`;
}

export async function GET(request: NextRequest) {
  const bundleId = request.nextUrl.searchParams.get("bundleId")?.trim();
  if (!bundleId) {
    return jsonError(400, "bundleId query parameter is required");
  }

  return forwardToBackend(request, buildVerifyPath(request.nextUrl.search));
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, buildVerifyPath(request.nextUrl.search));
}
