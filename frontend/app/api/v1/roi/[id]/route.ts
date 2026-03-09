import { GovernanceArchiveStatus, GovernanceRoiStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { indexArchiveRecord } from "@/lib/server/governance/archive-service";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }
    const auth = requireAuth(request);
    const { id } = await params;

    const row = await prisma.roiRequest.findUnique({ where: { id } });
    if (!row) {
      throw new ApiError(404, "ROI request not found");
    }
    if (row.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    return NextResponse.json(toJsonSafe(row));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const { id } = await params;
    const payload = (await request.json().catch(() => null)) as { action?: string } | null;

    if (!payload?.action) {
      throw new ApiError(400, "action is required");
    }

    const existing = await prisma.roiRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "ROI request not found");
    }
    if (existing.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    const action = payload.action.toLowerCase();
    let status = existing.status;

    if (action === "verify-identity") {
      status = GovernanceRoiStatus.READY_FOR_REVIEW;
    } else if (action === "approve") {
      status = GovernanceRoiStatus.APPROVED;
    } else if (action === "release") {
      status = GovernanceRoiStatus.RELEASED;
    } else if (action === "archive") {
      status = GovernanceRoiStatus.ARCHIVED;
    } else if (action === "reject") {
      status = GovernanceRoiStatus.REJECTED;
    } else {
      throw new ApiError(400, "Unsupported action");
    }

    const updated = await prisma.roiRequest.update({
      where: { id },
      data: {
        status,
        ...(action === "verify-identity" ? { otpVerified: true } : {}),
        ...(action === "release" ? { releasedAt: new Date(), releasedBy: auth.sub } : {}),
      },
    });

    if (action === "verify-identity") {
      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "roi_request",
        entityId: id,
        action: "roi_identity_verified",
        details: "ROI requester identity verified",
        request,
      });
    }

    if (action === "release") {
      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "roi_request",
        entityId: id,
        action: "roi_released",
        details: "ROI released to authorized recipient",
        request,
      });
    }

    if (action === "archive") {
      const archive = await indexArchiveRecord({
        tenantId: auth.tenant_id,
        patientId: updated.patientId,
        roiRequestId: updated.id,
        formTitle: "Release of Information Package",
        documentCategory: "roi",
        legalDocumentFlag: true,
      });

      await prisma.roiRequest.update({
        where: { id },
        data: { archiveAttachmentId: archive.id },
      });

      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "roi_request",
        entityId: id,
        action: "roi_archived",
        details: "ROI package archived",
        metadataJson: {
          archiveId: archive.id,
          archiveStatus: GovernanceArchiveStatus.INDEXED,
        },
        request,
      });
    }

    return NextResponse.json(toJsonSafe(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
