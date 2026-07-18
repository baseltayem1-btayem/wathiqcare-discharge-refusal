-- Create enums
CREATE TYPE "calibration_job_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "calibration_candidate_status" AS ENUM ('PENDING', 'AUTO_REVIEW_CANDIDATE', 'ASSISTED_REVIEW', 'MANUAL_CALIBRATION_REQUIRED', 'APPROVED', 'REJECTED');
CREATE TYPE "calibration_review_decision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_MANUAL');

-- Create manifest table
CREATE TABLE "form_calibration_manifests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source_form_ids" TEXT[] NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_calibration_manifests_pkey" PRIMARY KEY ("id")
);

-- Create jobs table
CREATE TABLE "form_calibration_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "started_by_user_id" TEXT NOT NULL,
    "status" "calibration_job_status" NOT NULL DEFAULT 'PENDING',
    "job_type" TEXT NOT NULL,
    "total_forms" INTEGER NOT NULL DEFAULT 0,
    "processed_forms" INTEGER NOT NULL DEFAULT 0,
    "approved_count" INTEGER NOT NULL DEFAULT 0,
    "assisted_count" INTEGER NOT NULL DEFAULT 0,
    "manual_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "manifest_id" TEXT,
    "log_summary" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "form_calibration_jobs_pkey" PRIMARY KEY ("id")
);

-- Create candidates table
CREATE TABLE "form_calibration_candidates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "source_form_id" TEXT NOT NULL,
    "source_file_name" TEXT NOT NULL,
    "status" "calibration_candidate_status" NOT NULL DEFAULT 'PENDING',
    "layout_family" TEXT,
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "quality_report" JSONB,
    "confidence" JSONB,
    "mappings" JSONB,
    "synthetic_render_url" TEXT,
    "reviewed_by_user_id" TEXT,
    "review_decision" "calibration_review_decision",
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_calibration_candidates_pkey" PRIMARY KEY ("id")
);

-- Foreign keys and indexes
CREATE INDEX "form_calibration_jobs_tenant_id_status_idx" ON "form_calibration_jobs"("tenant_id", "status");
CREATE INDEX "form_calibration_jobs_tenant_id_started_at_idx" ON "form_calibration_jobs"("tenant_id", "started_at");

CREATE INDEX "form_calibration_candidates_tenant_id_status_idx" ON "form_calibration_candidates"("tenant_id", "status");
CREATE INDEX "form_calibration_candidates_tenant_id_job_id_idx" ON "form_calibration_candidates"("tenant_id", "job_id");
CREATE INDEX "form_calibration_candidates_tenant_id_source_form_id_idx" ON "form_calibration_candidates"("tenant_id", "source_form_id");

CREATE INDEX "form_calibration_manifests_tenant_id_is_active_idx" ON "form_calibration_manifests"("tenant_id", "is_active");

ALTER TABLE "form_calibration_jobs" ADD CONSTRAINT "form_calibration_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_calibration_jobs" ADD CONSTRAINT "form_calibration_jobs_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "form_calibration_manifests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "form_calibration_candidates" ADD CONSTRAINT "form_calibration_candidates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_calibration_candidates" ADD CONSTRAINT "form_calibration_candidates_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "form_calibration_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_calibration_candidates" ADD CONSTRAINT "form_calibration_candidates_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "form_calibration_manifests" ADD CONSTRAINT "form_calibration_manifests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
