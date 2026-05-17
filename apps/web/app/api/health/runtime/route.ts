import { NextResponse } from "next/server";
import { buildRuntimeFingerprint, getRuntimeEnvPresence } from "@/lib/server/runtime-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const envPresence = getRuntimeEnvPresence();
  const missing = envPresence.filter((item) => !item.present).map((item) => item.key);

  return NextResponse.json(
    {
      status: missing.length === 0 ? "ok" : "degraded",
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
      },
    },
    { status: missing.length === 0 ? 200 : 503 },
  );
}
