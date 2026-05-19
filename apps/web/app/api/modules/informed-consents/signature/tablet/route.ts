import { NextRequest, NextResponse } from "next/server";
import { ENABLE_TABLET_SIGNATURE } from "@/lib/config/feature-flags";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { addConsentSignature } from "@/lib/server/consent-library-service";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { buildConsentSignaturePersistencePayload, buildTabletSignatureEvidence } from "@/lib/signature/signature-evidence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!ENABLE_TABLET_SIGNATURE) {
      return NextResponse.json({ error: "Tablet signature capture is disabled" }, { status: 404 });
    }

    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:send_signature");

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const documentId = typeof payload?.documentId === "string" ? payload.documentId.trim() : "";

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const evidence = buildTabletSignatureEvidence({
      signerRole: String(payload?.role || "PATIENT") as "PATIENT" | "GUARDIAN" | "PHYSICIAN" | "WITNESS" | "INTERPRETER",
      signerName: String(payload?.signerName || ""),
      signatureDataUrl: String(payload?.signatureDataUrl || ""),
      acknowledgmentAccepted: payload?.acknowledgmentAccepted === true,
      otpVerified: payload?.otpVerified === true,
      deviceLabel: typeof payload?.deviceLabel === "string" ? payload.deviceLabel : undefined,
      staffWitnessName: typeof payload?.staffWitnessName === "string" ? payload.staffWitnessName : undefined,
      signerIdNumber: typeof payload?.signerIdNumber === "string" ? payload.signerIdNumber : undefined,
      signerLicense: typeof payload?.signerLicense === "string" ? payload.signerLicense : undefined,
    });

    const persisted = buildConsentSignaturePersistencePayload(evidence);
    const updated = await addConsentSignature(
      auth,
      documentId,
      {
        role: String(payload?.role || "PATIENT"),
        signerName: String(payload?.signerName || ""),
        signerIdNumber: typeof payload?.signerIdNumber === "string" ? payload.signerIdNumber : undefined,
        signerLicense: typeof payload?.signerLicense === "string" ? payload.signerLicense : undefined,
        signatureMethod: persisted.signatureMethod,
        metadata: persisted.metadata,
      },
      request,
    );

    return NextResponse.json(toJsonSafe({ updated, evidence }));
  } catch (error) {
    return handleApiError(error);
  }
}