import { NextResponse } from "next/server";
import { probePrismaConnectivity } from "@/lib/server/runtime-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const prisma = await probePrismaConnectivity(Number(process.env.HEALTH_DB_TIMEOUT_MS || 2000));
    return NextResponse.json({
      status: "ok",
      service: "frontend",
      role: "api-proxy-host",
      checks: {
        db: "/api/health/db",
        auth: "/api/health/auth",
        runtime: "/api/health/runtime",
        dashboard: "/api/health/dashboard",
      },
      database: {
        status: "ok",
        latencyMs: prisma.latencyMs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "frontend",
        role: "api-proxy-host",
        checks: {
          db: "/api/health/db",
          auth: "/api/health/auth",
          runtime: "/api/health/runtime",
          dashboard: "/api/health/dashboard",
        },
        database: {
          status: "unavailable",
          error: error instanceof Error ? error.message : "Database probe failed",
        },
      },
      { status: 503 },
    );
  }
}
