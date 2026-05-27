import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const [{ requireAuth, requireTenantId }, { isAdministrator }, { createEducationPackage }] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/release-governance"),
      import("@/lib/server/education-library-service"),
    ]);

    const auth = await requireAuth(request);

    if (
      !isAdministrator({
        userType: auth.user_type,
        platformRole: auth.platform_role,
        role: auth.role,
      })
    ) {
      return NextResponse.json({ message: "Administrator permissions required" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as {
      packageKey?: string;
      titleAr?: string;
      titleEn?: string;
      summaryAr?: string;
      summaryEn?: string;
      clinicalDomain?: string;
      procedureCode?: string;
      versionLabel?: string;
      manifestJson?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      placeholderAssets?: Array<Record<string, unknown>>;
    } | null;

    const result = await createEducationPackage({
      tenantId: requireTenantId(auth),
      actorUserId: auth.sub,
      packageKey: body?.packageKey || "",
      titleAr: body?.titleAr || "",
      titleEn: body?.titleEn || "",
      summaryAr: body?.summaryAr,
      summaryEn: body?.summaryEn,
      clinicalDomain: body?.clinicalDomain,
      procedureCode: body?.procedureCode,
      versionLabel: body?.versionLabel,
      manifestJson: body?.manifestJson,
      metadata: body?.metadata,
      placeholderAssets: (body?.placeholderAssets || []) as never,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const { handleApiError } = await import("@/lib/server/http");
    return handleApiError(error);
  }
}