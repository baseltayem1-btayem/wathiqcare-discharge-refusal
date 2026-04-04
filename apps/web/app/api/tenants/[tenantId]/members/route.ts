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

function parseMembershipRole(input: unknown): MembershipRole {
  if (typeof input !== "string") return MembershipRole.MEMBER;

  const normalized = input.toUpperCase();
  return Object.values(MembershipRole).includes(normalized as MembershipRole)
    ? (normalized as MembershipRole)
    : MembershipRole.MEMBER;
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true";
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

/* ===================== GET ===================== */

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();
    const { tenantId } = await params;

    await authorize(request, tenantId, "users.read");

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            roleAssignments: { include: { tenantRole: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const [subscriptionSummary, activeSeats, pendingSeats] =
      await Promise.all([
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
          availableSeats: Math.max(
            0,
            subscriptionSummary.seatLimit - activeSeats,
          ),
        },
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/* ===================== POST ===================== */

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();
    const { tenantId } = await params;

    const auth = await authorize(request, tenantId, "users.create");
    const platformAccess = hasPlatformAccess(auth);

    const payload = (await request.json()) as PostMemberPayload;

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
      ? payload.tenantRoleCodes
          .map((r) => slugRoleCode(r))
          .filter(Boolean)
      : [];

    const activateNow = payload?.activateNow === true;

    if (!platformAccess && activateNow) {
      await requireTenantPermission(request, tenantId, "users.activate");
    }

    if (
      (canonicalUserRole === "platform_admin" ||
        canonicalUserRole === "platform_superadmin") &&
      !platformAccess
    ) {
      throw new ApiError(
        403,
        "Only platform admins can grant platform roles",
      );
    }

    const allowCrossTenantReassignment = parseBoolean(
      payload?.allowCrossTenantReassignment,
    );

    if (!platformAccess && requestedRoleCodes.length > 0) {
      await requireTenantPermission(request, tenantId, "roles.assign");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

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
        ...(platformAccess && allowCrossTenantReassignment
          ? { tenantId }
          : {}),
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
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
    });

    if (
      activateNow &&
      (!existingMembership ||
        existingMembership.status !== MembershipStatus.ACTIVE)
    ) {
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
        status: activateNow
          ? MembershipStatus.ACTIVE
          : MembershipStatus.INVITED,
        metadata: departmentCode ? { departmentCode } : undefined,
      },
      create: {
        tenantId,
        userId: user.id,
        role: membershipRole,
        status: activateNow
          ? MembershipStatus.ACTIVE
          : MembershipStatus.INVITED,
        metadata: departmentCode ? { departmentCode } : undefined,
      },
    });

    return NextResponse.json(
      toJsonSafe({
        success: true,
        membership,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}