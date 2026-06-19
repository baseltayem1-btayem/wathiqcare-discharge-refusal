import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/server/http";
import { verifyPromissoryDebtorOtp } from "@/lib/server/promissory-note-debtor-signing-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const otpCode = typeof body.otpCode === "string" ? body.otpCode : "";

    const result = await verifyPromissoryDebtorOtp(token, otpCode, request);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("POST /api/public/promissory-note-signing/[token]/verify-otp", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
