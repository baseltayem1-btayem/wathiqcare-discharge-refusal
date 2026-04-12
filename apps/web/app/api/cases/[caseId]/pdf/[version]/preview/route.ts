import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { previewCasePdfVersion } from "@/lib/server/legal-case-pdf-service";

type RouteContext = {
  params: Promise<{ caseId: string; version: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId, version } = await context.params;
    const parsedVersion = Number(version);
    if (!Number.isFinite(parsedVersion) || parsedVersion <= 0) {
      throw new ApiError(400, "Invalid PDF version");
    }

    const file = await previewCasePdfVersion({
      auth,
      caseId,
      version: parsedVersion,
      request,
    });

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${file.fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
