import { NextRequest, NextResponse } from "next/server";
import { getPublicSigningDocument } from "@/lib/server/public-signing-service";
import { ApiError } from "@/lib/server/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const payload = await getPublicSigningDocument({ token, request });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to load signing document" },
      { status: 500 },
    );
  }
}
