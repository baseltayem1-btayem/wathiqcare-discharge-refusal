import { MembershipRole, MembershipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireTenantAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import {
  enforceSeatLimit,
  syncActiveUserUsage,
  writeAuditLog,
} from "@/lib/server/saas-services";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    requireTenantAccess(request, tenantId);

    const prisma = getPrisma();
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
    const auth = requireTenantAccess(request, tenantId);
    requireRole(auth, ["OWNER", "ADMIN"]);

    const payload = (await request.json().catch(() => null)) as
      | {
        email?: string;
        fullName?: string;
        role?: string;
      }
      | null;

    const email = payload?.email?.trim().toLowerCase();
    const fullName = payload?.fullName?.trim();

    if (!email || !fullName) {
      throw new ApiError(400, "email and fullName are required");
    }

    const role = parseMembershipRole(payload?.role);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        tenantId,
        fullName,
        role,
        isActive: true,
      },
      create: {
        tenantId,
        email,
        fullName,
        role,
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
        role,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        tenantId,
        userId: user.id,
        role,
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
        role,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(membership), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
