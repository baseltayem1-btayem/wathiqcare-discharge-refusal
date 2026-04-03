import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
<<<<<<< HEAD
import {
  hasPlatformAccess,
  requireAuth,
  requireTenantAccess,
  requireTenantPermission,
} from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

type RouteContext = {
  params: Promise<{ tenantId: string }>;
};

type PatchTenantPayload = {
  name?: string;
  domain?: string | null;
  timezone?: string | null;
  country?: string | null;
  billingEmail?: string | null;
  isActive?: boolean;
  metadata?: Prisma.InputJsonValue | null;
};

type TenantUpdateData = {
  name?: string;
  domain?: string | null;
  timezone?: string | null;
  country?: string | null;
  billingEmail?: string | null;
  isActive?: boolean;
  metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

function normalizeOptionalString(value: unknown, fieldName: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be a string or null`);
  }

  return value.trim();
}

function normalizeBillingEmail(value: unknown): string | null | undefined {
  const normalized = normalizeOptionalString(value, "billingEmail");

  if (normalized === undefined || normalized === null || normalized === "") {
    return normalized === "" ? null : normalized;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ApiError(400, "billingEmail is invalid");
  }

  return normalized.toLowerCase();
}

function buildTenantUpdateData(
  payload: PatchTenantPayload,
  platformAccess: boolean,
): TenantUpdateData {
  const updateData: TenantUpdateData = {};

  if (payload.name !== undefined) {
    const name = normalizeOptionalString(payload.name, "name");
    if (!name) {
      throw new ApiError(400, "name cannot be empty");
    }
    updateData.name = name;
  }

  const domain = normalizeOptionalString(payload.domain, "domain");
  if (domain !== undefined) {
    updateData.domain = domain;
  }

  const timezone = normalizeOptionalString(payload.timezone, "timezone");
  if (timezone !== undefined) {
    updateData.timezone = timezone;
  }

  const country = normalizeOptionalString(payload.country, "country");
  if (country !== undefined) {
    updateData.country = country;
  }

  const billingEmail = normalizeBillingEmail(payload.billingEmail);
  if (billingEmail !== undefined) {
    updateData.billingEmail = billingEmail;
  }

  if (typeof payload.isActive === "boolean") {
    if (!platformAccess) {
      throw new ApiError(403, "Only platform admins can activate/deactivate tenants");
    }
    updateData.isActive = payload.isActive;
  }

  if (payload.metadata === null) {
    updateData.metadata = Prisma.JsonNull;
  } else if (payload.metadata !== undefined) {
    if (typeof payload.metadata !== "object") {
      throw new ApiError(400, "metadata must be an object or null");
    }
    updateData.metadata = payload.metadata;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No updatable fields supplied");
  }

  return updateData;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

    const { tenantId } = await params;
    const auth = await requireAuth(request);

=======
import { hasPlatformAccess, requireAuth, requireTenantAccess, requireTenantPermission } from "@/lib/server/auth";
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (!hasPlatformAccess(auth)) {
      await requireTenantPermission(request, tenantId, ["users.read", "subscription.read"]);
    } else {
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
<<<<<<< HEAD
          include: {
            plan: true,
          },
=======
          include: { plan: true },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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

<<<<<<< HEAD
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

=======
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    const { tenantId } = await params;
    const auth = await requireAuth(request);
    const platformAccess = hasPlatformAccess(auth);

    if (!platformAccess) {
      await requireTenantPermission(request, tenantId, "roles.manage");
    } else {
      await requireTenantAccess(request, tenantId);
    }

<<<<<<< HEAD
    const payload = (await request.json().catch(() => null)) as PatchTenantPayload | null;
=======
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

<<<<<<< HEAD
    const updateData = buildTenantUpdateData(payload, platformAccess);
=======
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

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
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
