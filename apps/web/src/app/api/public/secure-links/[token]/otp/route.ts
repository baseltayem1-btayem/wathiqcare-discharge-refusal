import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/server/http";
import { requestPublicSecureLinkOtp } from "@/lib/server/secure-links";
import { rateLimitOrThrow } from "@/lib/server/rate-limiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    rateLimitOrThrow({
      key: `secure-link-otp:${token}`,
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
      context: "secure-link OTP request",
    });
    const result = await requestPublicSecureLinkOtp(token);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("POST /api/public/secure-links/[token]/otp", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
