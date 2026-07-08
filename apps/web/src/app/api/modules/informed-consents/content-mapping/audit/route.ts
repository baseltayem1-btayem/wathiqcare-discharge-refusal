import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { writeConsentAudit } from "@/lib/server/consent-library-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_ACTIONS = new Set([
  "education_material_viewed",
  "consent_ready_for_signature",
  "content_mapping_fallback_used",
]);

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") || auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Missing tenant context" },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const action = String(body.action || "");
  const summary = String(body.summary || "");
  const metadata = (body.metadata || {}) as Record<string, unknown>;

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported audit action" },
      { status: 400 },
    );
  }

  await writeConsentAudit({
    tenantId,
    auth,
    action,
    summary: summary || `Content mapping audit event: ${action}`,
    source: "content-mapping-workflow",
    metadata,
    request,
  });

  return NextResponse.json({ ok: true });
}
