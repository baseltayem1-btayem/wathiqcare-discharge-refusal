import { MembershipRole, MembershipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth, requireRole, requireTenantAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import {
  enforceSeatLimit,
  syncActiveUserUsage,
  writeAuditLog,
} from "@/lib/server/saas-services";
import {
  canonicalizeUserRole,
  membershipRoleForUserRole,
} from "@/lib/server/roles";

function parseMembershipRole(input: unknown): MembershipRole {
  if (typeof input !== "string") {
    return MembershipRole.MEMBER;
  }

  const normalized = input.toUpperCase();
  if (Object.values(MembershipRole).includes(normalized as MembershipRole)) {
    return normalized as MembershipRole;
  }

  return MembershipRole.MEMBER;
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

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

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(toJsonSafe(members));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
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
        email?: string;
        fullName?: string;
        role?: string;
        membershipRole?: string;
        allowCrossTenantReassignment?: boolean;
      }
      | null;

    const email = payload?.email?.trim().toLowerCase();
    const fullName = payload?.fullName?.trim();

    if (!email || !fullName) {
      throw new ApiError(400, "email and fullName are required");
    }

    const canonicalUserRole = canonicalizeUserRole(payload?.role);
    const membershipRole = payload?.membershipRole
      ? parseMembershipRole(payload.membershipRole)
      : membershipRoleForUserRole(canonicalUserRole);

    if (
      (canonicalUserRole === "platform_admin" || canonicalUserRole === "platform_superadmin") &&
      !platformAccess
    ) {
      throw new ApiError(403, "Only platform admins can grant platform roles");
    }

    const allowCrossTenantReassignment = parseBoolean(payload?.allowCrossTenantReassignment);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (
      existingUser &&
      existingUser.tenantId !== tenantId &&
      !platformAccess &&
      !allowCrossTenantReassignment
    ) {
      throw new ApiError(
        409,
        "User belongs to a different primary tenant. Use platform admin reassignment flow.",
      );
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        fullName,
        role: canonicalUserRole,
        isActive: true,
        ...(platformAccess && allowCrossTenantReassignment ? { tenantId } : {}),
      },
      create: {
        tenantId,
        email,
        fullName,
        role: canonicalUserRole,
        isActive: true,
        hashedPassword: null,
      },
    });

    const existingMembership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
    });

    if (!existingMembership || existingMembership.status !== MembershipStatus.ACTIVE) {
      await enforceSeatLimit(tenantId, 1);
    }

    const membership = await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      update: {
        role: membershipRole,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        tenantId,
        userId: user.id,
        role: membershipRole,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    await syncActiveUserUsage(tenantId);
    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "tenant_membership",
      entityId: membership.id,
      action: "membership_upserted",
      details: `Membership ${membership.status} with role ${membership.role}`,
      metadataJson: {
        memberUserId: membership.userId,
        memberEmail: email,
        membershipRole,
        canonicalUserRole,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(membership), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
