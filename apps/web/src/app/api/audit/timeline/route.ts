import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapEventType(eventType: string): string {
  return eventType
    .toLowerCase()
    .replace(/_/g, " ");
}

function mapActor(actorRole: string | null): string {
  if (!actorRole) return "system";
  return actorRole.toLowerCase().replace(/_/g, " ");
}

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  requireInformedConsentPermission(auth, "audit:view");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const encounterId = searchParams.get("encounterId") || "";
  const documentId = searchParams.get("documentId") || undefined;

  if (!encounterId) {
    return NextResponse.json(
      { ok: false, error: "Missing required query parameter: encounterId" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const events = await prisma.auditChainEvent.findMany({
    where: {
      tenantId,
      caseId: encounterId,
      ...(documentId ? { metadataJson: { path: ["documentId"], equals: documentId } } : {}),
    },
    select: {
      id: true,
      eventType: true,
      actorId: true,
      actorRole: true,
      payloadSummary: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "audit_timeline_viewed",
    summary: `Audit timeline viewed for case ${encounterId}`,
    source: "api-audit-timeline",
    caseId: encounterId,
    metadata: {
      caseId: encounterId,
      documentId,
      eventCount: events.length,
    },
    request,
  });

  const mapped = events.map((event) => ({
    id: event.id,
    type: mapEventType(event.eventType),
    actor: mapActor(event.actorRole),
    actorName:
      event.actorRole === "physician"
        ? "Physician"
        : event.actorRole === "patient"
          ? "Patient"
          : "System",
    timestamp: event.createdAt.toISOString(),
    status: "completed" as const,
    summaryEn: event.payloadSummary || event.eventType,
    summaryAr: event.payloadSummary || event.eventType,
  }));

  return NextResponse.json({ ok: true, events: mapped });
}
