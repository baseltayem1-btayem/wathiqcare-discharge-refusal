import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { settleTenantPromissoryNote } from "@/lib/server/promissory-note-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireModuleOperationalAccess(request, "promissory-notes");
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));

    const updated = await settleTenantPromissoryNote(auth, id, payload, request);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("PATCH /api/modules/promissory-notes/[id]/settle", error);
    return NextResponse.json({ error: "Failed to settle promissory note" }, { status: 500 });
  }
}