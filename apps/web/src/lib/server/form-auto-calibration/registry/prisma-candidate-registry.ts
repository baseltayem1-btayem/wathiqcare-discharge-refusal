/**
 * Prisma-backed candidate registry.
 */

import type { PrismaClient } from "@prisma/client";
import type { CalibrationCandidate, CandidateRegistry } from "./candidate-registry";
import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";
import type { CalibrationQualityReport } from "../mapping/mapping-schema";
import type { CandidateConfidence } from "../confidence/confidence-aggregation";

export class PrismaCandidateRegistry implements CandidateRegistry {
  constructor(
    private prisma: PrismaClient,
    private tenantId: string,
    private jobId?: string,
  ) {}

  async create(
    candidate: Omit<CalibrationCandidate, "id" | "createdAt" | "updatedAt">,
  ): Promise<CalibrationCandidate> {
    const created = await this.prisma.formCalibrationCandidate.create({
      data: {
        tenantId: this.tenantId,
        jobId: this.jobId ?? "",
        sourceFormId: candidate.sourceFormId,
        sourceFileName: candidate.sourceFileName,
        status: mapStatus(candidate.status),
        qualityScore: candidate.qualityReport.score,
        qualityReport: candidate.qualityReport as any,
        confidence: candidate.confidence as any,
        mappings: candidate.mappings as any,
      },
    });

    return mapToDomain(created);
  }

  async update(
    id: string,
    patch: Partial<CalibrationCandidate>,
  ): Promise<CalibrationCandidate | null> {
    const existing = await this.prisma.formCalibrationCandidate.findFirst({
      where: { id, tenantId: this.tenantId },
    });
    if (!existing) return null;

    const updated = await this.prisma.formCalibrationCandidate.update({
      where: { id },
      data: {
        ...(patch.status ? { status: mapStatus(patch.status) } : {}),
        ...(patch.qualityReport ? { qualityScore: patch.qualityReport.score, qualityReport: patch.qualityReport as any } : {}),
        ...(patch.confidence ? { confidence: patch.confidence as any } : {}),
        ...(patch.mappings ? { mappings: patch.mappings as any } : {}),
        ...(patch.syntheticRenderUrl ? { syntheticRenderUrl: patch.syntheticRenderUrl } : {}),
        ...(patch.reviewDecision ? { reviewDecision: patch.reviewDecision as any } : {}),
        ...(patch.reviewNotes ? { reviewNotes: patch.reviewNotes } : {}),
      },
    });

    return mapToDomain(updated);
  }

  async get(id: string): Promise<CalibrationCandidate | null> {
    const row = await this.prisma.formCalibrationCandidate.findFirst({
      where: { id, tenantId: this.tenantId },
    });
    return row ? mapToDomain(row) : null;
  }

  async listByStatus(status?: CalibrationCandidate["status"]): Promise<CalibrationCandidate[]> {
    const rows = await this.prisma.formCalibrationCandidate.findMany({
      where: { tenantId: this.tenantId, ...(status ? { status: mapStatus(status) } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapToDomain);
  }
}

function mapStatus(status: CalibrationCandidate["status"]): string {
  switch (status) {
    case "pending":
      return "PENDING";
    case "auto_review_candidate":
      return "AUTO_REVIEW_CANDIDATE";
    case "assisted_review":
      return "ASSISTED_REVIEW";
    case "manual_calibration_required":
      return "MANUAL_CALIBRATION_REQUIRED";
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    default:
      return "PENDING";
  }
}

function reverseStatus(status: string): CalibrationCandidate["status"] {
  switch (status) {
    case "PENDING":
      return "pending";
    case "AUTO_REVIEW_CANDIDATE":
      return "auto_review_candidate";
    case "ASSISTED_REVIEW":
      return "assisted_review";
    case "MANUAL_CALIBRATION_REQUIRED":
      return "manual_calibration_required";
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    default:
      return "pending";
  }
}

function mapToDomain(row: any): CalibrationCandidate {
  return {
    id: row.id,
    sourceFormId: row.sourceFormId,
    sourceFileName: row.sourceFileName,
    status: reverseStatus(row.status),
    mappings: (row.mappings ?? []) as CandidateFieldMapping[],
    qualityReport: (row.qualityReport ?? {}) as CalibrationQualityReport,
    confidence: row.confidence as CandidateConfidence | undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
