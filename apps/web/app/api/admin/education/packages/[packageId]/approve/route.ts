import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ packageId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const [{ requireAuth, requireTenantId }, { isAdministrator }, { approveEducationPackage }] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/release-governance"),
      import("@/lib/server/education-library-service"),
    ]);

    const auth = await requireAuth(request);

    if (
      !isAdministrator({
        userType: auth.user_type,
        platformRole: auth.platform_role,
        role: auth.role,
      })
    ) {
      return NextResponse.json({ message: "Administrator permissions required" }, { status: 403 });
    }

    const { packageId } = await context.params;
    const body = (await request.json().catch(() => null)) as { versionId?: string } | null;

    const result = await approveEducationPackage({
      tenantId: requireTenantId(auth),
      packageId,
      actorUserId: auth.sub,
      versionId: body?.versionId,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const { handleApiError } = await import("@/lib/server/http");
    return handleApiError(error);
  }
}