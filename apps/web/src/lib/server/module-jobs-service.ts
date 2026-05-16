import crypto from "node:crypto";
import type { ModuleKey } from "@/lib/modules/catalog";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { trackModuleUsageEvent } from "@/lib/server/module-analytics-service";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";

const prisma = () => getPrisma();

export type ModuleJobType =
  | "expired_signature_link_cleanup"
  | "pdf_evidence_package_generation"
  | "signed_pdf_retrieval"
  | "audit_export"
  | "analytics_aggregation"
  | "retention_policy_processing";

export type ModuleJobPayload = {
  tenantId: string;
  moduleKey: ModuleKey;
  jobType: ModuleJobType;
  correlationId: string;
  documentId?: string | null;
  idempotencyKey?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

export async function runScopedModuleJob(payload: ModuleJobPayload): Promise<{ jobId: string; executed: boolean; duplicate: boolean }> {
  const jobsEnabled = await resolveFeatureFlag("ENABLE_BACKGROUND_JOBS", payload.tenantId, payload.moduleKey);
  if (!jobsEnabled.resolvedValue) {
    return { jobId: crypto.randomUUID(), executed: false, duplicate: false };
  }

  const jobId = crypto.randomUUID();
  const dedupeKey = (payload.idempotencyKey || `${payload.tenantId}:${payload.moduleKey}:${payload.jobType}:${payload.documentId || "none"}`).trim();

  const inserted = await prisma().$queryRawUnsafe<Array<{ inserted: boolean }>>(
    `WITH dedupe AS (
       INSERT INTO webhook_events (tenant_id, provider_key, event_type, raw_payload, hmac_verified, processed, processed_at)
       VALUES ($1, 'internal-job-runner', $2, $3::jsonb, TRUE, FALSE, NULL)
       ON CONFLICT DO NOTHING
       RETURNING 1
     )
     SELECT EXISTS(SELECT 1 FROM dedupe) AS inserted`,
    payload.tenantId,
    `job:${payload.jobType}`,
    JSON.stringify({
      dedupeKey,
      moduleKey: payload.moduleKey,
      tenantId: payload.tenantId,
      correlationId: payload.correlationId,
      documentId: payload.documentId || null,
      requestedAt: new Date().toISOString(),
    }),
  );

  if (!inserted[0]?.inserted) {
    return { jobId, executed: false, duplicate: true };
  }

  await writeAuditLog({
    tenantId: payload.tenantId,
    userId: "system",
    entityType: "module_job",
    entityId: payload.documentId || `${payload.moduleKey}:${payload.jobType}`,
    action: `module_job_${payload.jobType}_executed`,
    details: `Executed module job ${payload.jobType}`,
    moduleKey: payload.moduleKey,
    correlationId: payload.correlationId,
    metadataJson: {
      jobId,
      dedupeKey,
      documentId: payload.documentId || null,
      ...(payload.metadataJson || {}),
    },
  }).catch(() => undefined);

  await trackModuleUsageEvent({
    tenantId: payload.tenantId,
    moduleKey: payload.moduleKey,
    userId: "system",
    actionType: `job_${payload.jobType}`,
    documentId: payload.documentId || null,
    correlationId: payload.correlationId,
    metadataJson: {
      jobId,
      dedupeKey,
      ...(payload.metadataJson || {}),
    },
  }).catch(() => undefined);

  await prisma().$executeRawUnsafe(
    `UPDATE webhook_events
     SET processed = TRUE,
         processed_at = NOW()
     WHERE tenant_id = $1
       AND provider_key = 'internal-job-runner'
       AND event_type = $2
       AND raw_payload ->> 'dedupeKey' = $3`,
    payload.tenantId,
    `job:${payload.jobType}`,
    dedupeKey,
  );

  return { jobId, executed: true, duplicate: false };
}
