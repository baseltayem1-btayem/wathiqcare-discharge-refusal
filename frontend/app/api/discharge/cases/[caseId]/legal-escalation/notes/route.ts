import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { addLegalEscalationNote } from "@/lib/server/dischargeMedicoLegal";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = requireAuth(request);
    const { caseId } = await params;
    const body = (await request.json().catch(() => null)) as
      | { note?: string; note_type?: string; author?: string }
      | null;

    if (!body?.note || typeof body.note !== "string") {
      throw new ApiError(400, "note is required");
    }

    const note = await addLegalEscalationNote({
      auth,
      caseId,
      note: body.note,
      noteType: body.note_type,
      author: body.author,
      request,
    });

    return NextResponse.json(note);
  } catch (error) {
    return handleApiError(error);
  }
}