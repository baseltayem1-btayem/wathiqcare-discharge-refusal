import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/server/http";
import { verifyPublicSecureLinkOtp } from "@/lib/server/secure-links";
import { rateLimitOrThrow } from "@/lib/server/rate-limiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-wathiqcare-forwarded-for") || request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  const realIp = request.headers.get("x-wathiqcare-real-ip") || request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim() || null;
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    rateLimitOrThrow({
      key: `secure-link-verify-otp:${token}`,
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
      context: "secure-link OTP verification",
    });
    const body = await request.json().catch(() => ({}));
    const otpCode = typeof body.otpCode === "string" ? body.otpCode.trim() : "";

    if (!otpCode) {
      return NextResponse.json({ error: "otpCode is required" }, { status: 400 });
    }

    const result = await verifyPublicSecureLinkOtp(token, otpCode, {
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("POST /api/public/secure-links/[token]/verify-otp", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
