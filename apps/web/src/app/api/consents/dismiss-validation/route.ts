import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { getPrisma } from "@/lib/server/prisma";
import { resolveCaseFromEncounter } from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  requireInformedConsentPermission(auth, "consent:review");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const encounterId = String(body.encounterId || "");

  if (!encounterId) {
    return NextResponse.json(
      { ok: false, error: "Missing required field: encounterId" },
      { status: 400 },
    );
  }

  const caseRecord = await resolveCaseFromEncounter(tenantId, encounterId);
  if (!caseRecord) {
    return NextResponse.json({ ok: false, error: "Encounter not found" }, { status: 404 });
  }

  const prisma = getPrisma();
  const document = await prisma.consentDocument.findFirst({
    where: { tenantId, caseId: caseRecord.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "validation_toast_dismissed",
    summary: `Validation toast dismissed for case ${caseRecord.id}`,
    source: "api-consents-dismiss-validation",
    caseId: caseRecord.id,
    consentDocumentId: document?.id,
    metadata: {
      caseId: caseRecord.id,
      documentId: document?.id,
    },
    request,
  });

  return NextResponse.json({ ok: true });
}
