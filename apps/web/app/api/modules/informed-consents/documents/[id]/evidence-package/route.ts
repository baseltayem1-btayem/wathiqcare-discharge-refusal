import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  buildImmutableEvidencePackage,
} from "@/lib/server/informed-consents-evidence-vault-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

const prisma = getPrisma();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:view_evidence");
    const { id } = await params;

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      select: {
        id: true,
        consentReference: true,
        status: true,
        finalizedAt: true,
        metadata: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Consent document not found" }, { status: 404 });
    }

    return NextResponse.json(toJsonSafe(doc));
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
    requireInformedConsentPermission(auth, "consent:view_evidence");
    const { id } = await params;

    const result = await buildImmutableEvidencePackage(auth, id, request);
    return NextResponse.json(toJsonSafe(result), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
