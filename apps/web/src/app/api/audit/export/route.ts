import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { getPrisma } from "@/lib/server/prisma";
import { resolveTemplateFromProcedure } from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type AuditExportDependencies = {
  requireModuleOperationalAccess: typeof requireModuleOperationalAccess;
  requireInformedConsentPermission: typeof requireInformedConsentPermission;
  writeConsentAudit: typeof writeConsentAudit;
  getPrisma: typeof getPrisma;
  resolveTemplateFromProcedure: typeof resolveTemplateFromProcedure;
};

const defaultDependencies: AuditExportDependencies = {
  requireModuleOperationalAccess,
  requireInformedConsentPermission,
  writeConsentAudit,
  getPrisma,
  resolveTemplateFromProcedure,
};

export async function handleAuditExport(
  request: NextRequest,
  deps: AuditExportDependencies = defaultDependencies,
) {
  const auth = await deps.requireModuleOperationalAccess(request, "informed-consents");
  deps.requireInformedConsentPermission(auth, "consent:export");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const encounterId = searchParams.get("encounterId") || "";
  const procedureId = searchParams.get("procedureId") || undefined;
  const templateId = searchParams.get("templateId") || undefined;

  if (!encounterId) {
    return NextResponse.json(
      { ok: false, error: "Missing required query parameter: encounterId" },
      { status: 400 },
    );
  }

  const prisma = deps.getPrisma();

  const resolvedTemplateId = templateId
    ? templateId
    : procedureId
      ? (await deps.resolveTemplateFromProcedure(tenantId, procedureId))?.template.id
      : undefined;

  const document = await prisma.consentDocument.findFirst({
    where: {
      tenantId,
      caseId: encounterId,
      ...(resolvedTemplateId ? { templateId: resolvedTemplateId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tenantId: true,
      caseId: true,
      templateId: true,
      consentReference: true,
      status: true,
      documentVersion: true,
      patientName: true,
      mrn: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!document) {
    return NextResponse.json(
      { ok: false, error: "Consent document not found for this encounter" },
      { status: 404 },
    );
  }

  const [chainEvents, consentEvents] = await Promise.all([
    prisma.auditChainEvent.findMany({
      where: {
        tenantId,
        caseId: encounterId,
        metadataJson: { path: ["documentId"], equals: document.id },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        eventType: true,
        actorId: true,
        actorRole: true,
        payloadSummary: true,
        currentHash: true,
        previousHash: true,
        createdAt: true,
        metadataJson: true,
      },
    }),
    prisma.consentAuditEvent.findMany({
      where: {
        tenantId,
        consentDocumentId: document.id,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        consentDocumentId: true,
        action: true,
        actorUserId: true,
        actorRole: true,
        summary: true,
        source: true,
        createdAt: true,
        metadata: true,
      },
    }),
  ]);

  await deps.writeConsentAudit({
    tenantId,
    auth,
    action: "audit_evidence_exported",
    summary: `Audit evidence exported for case ${encounterId}`,
    source: "api-audit-export",
    caseId: encounterId,
    consentDocumentId: document?.id,
    metadata: {
      caseId: encounterId,
      documentId: document?.id,
      procedureId: procedureId ?? null,
      templateId: resolvedTemplateId ?? null,
      chainEventCount: chainEvents.length,
      consentEventCount: consentEvents.length,
    },
    request,
  });

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    tenantId,
    caseId: encounterId,
    procedureId: procedureId ?? null,
    templateId: resolvedTemplateId ?? null,
    document,
    chainEvents,
    consentEvents,
  };

  const filename = `audit-evidence-${encounterId}-${Date.now()}.json`;

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: NextRequest) {
  return handleAuditExport(request);
}
