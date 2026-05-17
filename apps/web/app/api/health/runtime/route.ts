import { NextResponse } from "next/server";
import { buildRuntimeFingerprint, getRuntimeDiagnosticsSnapshot, getRuntimeEnvPresence } from "@/lib/server/runtime-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const envPresence = getRuntimeEnvPresence();
  const missing = envPresence.filter((item) => !item.present).map((item) => item.key);
  const diagnostics = getRuntimeDiagnosticsSnapshot();
  const hasOperationalMode = diagnostics.modes.maintenanceMode || diagnostics.modes.degradedMode || diagnostics.modes.readonlyMode;
  const degraded = missing.length > 0 || hasOperationalMode;

  return NextResponse.json(
    {
      status: degraded ? "degraded" : "ok",
      deployment: {
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelUrl: process.env.VERCEL_URL ?? null,
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      },
      runtime: {
        nodeEnv: process.env.NODE_ENV ?? null,
        fingerprint: buildRuntimeFingerprint(),
        envPresence,
      },
      diagnostics: {
        missingRequiredKeys: missing,
        modes: diagnostics.modes,
        metrics: diagnostics.metrics,
        pdfEngine: diagnostics.pdfEngine,
      },
    },
    { status: degraded ? 503 : 200 },
  );
}
