import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { downloadLegalPackageArtifact } from "@/lib/server/legal-package-module-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const kindRaw = request.nextUrl.searchParams.get("kind");
    const kind = kindRaw === "signed" || kindRaw === "court" ? kindRaw : "package";

    const file = await downloadLegalPackageArtifact(auth, caseId, kind);

    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
