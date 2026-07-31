import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import {
  assignWitnessRequirement,
  listWitnessRequirementsForDocument,
} from "@/lib/server/witness-requirement-service";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function errorResponse(error: unknown) {
  const apiError = error instanceof ApiError ? error : null;
  if (!apiError) {
    console.error("WITNESS_REQUIREMENTS_FAILED", error);
  }
  return NextResponse.json(
    {
      ok: false,
      error: apiError?.message || "Witness requirement operation failed.",
      code: apiError?.code,
    },
    { status: apiError?.status || 500 },
  );
}

/** List the witness requirement records (and signatures) for a document. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:review");
    const { id: documentId } = await params;
    const requirements = await listWitnessRequirementsForDocument(auth, documentId);
    return NextResponse.json({
      ok: true,
      requirements: requirements.map((requirement) => ({
        id: requirement.id,
        witnessIndex: requirement.witnessIndex,
        requiredRole: requirement.requiredRole,
        status: requirement.status,
        policyVersion: requirement.policyVersion,
        assignedUserId: requirement.assignedUserId,
        assignedAt: requirement.assignedAt?.toISOString() ?? null,
        signatures: requirement.signatures.map((signature) => ({
          id: signature.id,
          witnessRole: signature.witnessRole,
          department: signature.department,
          attestationVersion: signature.attestationVersion,
          signatureId: signature.signatureId,
          authenticationReference: signature.authenticationReference,
          signedAtKsa: signature.signedAtKsa,
          documentHash: signature.documentHash,
        })),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Assign a witness task to a staff member, or claim it (no assignee). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:witness_attest");
    await params; // document id is carried by the requirement record itself
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const witnessRequirementId = String(body.witnessRequirementId || "").trim();
    if (!witnessRequirementId) {
      throw new ApiError(400, "witnessRequirementId is required");
    }
    const assigneeUserId =
      typeof body.assigneeUserId === "string" && body.assigneeUserId.trim()
        ? body.assigneeUserId.trim()
        : undefined;
    const result = await assignWitnessRequirement({
      auth,
      witnessRequirementId,
      assigneeUserId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
