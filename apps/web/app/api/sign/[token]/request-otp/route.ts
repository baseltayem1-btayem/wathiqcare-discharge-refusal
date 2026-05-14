import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { requestSigningOtp } from "@/lib/server/public-signing-service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      mobileNumber?: string;
      locale?: "ar" | "en";
    } | null;

    const payload = await requestSigningOtp({
      token,
      mobileNumber: body?.mobileNumber ?? "",
      locale: body?.locale,
      request,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
