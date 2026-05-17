import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getStepUpCookieName, verifyStepUpChallenge } from "@/lib/server/security-policy-service";
import { logRuntimeIncident, recordRuntimeMetric } from "@/lib/server/runtime-observability";
import { assertRuntimeWriteAllowed } from "@/lib/server/runtime-modes";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    assertRuntimeWriteAllowed();
    const auth = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const challengeToken = typeof body?.challengeToken === "string" ? body.challengeToken : "";
    const code = typeof body?.code === "string" ? body.code : "";

    if (!challengeToken || !code) {
      throw new ApiError(400, "challengeToken and code are required");
    }

    const verified = verifyStepUpChallenge({
      challengeToken,
      code,
      userId: auth.sub,
      tenantId: auth.tenant_id ?? "platform",
    });

    if (!verified.valid) {
      logRuntimeIncident({
        request,
        auth,
        module: "auth_step_up",
        type: "OTP_FAILURE",
        details: {
          reason: verified.reason,
        },
      });
      return NextResponse.json(
        {
          ok: false,
          verified: false,
          reason: verified.reason,
        },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      verified: true,
      expiresAt: verified.expiresAt,
    });

    response.cookies.set(getStepUpCookieName(), verified.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: verified.expiresAt ? new Date(verified.expiresAt) : undefined,
      maxAge: 15 * 60,
    });

    return response;
  } catch (error) {
    logRuntimeIncident({
      request,
      module: "auth_step_up",
      type: "AUTH_FAILURE",
      error,
    });
    return handleApiError(error);
  } finally {
    recordRuntimeMetric("response_time_ms", Date.now() - startedAt);
  }
}
