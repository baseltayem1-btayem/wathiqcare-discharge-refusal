import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const prisma = getPrisma();

    const q = request.nextUrl.searchParams.get("q")?.trim();

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { role: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: {
        fullName: "asc",
      },
      take: 200,
    });

    return NextResponse.json({
      ok: true,
      users,
    });
  } catch (error) {
    return handleApiError(error);
  }
}