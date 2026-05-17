import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/server/sessionCookie";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value?.trim() ?? "";
  const trustHost = (process.env.AUTH_TRUST_HOST ?? "").trim().toLowerCase();

  let sessionStatus: "valid" | "missing" | "invalid" = "missing";
  if (token) {
    try {
      verifyAndDecodeJwt(token);
      sessionStatus = "valid";
    } catch {
      sessionStatus = "invalid";
    }
  }

  const payload = {
    status: "ok",
    auth: {
      nextAuthSecretConfigured: hasValue(process.env.NEXTAUTH_SECRET),
      nextAuthUrlConfigured: hasValue(process.env.NEXTAUTH_URL),
      authTrustHost: trustHost || null,
      authTrustHostEnabled: trustHost === "true" || trustHost === "1" || trustHost === "yes" || trustHost === "on",
      sessionCookie: {
        name: getSessionCookieName(),
        state: sessionStatus,
      },
    },
  };

  if (!payload.auth.nextAuthSecretConfigured || !payload.auth.nextAuthUrlConfigured) {
    return NextResponse.json({ ...payload, status: "degraded" }, { status: 503 });
  }

  return NextResponse.json(payload);
}
