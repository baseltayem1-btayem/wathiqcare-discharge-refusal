import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { platformRoleForUserRole } from "@/lib/server/roles";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                code: true,
                domain: true,
                timezone: true,
                country: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        authenticated: true,
        claims: auth,
        platformRole: null,
        user: null,
      });
    }

    const effectiveTenantId = auth.tenant_id ?? user.tenantId;

    const subscription = effectiveTenantId
      ? await prisma.subscription.findFirst({
        where: { tenantId: effectiveTenantId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      })
      : null;

    const platformRole = auth.platform_role ?? platformRoleForUserRole(user.role);

    return NextResponse.json(
      toJsonSafe({
        authenticated: true,
        claims: auth,
        platformRole,
        user,
        subscription,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
