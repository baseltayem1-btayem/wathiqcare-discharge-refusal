import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { createStepUpChallenge } from "@/lib/server/security-policy-service";

function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) {
    return "registered authenticator";
  }

  const [user, domain] = email.split("@");
  const maskedUser = user.length <= 2 ? `${user[0] ?? "*"}*` : `${user.slice(0, 2)}***`;
  return `${maskedUser}@${domain}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const actionKey = typeof body?.actionKey === "string" && body.actionKey.trim() ? body.actionKey.trim() : "privileged_action";

    const challenge = createStepUpChallenge({
      userId: auth.sub,
      tenantId: auth.tenant_id ?? "platform",
      actionKey,
    });

    return NextResponse.json({
      ok: true,
      actionKey,
      challengeToken: challenge.challengeToken,
      expiresAt: challenge.expiresAt,
      delivery: auth.email ? "email_otp" : "authenticator_otp",
      deliveryHint: maskEmail(auth.email ?? null),
      ...(process.env.NODE_ENV === "production" ? {} : { debugCode: challenge.code }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
