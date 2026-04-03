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
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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

<<<<<<< HEAD
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
=======
function parseMembershipRole(input: unknown): MembershipRole {
  if (typeof input !== "string") {
    return MembershipRole.MEMBER;
  }

  const normalized = input.toUpperCase();
  if (Object.values(MembershipRole).includes(normalized as MembershipRole)) {
    return normalized as MembershipRole;
  }

  return MembershipRole.MEMBER;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

<<<<<<< HEAD
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
=======
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const auth = await requireAuth(request);
    if (!hasPlatformAccess(auth)) {
      await requireTenantPermission(request, tenantId, "users.read");
    } else {
      await requireTenantAccess(request, tenantId);
    }
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

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

<<<<<<< HEAD
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

=======
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    const { tenantId } = await params;
    const auth = await requireAuth(request);
    const platformAccess = hasPlatformAccess(auth);

    if (!platformAccess) {
      await requireTenantPermission(request, tenantId, "users.create");
    } else {
      await requireTenantAccess(request, tenantId);
    }

<<<<<<< HEAD
    const payload = (await request.json().catch(() => null)) as PostMemberPayload | null;
=======
    const payload = (await request.json().catch(() => null)) as
      | {
        email?: string;
        fullName?: string;
        role?: string;
        membershipRole?: string;
        departmentCode?: string;
        tenantRoleCodes?: string[];
        activateNow?: boolean;
        allowCrossTenantReassignment?: boolean;
      }
      | null;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    const email = payload?.email?.trim().toLowerCase();
    const fullName = payload?.fullName?.trim();

    if (!email || !fullName) {
      throw new ApiError(400, "email and fullName are required");
    }

    const canonicalUserRole = canonicalizeUserRole(payload?.role);
    const membershipRole = payload?.membershipRole
      ? parseMembershipRole(payload.membershipRole)
      : membershipRoleForUserRole(canonicalUserRole);
<<<<<<< HEAD

    const departmentCode =
      typeof payload?.departmentCode === "string"
        ? payload.departmentCode.trim().toUpperCase()
        : "";

    const requestedRoleCodes = Array.isArray(payload?.tenantRoleCodes)
      ? payload.tenantRoleCodes.map((r: string) => slugRoleCode(r)).filter(Boolean)
      : [];

=======
    const departmentCode = typeof payload?.departmentCode === "string" ? payload.departmentCode.trim().toUpperCase() : "";
    const requestedRoleCodes = Array.isArray(payload?.tenantRoleCodes)
      ? payload.tenantRoleCodes.map((item) => slugRoleCode(String(item))).filter(Boolean)
      : [];
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    const activateNow = payload?.activateNow === true;

    if (!platformAccess && activateNow) {
      await requireTenantPermission(request, tenantId, "users.activate");
    }

<<<<<<< HEAD
    const allowCrossTenantReassignment = parseBoolean(payload?.allowCrossTenantReassignment);

    const existingUser = await prisma.user.findUnique({ where: { email } });

=======
    if (
      (canonicalUserRole === "platform_admin" || canonicalUserRole === "platform_superadmin") &&
      !platformAccess
    ) {
      throw new ApiError(403, "Only platform admins can grant platform roles");
    }

    const allowCrossTenantReassignment = parseBoolean(payload?.allowCrossTenantReassignment);

    if (!platformAccess && requestedRoleCodes.length > 0) {
      await requireTenantPermission(request, tenantId, "roles.assign");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (
      existingUser &&
      existingUser.tenantId !== tenantId &&
      !platformAccess &&
      !allowCrossTenantReassignment
    ) {
<<<<<<< HEAD
      throw new ApiError(409, "User belongs to another tenant");
=======
      throw new ApiError(
        409,
        "User belongs to a different primary tenant. Use platform admin reassignment flow.",
      );
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
      where: { tenantId_userId: { tenantId, userId: user.id } },
=======
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    });

    if (activateNow && (!existingMembership || existingMembership.status !== MembershipStatus.ACTIVE)) {
      await enforceSeatLimit(tenantId, 1);
    }

<<<<<<< HEAD
    const membership = await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      update: {
        role: membershipRole,
        status: activateNow ? MembershipStatus.ACTIVE : MembershipStatus.INVITED,
        metadata: departmentCode ? { departmentCode } : undefined,
=======
    let roleAssignmentsCreateMany:
      | {
        data: Array<{ tenantId: string; userId: string; tenantRoleId: string; isPrimary: boolean }>;
      }
      | undefined;

    if (requestedRoleCodes.length > 0) {
      const tenantRoles = await prisma.tenantRole.findMany({
        where: {
          tenantId,
          code: { in: requestedRoleCodes },
          status: "ACTIVE",
        },
        select: {
          id: true,
          code: true,
        },
      });

      const foundCodes = new Set(tenantRoles.map((item) => item.code));
      const missing = requestedRoleCodes.filter((item) => !foundCodes.has(item));
      if (missing.length > 0) {
        throw new ApiError(400, `Unknown tenant role(s): ${missing.join(", ")}`);
      }

      roleAssignmentsCreateMany = {
        data: tenantRoles.map((item, index) => ({
          tenantId,
          userId: user.id,
          tenantRoleId: item.id,
          isPrimary: index === 0,
        })),
      };
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
        status: activateNow ? MembershipStatus.ACTIVE : MembershipStatus.INVITED,
        metadata: departmentCode
          ? {
            departmentCode,
          }
          : undefined,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      },
      create: {
        tenantId,
        userId: user.id,
        role: membershipRole,
        status: activateNow ? MembershipStatus.ACTIVE : MembershipStatus.INVITED,
<<<<<<< HEAD
        metadata: departmentCode ? { departmentCode } : undefined,
      },
    });

    await syncActiveUserUsage(tenantId);

=======
        metadata: departmentCode
          ? {
            departmentCode,
          }
          : undefined,
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

    if (roleAssignmentsCreateMany) {
      await prisma.userRoleAssignment.deleteMany({
        where: {
          tenantId,
          userId: user.id,
        },
      });

      await prisma.userRoleAssignment.createMany({
        data: roleAssignmentsCreateMany.data,
      });
    }

    await syncActiveUserUsage(tenantId);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "tenant_membership",
      entityId: membership.id,
      action: activateNow ? "user_activated" : "user_preregistered",
<<<<<<< HEAD
      request,
    });

=======
      details: `Membership ${membership.status} with role ${membership.role}`,
      metadataJson: {
        memberUserId: membership.userId,
        memberEmail: email,
        membershipRole,
        canonicalUserRole,
        departmentCode,
        tenantRoleCodes: requestedRoleCodes,
      },
      request,
    });

    if (requestedRoleCodes.length > 0) {
      await writeAuditLog({
        tenantId,
        userId: auth.sub,
        entityType: "user",
        entityId: membership.userId,
        action: "role_assigned",
        details: `Assigned roles: ${requestedRoleCodes.join(", ")}`,
        metadataJson: {
          tenantRoleCodes: requestedRoleCodes,
          memberEmail: email,
        },
        request,
      });
    }

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    return NextResponse.json(toJsonSafe(membership), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

<<<<<<< HEAD
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

    const { tenantId } = await params;
    const auth = await requireAuth(request);

    if (!hasPlatformAccess(auth)) {
      await requireTenantAccess(request, tenantId);
    }

    const payload = (await request.json().catch(() => null)) as PatchMemberPayload | null;
=======
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const auth = await requireAuth(request);
    const platformAccess = hasPlatformAccess(auth);

    if (!platformAccess) {
      await requireTenantAccess(request, tenantId);
    }

    const payload = (await request.json().catch(() => null)) as
      | {
        memberId?: string;
        activate?: boolean;
        departmentCode?: string;
        tenantRoleCodes?: string[];
      }
      | null;

    if (!platformAccess) {
      if (payload?.activate === true) {
        await requireTenantPermission(request, tenantId, "users.activate");
      } else {
        await requireTenantPermission(request, tenantId, "users.deactivate");
      }
      if (Array.isArray(payload?.tenantRoleCodes) && payload.tenantRoleCodes.length > 0) {
        await requireTenantPermission(request, tenantId, "roles.assign");
      }
    }
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    if (!payload?.memberId) {
      throw new ApiError(400, "memberId is required");
    }

    const membership = await prisma.tenantMembership.findFirst({
<<<<<<< HEAD
      where: { id: payload.memberId, tenantId },
      include: { user: true },
=======
      where: {
        id: payload.memberId,
        tenantId,
      },
      include: {
        user: true,
      },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    });

    if (!membership) {
      throw new ApiError(404, "Member not found");
    }

    const activate = payload.activate === true;
<<<<<<< HEAD

    if (activate && membership.status !== MembershipStatus.ACTIVE) {
=======
    const departmentCode = typeof payload.departmentCode === "string" ? payload.departmentCode.trim().toUpperCase() : null;
    const requestedRoleCodes = Array.isArray(payload.tenantRoleCodes)
      ? payload.tenantRoleCodes.map((item) => slugRoleCode(String(item))).filter(Boolean)
      : [];

    if (activate && (membership.status !== MembershipStatus.ACTIVE || !membership.user.isActive)) {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      await enforceSeatLimit(tenantId, 1);
    }

    await prisma.user.update({
<<<<<<< HEAD
      where: { id: membership.userId },
      data: { isActive: activate },
=======
      where: {
        id: membership.userId,
      },
      data: {
        isActive: activate,
      },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    });

    const updatedMembership = await prisma.tenantMembership.update({
      where: { id: membership.id },
      data: {
        status: activate ? MembershipStatus.ACTIVE : MembershipStatus.SUSPENDED,
<<<<<<< HEAD
      },
    });

    await syncActiveUserUsage(tenantId);

=======
        ...(departmentCode
          ? {
            metadata: {
              ...(typeof membership.metadata === "object" && membership.metadata && !Array.isArray(membership.metadata)
                ? membership.metadata as Record<string, unknown>
                : {}),
              departmentCode,
            },
          }
          : {}),
      },
    });

    if (requestedRoleCodes.length > 0) {
      const tenantRoles = await prisma.tenantRole.findMany({
        where: {
          tenantId,
          code: { in: requestedRoleCodes },
          status: "ACTIVE",
        },
        select: {
          id: true,
          code: true,
        },
      });

      const foundCodes = new Set(tenantRoles.map((item) => item.code));
      const missing = requestedRoleCodes.filter((item) => !foundCodes.has(item));
      if (missing.length > 0) {
        throw new ApiError(400, `Unknown tenant role(s): ${missing.join(", ")}`);
      }

      await prisma.userRoleAssignment.deleteMany({
        where: {
          tenantId,
          userId: membership.userId,
        },
      });

      await prisma.userRoleAssignment.createMany({
        data: tenantRoles.map((item, index) => ({
          tenantId,
          userId: membership.userId,
          tenantRoleId: item.id,
          isPrimary: index === 0,
        })),
      });
    }

    await syncActiveUserUsage(tenantId);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "tenant_membership",
      entityId: membership.id,
      action: activate ? "user_activated" : "user_deactivated",
<<<<<<< HEAD
      request,
    });

=======
      details: activate ? "User activated and seat consumed" : "User deactivated and seat freed",
      metadataJson: {
        memberUserId: membership.userId,
        memberEmail: membership.user.email,
        tenantRoleCodes: requestedRoleCodes,
        departmentCode,
      },
      request,
    });

    if (requestedRoleCodes.length > 0) {
      await writeAuditLog({
        tenantId,
        userId: auth.sub,
        entityType: "user",
        entityId: membership.userId,
        action: "role_assigned",
        details: `Assigned roles: ${requestedRoleCodes.join(", ")}`,
        metadataJson: {
          tenantRoleCodes: requestedRoleCodes,
          memberEmail: membership.user.email,
        },
        request,
      });
    }

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    return NextResponse.json(toJsonSafe(updatedMembership));
  } catch (error) {
    return handleApiError(error);
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
