import { NextRequest, NextResponse } from "next/server";
import { verifySigningOtp } from "@/lib/server/public-signing-otp-service";
import { getPublicSigningSessionCookieName } from "@/lib/server/public-signing-session";
import { ApiError } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const result = await verifySigningOtp({
      token,
      otpCode: body.otpCode,
      request,
    });

    const response = NextResponse.json({
      verified: result.verified,
      attemptsRemaining: result.attemptsRemaining,
    });

    if (result.publicSigningSession) {
      response.cookies.set({
        name: getPublicSigningSessionCookieName(),
        value: result.publicSigningSession.value,
        expires: new Date(result.publicSigningSession.expiresAt),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 },
    );
  }
}
