import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/server/http";
import { signPromissoryNoteByDebtor } from "@/lib/server/promissory-note-debtor-signing-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const result = await signPromissoryNoteByDebtor(token, request);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("POST /api/public/promissory-note-signing/[token]/sign", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
