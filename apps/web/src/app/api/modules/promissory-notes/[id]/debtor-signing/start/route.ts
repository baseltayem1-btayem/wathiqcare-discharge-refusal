import { type NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { startPromissoryDebtorSigning } from "@/lib/server/promissory-note-debtor-signing-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "promissory-notes");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await startPromissoryDebtorSigning(
      auth,
      id,
      {
        debtorMobile: typeof body.debtorMobile === "string" ? body.debtorMobile : undefined,
        locale: body.locale === "en" ? "en" : "ar",
      },
      request,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("POST /api/modules/promissory-notes/[id]/debtor-signing/start", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
