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
  previewOnly?: boolean;
  confirmAdminOverwrite?: boolean;
};

type TenantIdentity = {
  id: string;
  code: string;
};

type ExistingUserSummary = {
  id: string;
  tenantId: string | null;
  email: string;
  role: string | null;
  userType: string;
};

const IMC_EMAIL_DOMAIN = "imc.med.sa";

function isImcTenant(tenant: TenantIdentity): boolean {
  return tenant.code.trim().toUpperCase() === "IMC";
}

function extractFirstName(fullName: string): string {
  const token = fullName.trim().split(/\s+/)[0] ?? "";
  return token;
}

function sanitizeLocalPart(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function generateUniqueImcEmail(
  baseLocalPart: string,
): Promise<{ email: string; duplicateIndex: number }> {
  const prisma = getPrisma();

  const existing = await prisma.user.findMany({
    where: {
      email: {
        startsWith: baseLocalPart,
        endsWith: `@${IMC_EMAIL_DOMAIN}`,
      },
    },
    select: {
      email: true,
    },
  });

  const takenLocalParts = new Set(
    existing
      .map((item) => item.email.split("@")[0]?.toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );

  if (!takenLocalParts.has(baseLocalPart)) {
    return {
      email: `${baseLocalPart}@${IMC_EMAIL_DOMAIN}`,
      duplicateIndex: 1,
    };
  }

  let duplicateIndex = 2;
  while (takenLocalParts.has(`${baseLocalPart}${duplicateIndex}`)) {
    duplicateIndex += 1;
  }

  return {
    email: `${baseLocalPart}${duplicateIndex}@${IMC_EMAIL_DOMAIN}`,
    duplicateIndex,
  };
}

function isSensitiveAdminTarget(user: ExistingUserSummary): boolean {
  const normalizedEmail = user.email.trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0] ?? "";
  const normalizedRole = (user.role ?? "").trim().toLowerCase();

  if (localPart === "admin" || localPart.startsWith("admin")) {
    return true;
  }

  if (user.userType === "PLATFORM_ADMIN") {
    return true;
  }

  return (
    normalizedRole === "platform_superadmin" ||
    normalizedRole === "platform_admin"
  );
}

async function resolveTenantIdentity(tenantId: string): Promise<TenantIdentity> {
  const prisma = getPrisma();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      code: true,
    },
  });

  if (!tenant) {
    throw new ApiError(404, "Tenant not found");
  }

  return tenant;
}

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
    const tenant = await resolveTenantIdentity(tenantId);

    const auth = await authorize(request, tenantId, "users.create");
    const platformAccess = hasPlatformAccess(auth);

    const payload = (await request.json()) as PostMemberPayload;

    const previewOnly = payload?.previewOnly === true;
    const confirmAdminOverwrite = payload?.confirmAdminOverwrite === true;
    let email = payload?.email?.trim().toLowerCase();
    const fullName = payload?.fullName?.trim();

    if (!fullName) {
      throw new ApiError(400, "fullName is required");
    }

    const normalizedFirstName = sanitizeLocalPart(extractFirstName(fullName));
    let duplicateIndex = 1;

    if (!email) {
      if (!isImcTenant(tenant)) {
        throw new ApiError(400, "email is required for non-IMC tenants");
      }

      if (!normalizedFirstName) {
        throw new ApiError(400, "Unable to generate email from fullName");
      }

      const generated = await generateUniqueImcEmail(normalizedFirstName);
      email = generated.email;
      duplicateIndex = generated.duplicateIndex;
    }

    if (!email) {
      throw new ApiError(400, "email is required");
    }

    if (previewOnly) {
      return NextResponse.json(
        toJsonSafe({
          success: true,
          preview: {
            tenantCode: tenant.code,
            fullName,
            normalizedFirstName,
            email,
            duplicateIndex,
          },
        }),
      );
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
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        userType: true,
      },
    });

    if (
      existingUser &&
      isSensitiveAdminTarget(existingUser) &&
      !confirmAdminOverwrite
    ) {
      throw new ApiError(
        409,
        "Target email belongs to an admin account. Resubmit with confirmAdminOverwrite=true to continue.",
      );
    }

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
        userType: userTypeForUserRole(canonicalUserRole),
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
        userType: userTypeForUserRole(canonicalUserRole),
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