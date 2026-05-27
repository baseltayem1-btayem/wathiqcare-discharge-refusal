import { type NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import {
  generateUnifiedEvidenceRecord,
  getStoredUnifiedEvidenceRecord,
} from "@/lib/server/unified-legal-evidence-service";
import { hasInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeRole(role: string | null | undefined): string {
  return (role || "").trim().toLowerCase();
}

function isPhysicianRole(auth: { role?: string | null; user_type?: string | null; platform_role?: string | null }): boolean {
  const candidates = [normalizeRole(auth.role), normalizeRole(auth.user_type), normalizeRole(auth.platform_role)];
  return candidates.includes("doctor") || candidates.includes("nurse") || candidates.includes("nursing");
}

function canAccessEvidence(auth: { role?: string | null; user_type?: string | null; platform_role?: string | null }, hasEvidencePermission: boolean): boolean {
  if (hasEvidencePermission) return true;
  return isPhysicianRole(auth);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const hasEvidencePermission = hasInformedConsentPermission(auth, "consent:view_evidence");
    if (!canAccessEvidence(auth, hasEvidencePermission)) {
      throw new ApiError(403, "Missing permission: consent:view_evidence");
    }

    const { id } = await params;
    const tenantId = (auth.tenant_id || "").trim();
    const payload = await getStoredUnifiedEvidenceRecord({ tenantId, documentId: id });
    if (!payload) {
      throw new ApiError(404, "Unified evidence certificate not found");
    }

    return NextResponse.json(payload, { status: 200, headers: { "Cache-Control": "no-store" } });
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
    const hasEvidencePermission = hasInformedConsentPermission(auth, "consent:view_evidence");
    if (!canAccessEvidence(auth, hasEvidencePermission)) {
      throw new ApiError(403, "Missing permission: consent:view_evidence");
    }

    const { id } = await params;
    const tenantId = (auth.tenant_id || "").trim();
    const payload = await generateUnifiedEvidenceRecord({ tenantId, documentId: id });
    return NextResponse.json(payload, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}