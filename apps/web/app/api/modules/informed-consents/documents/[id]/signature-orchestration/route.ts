import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

const prisma = getPrisma();

type SignatureDeliveryMethod = "PDF_FILLER_LINK" | "SMS_TAQNIAT" | "EMAIL";
type SignatureStatus = "NOT_SENT" | "SENT" | "OPENED" | "PARTIALLY_SIGNED" | "SIGNED" | "FAILED" | "EXPIRED" | "REVOKED";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalize(value: unknown): string {
  return String(value || "").trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:send_signature");
    const { id } = await params;

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      select: { id: true, metadata: true, status: true },
    });

    if (!doc) return NextResponse.json({ error: "Consent document not found" }, { status: 404 });

    const orchestration = asRecord(asRecord(doc.metadata).signatureOrchestration);
    return NextResponse.json(toJsonSafe({
      documentId: id,
      documentStatus: doc.status,
      requiredRoles: asArray(orchestration.requiredRoles),
      requests: asArray(orchestration.requests),
    }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:send_signature");
    const { id } = await params;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = normalize(body?.action).toLowerCase();
    const payload = asRecord(body?.payload);

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      select: { id: true, caseId: true, metadata: true },
    });

    if (!doc) return NextResponse.json({ error: "Consent document not found" }, { status: 404 });

    const metadata = asRecord(doc.metadata);
    const orchestration = asRecord(metadata.signatureOrchestration);
    const requests = asArray(orchestration.requests).map((item) => asRecord(item));
    const requiredRoles = asArray(orchestration.requiredRoles).map((item) => String(item));

    if (action === "configure_recipients") {
      const nextRequests = asArray(payload.requests).map((item) => {
        const row = asRecord(item);
        const correlationId = `sig-${id}-${normalize(row.role)}-${Date.now()}`;
        return {
          id: normalize(row.id) || correlationId,
          recipientName: normalize(row.recipientName),
          role: normalize(row.role),
          mobile: normalize(row.mobile),
          email: normalize(row.email),
          deliveryMethod: (normalize(row.deliveryMethod) || "PDF_FILLER_LINK") as SignatureDeliveryMethod,
          linkExpiry: normalize(row.linkExpiry) || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          required: row.required !== false,
          status: "NOT_SENT" as SignatureStatus,
          correlationId,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.sub,
        };
      });

      const nextRequiredRoles = nextRequests.filter((item) => item.required).map((item) => item.role);

      await prisma.consentDocument.update({
        where: { id },
        data: {
          metadata: {
            ...metadata,
            signatureOrchestration: {
              requiredRoles: nextRequiredRoles,
              requests: nextRequests,
            },
          } as Prisma.InputJsonValue,
        },
      });

      await writeAuditLog({
        tenantId: auth.tenant_id || "",
        userId: auth.sub,
        entityType: "consent_signature_orchestration",
        entityId: id,
        action: "signature_recipients_configured",
        details: "Signature recipients configured",
        caseId: doc.caseId,
        documentId: id,
        moduleKey: "informed-consents",
        metadataJson: { requiredRoles: nextRequiredRoles, requestCount: nextRequests.length },
        request,
      });

      return NextResponse.json(toJsonSafe({ requiredRoles: nextRequiredRoles, requests: nextRequests }));
    }

    const requestId = normalize(payload.requestId);
    const nextStatus = normalize(payload.status).toUpperCase() as SignatureStatus;

    const index = requests.findIndex((item) => normalize(item.id) === requestId);
    if (index < 0) {
      return NextResponse.json({ error: "Signature request not found" }, { status: 404 });
    }

    if (action === "resend") {
      requests[index] = {
        ...requests[index],
        status: "SENT",
        updatedAt: new Date().toISOString(),
        updatedBy: auth.sub,
      };
    } else if (action === "revoke") {
      requests[index] = {
        ...requests[index],
        status: "REVOKED",
        updatedAt: new Date().toISOString(),
        updatedBy: auth.sub,
      };
    } else if (action === "update_status") {
      requests[index] = {
        ...requests[index],
        status: nextStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.sub,
      };
    } else {
      return NextResponse.json({ error: "Unsupported signature orchestration action" }, { status: 400 });
    }

    await prisma.consentDocument.update({
      where: { id },
      data: {
        metadata: {
          ...metadata,
          signatureOrchestration: {
            requiredRoles,
            requests,
          },
        } as Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id || "",
      userId: auth.sub,
      entityType: "consent_signature_orchestration",
      entityId: id,
      action: `signature_${action}`,
      details: `Signature orchestration action: ${action}`,
      caseId: doc.caseId,
      documentId: id,
      moduleKey: "informed-consents",
      metadataJson: {
        requestId,
        status: String(requests[index].status || ""),
        role: String(requests[index].role || ""),
        correlationId: String(requests[index].correlationId || ""),
      },
      request,
    });

    return NextResponse.json(toJsonSafe({ requiredRoles, requests }));
  } catch (error) {
    return handleApiError(error);
  }
}
