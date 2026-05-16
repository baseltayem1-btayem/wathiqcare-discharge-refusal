import { BackupJobStatus, DataClassification } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { assertDataResidencyCompliance } from "@/lib/server/privacy-service";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

function parseBackupStatus(value: string | null | undefined): BackupJobStatus {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized in BackupJobStatus) {
    return BackupJobStatus[normalized as keyof typeof BackupJobStatus];
  }
  return BackupJobStatus.SCHEDULED;
}

export function summarizeBackupReadiness(
  jobs: Array<{
    status: BackupJobStatus | string;
    encrypted?: boolean | null;
    restoreVerifiedAt?: Date | string | null;
    region?: string | null;
    completedAt?: Date | string | null;
  }>,
  restoreTests: Array<{ resultStatus?: string | null }>,
) {
  const totalJobs = jobs.length;
  const successfulJobs = jobs.filter((job) => String(job.status).toUpperCase() === "SUCCEEDED").length;
  const failedJobs = jobs.filter((job) => String(job.status).toUpperCase() === "FAILED").length;
  const encryptedJobs = jobs.filter((job) => Boolean(job.encrypted)).length;
  const restoreVerifiedJobs = jobs.filter((job) => Boolean(job.restoreVerifiedAt)).length;
  const restorePassCount = restoreTests.filter((test) => String(test.resultStatus ?? "").toUpperCase() === "PASSED").length;

  return {
    totalJobs,
    successfulJobs,
    failedJobs,
    encryptedJobs,
    restoreVerifiedJobs,
    restorePassCount,
    latestRegion: jobs[0]?.region ?? null,
    latestSuccessfulAt:
      jobs.find((job) => String(job.status).toUpperCase() === "SUCCEEDED")?.completedAt ?? null,
  };
}

export async function getBackupDashboard(tenantId: string) {
  const [jobs, restoreTests] = await Promise.all([
    prisma().backupJob.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    prisma().backupRestoreTest.findMany({ where: { tenantId }, orderBy: { executedAt: "desc" }, take: 50 }).catch(() => []),
  ]);

  const summary = summarizeBackupReadiness(jobs, restoreTests);

  return {
    latestBackup: jobs[0] ?? null,
    restoreTests,
    jobs,
    summary,
    metrics: {
      totalJobs: summary.totalJobs,
      successfulJobs: summary.successfulJobs,
      failedJobs: summary.failedJobs,
      restorePassCount: summary.restorePassCount,
    },
    targets: {
      rpoMinutes: 60,
      rtoMinutes: 240,
    },
  };
}

export async function createBackupJob(
  auth: AuthContext,
  payload: {
    backupType?: string;
    storageLocation?: string;
    region?: string;
    encrypted?: boolean;
    status?: string;
    restoreResultStatus?: string;
    restoreNotes?: string;
  },
  request?: NextRequest,
) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }
  if (!payload.storageLocation?.trim()) {
    throw new ApiError(400, "storageLocation is required");
  }

  await assertDataResidencyCompliance({
    tenantId: auth.tenant_id,
    dataType: "BACKUP",
    operation: "backup_job_create",
    destinationRegion: payload.region,
  });

  const job = await prisma().backupJob.create({
    data: {
      tenantId: auth.tenant_id,
      classification: DataClassification.BACKUP,
      backupType: payload.backupType?.trim() || "scheduled_snapshot",
      storageLocation: payload.storageLocation.trim(),
      region: payload.region?.trim() || "saudi-arabia-riyadh",
      encrypted: payload.encrypted !== false,
      status: parseBackupStatus(payload.status),
      startedAt: new Date(),
      completedAt: payload.status?.toUpperCase() === "SUCCEEDED" ? new Date() : null,
      restoreVerifiedAt: payload.restoreResultStatus?.trim() ? new Date() : null,
    },
  });

  if (payload.restoreResultStatus?.trim()) {
    await prisma().backupRestoreTest.create({
      data: {
        tenantId: auth.tenant_id,
        backupJobId: job.id,
        resultStatus: payload.restoreResultStatus.trim(),
        rpoMinutes: 60,
        rtoMinutes: 240,
        notes: payload.restoreNotes?.trim() || null,
      },
    }).catch(() => undefined);
  }

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "backup_job",
    entityId: job.id,
    action: "backup_job_registered",
    details: `Backup job ${job.status}`,
    metadataJson: {
      region: job.region,
      encrypted: job.encrypted,
    },
    request,
  }).catch(() => undefined);

  return job;
}