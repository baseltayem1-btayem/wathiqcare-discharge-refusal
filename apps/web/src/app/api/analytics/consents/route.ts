import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  requireInformedConsentPermission(auth, "consent:view_evidence");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const encounterId = searchParams.get("encounterId") || undefined;

  const prisma = getPrisma();

  const baseWhere = encounterId
    ? { tenantId, caseId: encounterId }
    : { tenantId };

  const [
    packagesGenerated,
    consentsSent,
    consentsCompleted,
    pendingReview,
  ] = await Promise.all([
    prisma.consentDocument.count({ where: baseWhere }),
    prisma.consentDocument.count({
      where: {
        ...baseWhere,
        status: { in: ["READY_FOR_SIGNATURE", "SIGNED", "FINALIZED"] },
      },
    }),
    prisma.consentDocument.count({
      where: {
        ...baseWhere,
        status: { in: ["SIGNED", "FINALIZED"] },
      },
    }),
    prisma.consentDocument.count({
      where: {
        ...baseWhere,
        status: { in: ["DRAFT", "AI_DRAFT", "PHYSICIAN_REVIEW", "APPROVED"] },
      },
    }),
  ]);

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_analytics_viewed",
    summary: `Consent analytics viewed${encounterId ? ` for case ${encounterId}` : ""}`,
    source: "api-analytics-consents",
    caseId: encounterId,
    metadata: {
      caseId: encounterId,
      packagesGenerated,
      consentsSent,
      consentsCompleted,
      pendingReview,
    },
    request,
  });

  return NextResponse.json({
    ok: true,
    metrics: {
      packagesGenerated,
      consentsSent,
      consentsCompleted,
      pendingReview,
    },
  });
}
