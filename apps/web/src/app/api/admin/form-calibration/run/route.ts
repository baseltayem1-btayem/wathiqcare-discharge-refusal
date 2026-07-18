import { NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { CalibrationEngine } from "@/lib/server/form-auto-calibration/engine/calibration-engine";
import { PrismaCandidateRegistry } from "@/lib/server/form-auto-calibration/registry/prisma-candidate-registry";
import { IMC_APPROVED_CONSENT_FORMS_MANIFEST } from "@/lib/server/imc-approved-consent-forms.manifest";
import fs from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const APPROVED_FORMS_DIR = path.join(process.cwd(), "public", "approved-consent-forms");

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAccess(request);
  const tenantId = auth.tenant_id ?? "";

  const body = (await request.json()) as {
    manifestId?: string;
    sourceFormIds?: string[];
    jobType?: string;
  };

  const prisma = getPrisma();
  let sourceFormIds: string[] = body.sourceFormIds ?? [];

  if (body.manifestId) {
    const manifest = await prisma.formCalibrationManifest.findFirst({
      where: { id: body.manifestId, tenantId },
    });
    if (!manifest) {
      return NextResponse.json({ ok: false, error: "Manifest not found" }, { status: 404 });
    }
    sourceFormIds = manifest.sourceFormIds;
  }

  if (sourceFormIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No source forms provided" },
      { status: 400 },
    );
  }

  const job = await prisma.formCalibrationJob.create({
    data: {
      tenantId,
      startedByUserId: auth.sub,
      jobType: body.jobType ?? "dry_run",
      totalForms: sourceFormIds.length,
      status: "RUNNING",
    },
  });

  const registry = new PrismaCandidateRegistry(prisma, tenantId, job.id);
  const engine = new CalibrationEngine({ registry });
  const results: Array<{
    sourceFormId: string;
    candidateId: string;
    status: string;
    score: number;
    unmappedRequiredKeys: string[];
    error?: string;
  }> = [];

  for (const sourceFormId of sourceFormIds) {
    const manifestItem = IMC_APPROVED_CONSENT_FORMS_MANIFEST.find((item) => item.id === sourceFormId);
    if (!manifestItem) {
      results.push({
        sourceFormId,
        candidateId: "",
        status: "error",
        score: 0,
        unmappedRequiredKeys: [],
        error: "Manifest item not found",
      });
      continue;
    }

    const filePath = path.join(APPROVED_FORMS_DIR, manifestItem.sourceFile);
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch (err) {
      results.push({
        sourceFormId,
        candidateId: "",
        status: "error",
        score: 0,
        unmappedRequiredKeys: [],
        error: `Could not read PDF: ${(err as Error).message}`,
      });
      continue;
    }

    try {
      const result = await engine.calibrate({
        sourceFormId,
        sourceFileName: manifestItem.sourceFile,
        pdfBuffer: buffer,
      });

      results.push({ ...result, sourceFormId });
    } catch (err) {
      results.push({
        sourceFormId,
        candidateId: "",
        status: "error",
        score: 0,
        unmappedRequiredKeys: [],
        error: (err as Error).message,
      });
    }
  }

  const statusCounts = {
    approved: results.filter((r) => r.status === "auto_review_candidate").length,
    assisted: results.filter((r) => r.status === "assisted_review").length,
    manual: results.filter((r) => r.status === "manual_calibration_required").length,
    errors: results.filter((r) => r.status === "error").length,
  };

  await prisma.formCalibrationJob.update({
    where: { id: job.id },
    data: {
      status: statusCounts.errors > 0 ? "FAILED" : "COMPLETED",
      processedForms: results.filter((r) => r.status !== "error").length,
      approvedCount: statusCounts.approved,
      assistedCount: statusCounts.assisted,
      manualCount: statusCounts.manual,
      errorCount: statusCounts.errors,
      completedAt: new Date(),
      logSummary: { results },
    },
  });

  return NextResponse.json({ ok: true, jobId: job.id, results });
}
