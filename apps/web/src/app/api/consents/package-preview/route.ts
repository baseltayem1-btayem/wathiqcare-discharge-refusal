import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import {
  findOrCreateConsentDocument,
  resolveCaseFromEncounter,
  resolveTemplateFromProcedure,
} from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  requireInformedConsentPermission(auth, "consent:review");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const encounterId = searchParams.get("encounterId") || "";
  const procedureId = searchParams.get("procedureId") || "";

  if (!encounterId || !procedureId) {
    return NextResponse.json(
      { ok: false, error: "Missing required query parameters: encounterId, procedureId" },
      { status: 400 },
    );
  }

  const caseRecord = await resolveCaseFromEncounter(tenantId, encounterId);
  if (!caseRecord) {
    return NextResponse.json({ ok: false, error: "Encounter not found" }, { status: 404 });
  }

  const resolved = await resolveTemplateFromProcedure(tenantId, procedureId);
  if (!resolved) {
    return NextResponse.json({ ok: false, error: "Procedure package not found" }, { status: 404 });
  }

  const { template, version, approvedLink } = resolved;

  const document = await findOrCreateConsentDocument(tenantId, auth, caseRecord.id, template, version, approvedLink);

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_preview_viewed",
    summary: `Package preview viewed for document ${document.id}`,
    source: "api-consents-package-preview",
    caseId: caseRecord.id,
    consentDocumentId: document.id,
    templateId: template.id,
    templateVersionId: version.id,
    metadata: {
      documentId: document.id,
      caseId: caseRecord.id,
      previewSource: "workspace",
    },
    request,
  });

  return NextResponse.json({
    ok: true,
    preview: {
      documentId: document.id,
      consentReference: document.consentReference ?? null,
      status: document.status,
      patientName: caseRecord.patientName,
      mrn: caseRecord.medicalRecordNo,
      procedureName: template.titleEn || template.titleAr,
      templateCode: template.templateCode,
      version: version.versionLabel || String(version.versionNumber),
      versionId: version.id,
    },
  });
}
