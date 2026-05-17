import { NextResponse } from "next/server";
import { probePrismaConnectivity, resolveDirectRuntimeDbUrl, resolvePooledRuntimeDbUrl, parseDbConnectionConfig } from "@/lib/server/runtime-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const pooled = resolvePooledRuntimeDbUrl();
  const direct = resolveDirectRuntimeDbUrl();

  try {
    const prisma = await probePrismaConnectivity(Number(process.env.HEALTH_DB_TIMEOUT_MS || 2500));
    return NextResponse.json({
      status: "ok",
      prisma,
      pooled: {
        source: pooled?.source ?? null,
        ...parseDbConnectionConfig(pooled?.value ?? null),
      },
      direct: {
        source: direct?.source ?? null,
        ...parseDbConnectionConfig(direct?.value ?? null),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        prisma: {
          ok: false,
          error: error instanceof Error ? error.message : "Database probe failed",
        },
        pooled: {
          source: pooled?.source ?? null,
          ...parseDbConnectionConfig(pooled?.value ?? null),
        },
        direct: {
          source: direct?.source ?? null,
          ...parseDbConnectionConfig(direct?.value ?? null),
        },
      },
      { status: 503 },
    );
  }
}
