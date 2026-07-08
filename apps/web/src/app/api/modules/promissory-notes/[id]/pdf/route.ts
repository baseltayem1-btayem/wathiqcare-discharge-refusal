import { type NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { generatePromissoryNotePdf } from "@/lib/server/promissory-note-pdf-render-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "promissory-notes");
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("lang") === "en" ? "en" : "ar";
    const download = searchParams.get("download") === "1";

    const { buffer, filename } = await generatePromissoryNotePdf(auth, id, {
      locale,
      request,
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${filename}"`,
    );

    return new NextResponse(buffer as unknown as BodyInit, { status: 200, headers });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("GET /api/modules/promissory-notes/[id]/pdf", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
