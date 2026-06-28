/**
 * Module background-jobs runner (Pilot).
 *
 * Polls the webhook_events queue for internal-job-runner rows and executes
 * the requested job.  For the Pilot phase most handlers are intentionally
 * no-ops/stubs; the queue infrastructure is wired and logs every attempt so
 * operators can run the equivalent procedures manually and verify queue health.
 *
 * Usage:
 *   npx tsx apps/worker/module-jobs-runner.ts
 *
 * The runner respects FF_ENABLE_BACKGROUND_JOBS: if the feature flag resolves
 * to false it logs a warning and exits, because jobs are not enqueued in that
 * state.
 */

import { getPrisma } from "../web/src/lib/server/prisma";
import { resolveFeatureFlag } from "../web/src/lib/server/tenant-flag-service";
import type { ModuleJobType } from "../web/src/lib/server/module-jobs-service";

const POLL_INTERVAL_MS = Number(process.env.JOB_RUNNER_POLL_MS || "30000");
const BATCH_SIZE = Number(process.env.JOB_RUNNER_BATCH_SIZE || "10");
const LOCK_TIMEOUT_MS = Number(process.env.JOB_RUNNER_LOCK_TIMEOUT_MS || "300000");

const JOB_EVENT_PREFIX = "job:";

interface QueuedJobRow {
  id: string;
  tenant_id: string;
  event_type: string;
  raw_payload: Record<string, unknown>;
  created_at: Date;
  attempts?: number | null;
  processing_error?: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jobsEnabled(tenantId: string): Promise<boolean> {
  try {
    const resolution = await resolveFeatureFlag("ENABLE_BACKGROUND_JOBS", tenantId);
    return resolution.resolvedValue;
  } catch {
    return false;
  }
}

async function claimNextBatch(prisma: ReturnType<typeof getPrisma>): Promise<QueuedJobRow[]> {
  const lockUntil = new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString();

  const rows = await prisma.$queryRawUnsafe<
    Array<QueuedJobRow & { locked_until: string | null }>
  >(
    `UPDATE webhook_events
     SET locked_until = $1,
         attempts = COALESCE(attempts, 0) + 1
     WHERE id IN (
       SELECT id
       FROM webhook_events
       WHERE provider_key = 'internal-job-runner'
         AND processed = FALSE
         AND (locked_until IS NULL OR locked_until <= NOW())
       ORDER BY created_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, tenant_id, event_type, raw_payload, created_at, attempts, processing_error, locked_until`,
    lockUntil,
    BATCH_SIZE,
  );

  return rows;
}

async function markProcessed(
  prisma: ReturnType<typeof getPrisma>,
  id: string,
  errorMessage: string | null,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE webhook_events
     SET processed = TRUE,
         processed_at = NOW(),
         processing_error = $2,
         locked_until = NULL
     WHERE id = $1`,
    id,
    errorMessage,
  );
}

async function releaseLock(
  prisma: ReturnType<typeof getPrisma>,
  id: string,
  errorMessage: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE webhook_events
     SET locked_until = NULL,
         processing_error = $2
     WHERE id = $1`,
    id,
    errorMessage,
  );
}

const handlers: Record<
  ModuleJobType,
  (tenantId: string, payload: Record<string, unknown>) => Promise<string>
> = {
  async expired_signature_link_cleanup(tenantId: string) {
    const prisma = getPrisma();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await prisma.$executeRawUnsafe(
      `UPDATE signing_session
       SET status = 'EXPIRED',
           updated_at = NOW()
       WHERE tenant_id = $1
         AND status = 'PENDING'
         AND created_at < $2`,
      tenantId,
      cutoff,
    );
    return `Expired ${result} stale signing sessions older than ${cutoff.toISOString()}`;
  },

  async pdf_evidence_package_generation() {
    return "Stub: pdf_evidence_package_generation is a manual pilot procedure";
  },

  async signed_pdf_retrieval() {
    return "Stub: signed_pdf_retrieval is a manual pilot procedure";
  },

  async audit_export() {
    return "Stub: audit_export is a manual pilot procedure";
  },

  async analytics_aggregation() {
    return "Stub: analytics_aggregation is a manual pilot procedure";
  },

  async retention_policy_processing() {
    return "Stub: retention_policy_processing is a manual pilot procedure";
  },
};

async function executeJob(row: QueuedJobRow): Promise<{ ok: boolean; message: string }> {
  if (!(await jobsEnabled(row.tenant_id))) {
    return {
      ok: false,
      message: `Background jobs disabled for tenant ${row.tenant_id}; skipping`,
    };
  }

  const jobType = row.event_type.replace(JOB_EVENT_PREFIX, "") as ModuleJobType;
  const handler = handlers[jobType];
  if (!handler) {
    return { ok: false, message: `Unknown job type: ${jobType}` };
  }

  const message = await handler(row.tenant_id, row.raw_payload);
  return { ok: true, message };
}

async function runOnce(): Promise<number> {
  const prisma = getPrisma();
  const rows = await claimNextBatch(prisma);

  for (const row of rows) {
    try {
      const result = await executeJob(row);
      if (result.ok) {
        await markProcessed(prisma, row.id, null);
        console.log(`[job-runner] processed ${row.event_type} (${row.id}): ${result.message}`);
      } else {
        await releaseLock(prisma, row.id, result.message);
        console.warn(`[job-runner] skipped ${row.event_type} (${row.id}): ${result.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await releaseLock(prisma, row.id, message);
      console.error(`[job-runner] failed ${row.event_type} (${row.id}): ${message}`);
    }
  }

  return rows.length;
}

async function main() {
  console.log("[job-runner] Module background-jobs runner starting");

  let running = true;
  const stop = () => {
    running = false;
    console.log("[job-runner] Shutdown signal received");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (running) {
    try {
      const processed = await runOnce();
      if (processed > 0) {
        continue;
      }
    } catch (error) {
      console.error("[job-runner] poll cycle error", error);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  console.log("[job-runner] Exiting");
  process.exit(0);
}

main().catch((error) => {
  console.error("[job-runner] Fatal error", error);
  process.exit(1);
});
