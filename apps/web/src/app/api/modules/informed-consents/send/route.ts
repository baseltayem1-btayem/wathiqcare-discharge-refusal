import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { sendModuleSecureSigningLink } from "@/lib/server/module-secure-signing-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const documentId = String(body.documentId || "");
  const caseId = String(body.caseId || "");
  const patientName = String(body.patientName || "");
  const mobileNumber = String(body.mobileNumber || "");
  const recipientEmail = String(body.recipientEmail || "");
  const locale = body.locale === "ar" ? "ar" : "en";

  if (!documentId || !caseId || !patientName || !mobileNumber || !recipientEmail) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: documentId, caseId, patientName, mobileNumber, recipientEmail" },
      { status: 400 },
    );
  }

  try {
    const workflow = await sendModuleSecureSigningLink({
      tenantId,
      initiatedBy: auth.sub,
      moduleKey: "informed_consent",
      moduleType: "informed_consent",
      documentId,
      caseId,
      patientName,
      mobileNumber,
      recipientEmail,
      locale,
    });

    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
