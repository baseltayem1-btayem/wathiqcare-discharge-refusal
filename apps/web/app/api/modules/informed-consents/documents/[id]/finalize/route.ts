import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { finalizeConsentDocument } from "@/lib/server/consent-library-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import {

  buildImmutableEvidencePackage,
  ensureSignatureOrchestrationComplete,
} from "@/lib/server/informed-consents-evidence-vault-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:finalize");
    const { id } = await params;

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    await ensureSignatureOrchestrationComplete(auth, id);
    const updated = await finalizeConsentDocument(auth, id, (payload || {}) as Record<string, unknown>, request);
    const evidence = await buildImmutableEvidencePackage(auth, id, request);
    return NextResponse.json(toJsonSafe({ document: updated, evidence }));
  } catch (error) {
    return handleApiError(error);
  }
}
