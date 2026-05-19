import { NextRequest, NextResponse } from "next/server";
import { ENABLE_BIOMETRIC_SIGNATURE } from "@/lib/config/feature-flags";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { addConsentSignature } from "@/lib/server/consent-library-service";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { buildDigitalPersonaEvidenceResult, rejectRawBiometricPayload } from "@/lib/signature/digitalpersona-local-agent";
import { buildBiometricSignatureEvidence, buildConsentSignaturePersistencePayload } from "@/lib/signature/signature-evidence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!ENABLE_BIOMETRIC_SIGNATURE) {
      return NextResponse.json({ error: "Biometric verification is disabled" }, { status: 404 });
    }

    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:send_signature");

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const documentId = typeof payload?.documentId === "string" ? payload.documentId.trim() : "";

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const verificationResult = payload?.verificationResult;
    if (!verificationResult || typeof verificationResult !== "object" || Array.isArray(verificationResult)) {
      return NextResponse.json({ error: "verificationResult is required" }, { status: 400 });
    }

    try {
      rejectRawBiometricPayload({
        ...(payload || {}),
        ...(verificationResult as Record<string, unknown>),
      });
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : "Raw biometric payload is not allowed");
    }

    const evidence = buildBiometricSignatureEvidence({
      signerRole: String(payload?.role || "PATIENT") as "PATIENT" | "GUARDIAN" | "PHYSICIAN" | "WITNESS" | "INTERPRETER",
      signerName: String(payload?.signerName || ""),
      acknowledgmentAccepted: payload?.acknowledgmentAccepted === true,
      verificationResult: buildDigitalPersonaEvidenceResult(verificationResult as Record<string, unknown>),
      otpVerified: payload?.otpVerified === true,
      signerIdNumber: typeof payload?.signerIdNumber === "string" ? payload.signerIdNumber : undefined,
      signerLicense: typeof payload?.signerLicense === "string" ? payload.signerLicense : undefined,
      rawFingerprintImage: payload?.rawFingerprintImage,
      rawFingerprintTemplate: payload?.rawFingerprintTemplate,
      fingerprintTemplate: payload?.fingerprintTemplate,
      biometricSample: payload?.biometricSample,
      minutiaeData: payload?.minutiaeData,
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