import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hasPlatformAccess, requireAuth, requireRole, requireTenantAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const auth = await requireAuth(request);
    if (!hasPlatformAccess(auth)) {
      await requireTenantAccess(request, tenantId);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            memberships: true,
            cases: true,
            documents: true,
            invoices: true,
          },
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }

    return NextResponse.json(toJsonSafe(tenant));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const auth = await requireAuth(request);
    const platformAccess = hasPlatformAccess(auth);

    if (!platformAccess) {
      const tenantAuth = await requireTenantAccess(request, tenantId);
      requireRole(tenantAuth, ["OWNER", "ADMIN"]);
    }

    const payload = (await request.json().catch(() => null)) as
      | {
        name?: string;
        domain?: string | null;
        timezone?: string | null;
        country?: string | null;
        billingEmail?: string | null;
        isActive?: boolean;
        metadata?: Prisma.InputJsonValue | null;
      }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const updateData: {
      name?: string;
      domain?: string | null;
      timezone?: string | null;
      country?: string | null;
      billingEmail?: string | null;
      isActive?: boolean;
      metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    } = {};

    if (typeof payload.name === "string") {
      const trimmed = payload.name.trim();
      if (!trimmed) {
        throw new ApiError(400, "name cannot be empty");
      }
      updateData.name = trimmed;
    }
    if (payload.domain === null || typeof payload.domain === "string") updateData.domain = payload.domain;
    if (payload.timezone === null || typeof payload.timezone === "string") updateData.timezone = payload.timezone;
    if (payload.country === null || typeof payload.country === "string") updateData.country = payload.country;
    if (payload.billingEmail === null || typeof payload.billingEmail === "string") {
      if (
        typeof payload.billingEmail === "string" &&
        payload.billingEmail.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.billingEmail.trim())
      ) {
        throw new ApiError(400, "billingEmail is invalid");
      }
      updateData.billingEmail = payload.billingEmail;
    }
    if (typeof payload.isActive === "boolean") {
      if (!platformAccess) {
        throw new ApiError(403, "Only platform admins can activate/deactivate tenants");
      }
      updateData.isActive = payload.isActive;
    }
    if (payload.metadata === null) {
      updateData.metadata = Prisma.JsonNull;
    } else if (typeof payload.metadata === "object") {
      updateData.metadata = payload.metadata;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No updatable fields supplied");
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "tenant",
      entityId: tenantId,
      action: "tenant_updated",
      details: "Tenant profile updated",
      metadataJson: {
        updatedFields: Object.keys(updateData),
      },
      request,
    });

    return NextResponse.json(toJsonSafe(tenant));
  } catch (error) {
    return handleApiError(error);
  }
}
