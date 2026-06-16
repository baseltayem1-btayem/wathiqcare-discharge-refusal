import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getPromissoryDebtorSigningPreview } from "@/lib/server/promissory-note-debtor-signing-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const result = await getPromissoryDebtorSigningPreview(token);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("GET /api/public/promissory-note-signing/[token]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}