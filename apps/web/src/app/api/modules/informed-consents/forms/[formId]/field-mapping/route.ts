import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import {
  extractFieldMappingVerification,
  getConsentFieldMappingReadiness,
  persistFieldMappingVerification,
} from "@/lib/server/consent-field-mappings";

type RouteContext = {
  params: Promise<{
    formId: string;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const tenantId = auth.tenant_id || "";
    const { formId } = await context.params;

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
    }

    const prisma = getPrisma();
    const form = await prisma.consentForm.findFirst({
      where: { id: decodeURIComponent(formId), tenantId },
      select: { id: true, metadata: true },
    });

    const persistedVerification = extractFieldMappingVerification(form?.metadata);
    const readiness = getConsentFieldMappingReadiness(decodeURIComponent(formId), persistedVerification);

    return NextResponse.json({
      ok: true,
      source: "consent-field-mapping-foundation",
      ...readiness,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load field mapping readiness";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const tenantId = auth.tenant_id || "";
    const actorUserId = auth.sub?.trim() || "";
    const { formId } = await context.params;

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
    }

    if (!actorUserId) {
      return NextResponse.json({ ok: false, error: "Authenticated actor identity is unavailable" }, { status: 401 });
    }

    const body = asRecord(await request.json().catch(() => ({}))) || {};
    const action = String(body.action || "").toLowerCase();

    if (action !== "verify") {
      return NextResponse.json({ ok: false, error: "Unsupported action" }, { status: 422 });
    }

    const prisma = getPrisma();
    const readiness = await persistFieldMappingVerification({
      tenantId,
      formId: decodeURIComponent(formId),
      approvedByUserId: actorUserId,
      prisma,
    });

    return NextResponse.json({
      ok: true,
      source: "consent-field-mapping-foundation",
      action: "verify",
      ...readiness,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify field mapping";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
