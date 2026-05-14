import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { verifySigningOtp } from "@/lib/server/public-signing-service";

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

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
