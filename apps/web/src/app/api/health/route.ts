import { NextResponse } from "next/server";
import { getRuntimeMetricsSnapshot } from "@/lib/server/runtime-observability";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const metrics = getRuntimeMetricsSnapshot();
  const health = {
    status: "ok",
    service: "wathiqcare-web",
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
    checks: {
      runtime: true,
    },
    metrics,
  };
  return NextResponse.json(health, { status: 200 });
}
