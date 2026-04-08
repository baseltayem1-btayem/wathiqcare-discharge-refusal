import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { generateLegalPackageForCase, getLegalPackageMetadata } from "@/lib/server/case-compliance-service";
import { logReportAccess } from "@/lib/server/report-access-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const metadata = await getLegalPackageMetadata(auth, caseId);

    if (auth.tenant_id) {
      await logReportAccess({
        tenantId: auth.tenant_id,
        caseId,
        reportKey: "legal_package_view",
        exportFormat: metadata?.download_url ? "HTML" : null,
        accessedByUserId: auth.sub,
        accessedByRole: auth.role ?? null,
        request,
        metadataJson: {
          available: Boolean(metadata),
          version: metadata?.version ?? 0,
        },
      }).catch(() => undefined);
    }

    return NextResponse.json(metadata ?? { version: 0, generated_at: null, download_url: null });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const metadata = await generateLegalPackageForCase(auth, caseId, request);
    return NextResponse.json(metadata);
  } catch (error) {
    return handleApiError(error);
  }
}