import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { recordWitnessSignature } from "@/lib/server/witness-requirement-service";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { WITNESS_ROLES, type WitnessRole } from "@/lib/server/witness-policy-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Human-witness signature capture. Staff authenticate through their
 * institutional session (JWT/SSO); no SMS verification is required for
 * staff witnesses. The witness signs only in an authorized role, never for
 * an outdated document version, and never twice.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:witness_attest");
    const { id: documentId } = await params;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const witnessRole = String(body.witnessRole || "").trim() as WitnessRole;
    if (!(WITNESS_ROLES as readonly string[]).includes(witnessRole)) {
      throw new ApiError(400, "A valid witnessRole is required", {
        code: "WITNESS_ROLE_UNAUTHORIZED",
      });
    }

    const attestation = (body.attestation ?? {}) as Record<string, unknown>;
    const idempotencyKey =
      String(body.idempotencyKey || "").trim() ||
      request.headers.get("idempotency-key")?.trim() ||
      "";
    const documentHash = String(body.documentHash || "").trim();

    const result = await recordWitnessSignature({
      auth,
      documentId,
      request,
      payload: {
        witnessRequirementId:
          typeof body.witnessRequirementId === "string" && body.witnessRequirementId.trim()
            ? body.witnessRequirementId.trim()
            : undefined,
        witnessRole,
        employeeId: typeof body.employeeId === "string" ? body.employeeId : undefined,
        department: typeof body.department === "string" ? body.department : undefined,
        attestation: {
          identityChecked: attestation.identityChecked === true,
          signatureInPresence: attestation.signatureInPresence === true,
          noObjectionOrCoercion: attestation.noObjectionOrCoercion === true,
          attestationVersion:
            typeof attestation.attestationVersion === "string"
              ? attestation.attestationVersion
              : undefined,
        },
        documentHash,
        signatureImageDataUrl:
          typeof body.signatureImageDataUrl === "string" ? body.signatureImageDataUrl : undefined,
        idempotencyKey,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const apiError = error instanceof ApiError ? error : null;
    if (!apiError) {
      console.error("WITNESS_SIGNATURE_CAPTURE_FAILED", error);
    }
    return NextResponse.json(
      {
        ok: false,
        error: apiError?.message || "Failed to capture the witness signature.",
        code: apiError?.code,
      },
      { status: apiError?.status || 500 },
    );
  }
}
