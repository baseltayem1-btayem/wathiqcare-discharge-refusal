import { NextRequest, NextResponse } from "next/server";
import { requestSigningOtp } from "@/lib/server/public-signing-service";
import { ApiError } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const result = await requestSigningOtp({
      token,
      mobileNumber: body.mobileNumber,
      locale: body.locale,
      request,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to request OTP" },
      { status: 500 },
    );
  }
}
