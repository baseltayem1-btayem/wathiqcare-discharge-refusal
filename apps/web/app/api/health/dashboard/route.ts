import { NextResponse } from "next/server";
import { MODULE_DEFINITIONS } from "@/lib/modules/catalog";
import { getSessionCookieName } from "@/lib/server/sessionCookie";
import { getRuntimeDiagnosticsSnapshot, getRuntimeEnvPresence, probePrismaConnectivity } from "@/lib/server/runtime-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const diagnostics = getRuntimeDiagnosticsSnapshot();
  const envPresence = getRuntimeEnvPresence();
  const missingEnv = envPresence.filter((item) => !item.present).map((item) => item.key);

  let dbState: { status: "ok" | "down"; latencyMs: number | null; message?: string } = {
    status: "ok",
    latencyMs: null,
  };
  try {
    const db = await probePrismaConnectivity(Number(process.env.HEALTH_DB_TIMEOUT_MS || 2500));
    dbState = { status: "ok", latencyMs: db.latencyMs };
  } catch (error) {
    dbState = {
      status: "down",
      latencyMs: null,
      message: error instanceof Error ? error.message : "Database probe failed",
    };
  }

  const authState = {
    status:
      hasValue(process.env.NEXTAUTH_SECRET) && hasValue(process.env.NEXTAUTH_URL)
        ? "ok"
        : "degraded",
    sessionCookieName: getSessionCookieName(),
    nextAuthConfigured: hasValue(process.env.NEXTAUTH_SECRET) && hasValue(process.env.NEXTAUTH_URL),
  };

  const moduleAvailability = MODULE_DEFINITIONS.map((moduleItem) => ({
    key: moduleItem.key,
    status: diagnostics.modes.maintenanceMode ? "unavailable" : diagnostics.modes.degradedMode ? "degraded" : "available",
  }));

  const degraded =
    dbState.status !== "ok"
    || authState.status !== "ok"
    || missingEnv.length > 0
    || diagnostics.modes.maintenanceMode
    || diagnostics.modes.readonlyMode
    || diagnostics.modes.degradedMode;

  return NextResponse.json(
    {
      status: degraded ? "degraded" : "ok",
      summary: {
        moduleAvailability,
        dbConnectivity: dbState,
        authState,
        pdfEngineState: diagnostics.pdfEngine,
      },
      runtime: {
        modes: diagnostics.modes,
        metrics: diagnostics.metrics,
        missingRequiredEnv: missingEnv,
      },
    },
    { status: degraded ? 503 : 200 },
  );
}
