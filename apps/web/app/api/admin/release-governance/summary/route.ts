import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const [{ requireAuth }, { getReleaseGovernanceSnapshot }, { isAdministrator }] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/server/release-governance"),
      import("@/lib/release-governance"),
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

    return NextResponse.json({
      data: getReleaseGovernanceSnapshot(),
    });
  } catch (error) {
    const { handleApiError } = await import("@/lib/server/http");
    return handleApiError(error);
  }
}
