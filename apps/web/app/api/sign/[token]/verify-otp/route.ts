import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { verifySigningOtp } from "@/lib/server/public-signing-service";
import {
  buildPublicSigningSessionCookieOptions,
  getPublicSigningSessionCookieName,
} from "@/lib/server/public-signing-session";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      otpCode?: string;
    } | null;

    const payload = await verifySigningOtp({
      token,
      otpCode: body?.otpCode ?? "",
      request,
    });

    const response = NextResponse.json(payload);

    // Persist the verified public signing session as an HttpOnly cookie so
    // that subsequent signature/decision/education POSTs from the browser
    // (including iOS Safari) carry the session. The JSON body still returns
    // `publicSigningSession.value` for server-to-server callers that cannot
    // rely on Set-Cookie propagation.
    if (payload.verified && payload.publicSigningSession) {
      response.cookies.set(
        getPublicSigningSessionCookieName(),
        payload.publicSigningSession.value,
        buildPublicSigningSessionCookieOptions(
          payload.publicSigningSession.expiresAt,
          request,
        ),
      );
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
