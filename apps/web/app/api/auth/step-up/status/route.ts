import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getStepUpCookieName, getStepUpStatusFromRequest } from "@/lib/server/security-policy-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id ?? "platform";
    const status = await getStepUpStatusFromRequest({ request, auth, tenantId });

    return NextResponse.json({
      verified: status.verified,
      method: status.method,
      expiresAt: status.expiresAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request);

    const response = NextResponse.json({ ok: true, verified: false });
    response.cookies.set(getStepUpCookieName(), "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
