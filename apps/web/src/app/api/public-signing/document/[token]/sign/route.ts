import { NextRequest, NextResponse } from "next/server";
import { submitPublicSigningSignature } from "@/lib/server/public-signing-signature-service";
import { mapPublicSignRequestBody } from "@/lib/server/public-signing-sign-body";
import { ApiError } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const result = await submitPublicSigningSignature({
      ...mapPublicSignRequestBody(body, token),
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
      { error: "Failed to submit signature" },
      { status: 500 },
    );
  }
}
