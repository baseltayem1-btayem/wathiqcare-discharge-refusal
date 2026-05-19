import { MembershipStatus } from "@/lib/server/prisma-enums";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantPermissionForAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { getTenantSubscriptionSummary } from "@/lib/server/saas-services";

const ALLOWED_CREATOR_ROLES = new Set(["tenant_admin", "tenant_owner"]);

function ensureCreatorRole(role: string | undefined): void {
  const normalized = (role || "").trim().toLowerCase();
  if (!ALLOWED_CREATOR_ROLES.has(normalized)) {
    throw new ApiError(403, "Only tenant admins can manage users");
  }
}

function extractDepartment(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return (metadata as Record<string, unknown>).department as string | null ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;

    if (!tenantId) {
      throw new ApiError(403, "Tenant context is required");
    }

    ensureCreatorRole(auth.role);

    await requireTenantPermissionForAuth(auth, tenantId, "users.read", {
      allowPlatform: false,
    });

    const prisma = getPrisma();
    const creatorMembership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: auth.sub,
        },
      },
      select: {
        status: true,
      },
    });

    if (!creatorMembership || creatorMembership.status !== MembershipStatus.ACTIVE) {
      throw new ApiError(403, "Creator must have an active tenant membership");
    }

    const [memberships, subscriptionSummary] = await Promise.all([
      prisma.tenantMembership.findMany({
        where: { tenantId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              userType: true,
              isActive: true,
              status: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getTenantSubscriptionSummary(tenantId),
    ]);

    const emails = Array.from(
      new Set(
        memberships
          .map((m) => m.user.email)
          .filter((email): email is string => Boolean(email)),
      ),
    );

    const latestInvitationByEmail = new Map<string, string>();

    if (emails.length > 0) {
      const invitations = await prisma.invitation.findMany({
        where: {
          tenantId,
          email: { in: emails },
        },
        select: {
          email: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      for (const invitation of invitations) {
        if (!latestInvitationByEmail.has(invitation.email)) {
          latestInvitationByEmail.set(invitation.email, invitation.status);
        }
      }
    }

    const users = memberships.map((membership) => ({
      id: membership.user.id,
      email: membership.user.email,
      fullName: membership.user.fullName,
      role: membership.user.role,
      userType: membership.user.userType,
      isActive: membership.user.isActive,
      status: membership.user.status,
      inviteStatus:
        latestInvitationByEmail.get(membership.user.email) ?? membership.status,
      membershipRole: membership.role,
      invitedAt: membership.invitedAt,
      lastLoginAt: membership.user.lastLoginAt,
      createdAt: membership.user.createdAt,
      department: extractDepartment(membership.metadata),
    }));

    return NextResponse.json(
      toJsonSafe({
        success: true,
        users,
        license: {
          seatLimit: subscriptionSummary.seatLimit,
          activeUsers: subscriptionSummary.activeUserCount,
          pendingUsers: subscriptionSummary.pendingUsersCount,
          availableSeats: subscriptionSummary.availableSeats,
        },
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}