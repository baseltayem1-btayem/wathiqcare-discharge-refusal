import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      include: {
        memberships: {
          where: { tenantId: auth.tenant_id },
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
        user: null,
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId: auth.tenant_id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      toJsonSafe({
        authenticated: true,
        claims: auth,
        user,
        subscription,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
