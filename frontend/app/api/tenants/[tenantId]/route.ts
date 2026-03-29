import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole, requireTenantAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    requireTenantAccess(request, tenantId);

    const prisma = getPrisma();
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
    const auth = requireTenantAccess(request, tenantId);
    requireRole(auth, ["OWNER", "ADMIN"]);

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

    if (typeof payload.name === "string") updateData.name = payload.name;
    if (payload.domain === null || typeof payload.domain === "string") updateData.domain = payload.domain;
    if (payload.timezone === null || typeof payload.timezone === "string") updateData.timezone = payload.timezone;
    if (payload.country === null || typeof payload.country === "string") updateData.country = payload.country;
    if (payload.billingEmail === null || typeof payload.billingEmail === "string") {
      updateData.billingEmail = payload.billingEmail;
    }
    if (typeof payload.isActive === "boolean") updateData.isActive = payload.isActive;
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
