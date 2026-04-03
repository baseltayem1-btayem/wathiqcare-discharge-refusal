import { MembershipRole, MembershipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  hasPlatformAccess,
  requireAuth,
  requireTenantAccess,
  requireTenantPermission,
} from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import {
  countActiveSeatUsers,
  countPendingSeatUsers,
  enforceSeatLimit,
  getTenantSubscriptionSummary,
  syncActiveUserUsage,
  writeAuditLog,
} from "@/lib/server/saas-services";
import {
  canonicalizeUserRole,
  membershipRoleForUserRole,
  userTypeForUserRole,
} from "@/lib/server/roles";
import { slugRoleCode } from "@/lib/server/tenant-admin";

type RouteContext = {
  params: Promise<{ tenantId: string }>;
};

type PostMemberPayload = {
  email?: string;
  fullName?: string;
  role?: string;
  membershipRole?: string;
  departmentCode?: string;
  tenantRoleCodes?: string[];
  activateNow?: boolean;
  allowCrossTenantReassignment?: boolean;
};

type PatchMemberPayload = {
  memberId?: string;
  activate?: boolean;
};

function parseMembershipRole(input: unknown): MembershipRole {
  if (typeof input !== "string") return MembershipRole.MEMBER;

  const normalized = input.toUpperCase();
  return Object.values(MembershipRole).includes(normalized as MembershipRole)
    ? (normalized as MembershipRole)
    : MembershipRole.MEMBER;
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

async function authorize(
  request: NextRequest,
  tenantId: string,
  permissions: string | string[],
) {
  const auth = await requireAuth(request);

  if (hasPlatformAccess(auth)) {
    await requireTenantAccess(request, tenantId);
  } else {
    await requireTenantPermission(request, tenantId, permissions);
  }

  return auth;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

    const { tenantId } = await params;
    const auth = await authorize(request, tenantId, "users.read");

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
            roleAssignments: {
              include: {
                tenantRole: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const [subscriptionSummary, activeSeats, pendingSeats] = await Promise.all([
      getTenantSubscriptionSummary(tenantId),
      countActiveSeatUsers(tenantId),
      countPendingSeatUsers(tenantId),
    ]);

    return NextResponse.json(
      toJsonSafe({
        members,
        subscriptionSummary,
        seatMetrics: {
          seatLimit: subscriptionSummary.seatLimit,
          activeUserCount: activeSeats,
          pendingUsersCount: pendingSeats,
          availableSeats: Math.max(0, subscriptionSummary.seatLimit - activeSeats),
        },
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

    const { tenantId } = await params;
    const auth = await requireAuth(request);
    const platformAccess = hasPlatformAccess(auth);

    if (!platformAccess) {
      await requireTenantPermission(request, tenantId, "users.create");
    } else {
      await requireTenantAccess(request, tenantId);
    }

    const payload = (await request.json().catch(() => null)) as PostMemberPayload | null;

    const email = payload?.email?.trim().toLowerCase();
    const fullName = payload?.fullName?.trim();

    if (!email || !fullName) {
      throw new ApiError(400, "email and fullName are required");
    }

    const canonicalUserRole = canonicalizeUserRole(payload?.role);
    const membershipRole = payload?.membershipRole
      ? parseMembershipRole(payload.membershipRole)
      : membershipRoleForUserRole(canonicalUserRole);

    const departmentCode =
      typeof payload?.departmentCode === "string"
        ? payload.departmentCode.trim().toUpperCase()
        : "";

    const requestedRoleCodes = Array.isArray(payload?.tenantRoleCodes)
      ? payload.tenantRoleCodes.map((r: string) => slugRoleCode(r)).filter(Boolean)
      : [];

    const activateNow = payload?.activateNow === true;

    if (!platformAccess && activateNow) {
      await requireTenantPermission(request, tenantId, "users.activate");
    }

    const allowCrossTenantReassignment = parseBoolean(payload?.allowCrossTenantReassignment);

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (
      existingUser &&
      existingUser.tenantId !== tenantId &&
      !platformAccess &&
      !allowCrossTenantReassignment
    ) {
      throw new ApiError(409, "User belongs to another tenant");
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        fullName,
        role: canonicalUserRole,
        userType: userTypeForUserRole(canonicalUserRole, email),
        isActive: activateNow,
        ...(platformAccess && allowCrossTenantReassignment ? { tenantId } : {}),
      },
      create: {
        tenantId,
        email,
        fullName,
        role: canonicalUserRole,
        userType: userTypeForUserRole(canonicalUserRole, email),
        isActive: activateNow,
        hashedPassword: null,
      },
    });

    const existingMembership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });

    if (activateNow && (!existingMembership || existingMembership.status !== MembershipStatus.ACTIVE)) {
      await enforceSeatLimit(tenantId, 1);
    }

    const membership = await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      update: {
        role: membershipRole,
        status: activateNow ? MembershipStatus.ACTIVE : MembershipStatus.INVITED,
        metadata: departmentCode ? { departmentCode } : undefined,
      },
      create: {
        tenantId,
        userId: user.id,
        role: membershipRole,
        status: activateNow ? MembershipStatus.ACTIVE : MembershipStatus.INVITED,
        metadata: departmentCode ? { departmentCode } : undefined,
      },
    });

    await syncActiveUserUsage(tenantId);

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "tenant_membership",
      entityId: membership.id,
      action: activateNow ? "user_activated" : "user_preregistered",
      request,
    });

    return NextResponse.json(toJsonSafe(membership), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

    const { tenantId } = await params;
    const auth = await requireAuth(request);

    if (!hasPlatformAccess(auth)) {
      await requireTenantAccess(request, tenantId);
    }

    const payload = (await request.json().catch(() => null)) as PatchMemberPayload | null;

    if (!payload?.memberId) {
      throw new ApiError(400, "memberId is required");
    }

    const membership = await prisma.tenantMembership.findFirst({
      where: { id: payload.memberId, tenantId },
      include: { user: true },
    });

    if (!membership) {
      throw new ApiError(404, "Member not found");
    }

    const activate = payload.activate === true;

    if (activate && membership.status !== MembershipStatus.ACTIVE) {
      await enforceSeatLimit(tenantId, 1);
    }

    await prisma.user.update({
      where: { id: membership.userId },
      data: { isActive: activate },
    });

    const updatedMembership = await prisma.tenantMembership.update({
      where: { id: membership.id },
      data: {
        status: activate ? MembershipStatus.ACTIVE : MembershipStatus.SUSPENDED,
      },
    });

    await syncActiveUserUsage(tenantId);

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "tenant_membership",
      entityId: membership.id,
      action: activate ? "user_activated" : "user_deactivated",
      request,
    });

    return NextResponse.json(toJsonSafe(updatedMembership));
  } catch (error) {
    return handleApiError(error);
  }
}