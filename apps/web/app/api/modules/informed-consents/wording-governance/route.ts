import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  activateWordingVersion,
  compareWordingVersions,
  createWordingDraft,
  listWordingGovernance,
  progressWordingReview,
  retireWordingVersion,
} from "@/lib/server/informed-consents-wording-governance-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "governance:view");
    const result = await listWordingGovernance(auth);
    return NextResponse.json(toJsonSafe(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = String(body?.action || "").trim().toLowerCase();
    const payload = (body?.payload || {}) as Record<string, unknown>;

    if (action === "create_draft") {
      requireInformedConsentPermission(auth, "wording:create");
      const result = await createWordingDraft(auth, payload, request);
      return NextResponse.json(toJsonSafe(result), { status: 201 });
    }

    if (action === "review") {
      requireInformedConsentPermission(auth, "wording:review");
      const result = await progressWordingReview(auth, payload as {
        wordingId?: string;
        stage?: "LEGAL" | "MEDICAL" | "COMPLIANCE";
        decision?: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
        comment?: string;
      }, request);
      return NextResponse.json(toJsonSafe(result));
    }

    if (action === "activate") {
      requireInformedConsentPermission(auth, "wording:approve");
      const result = await activateWordingVersion(auth, payload as { wordingId?: string }, request);
      return NextResponse.json(toJsonSafe(result));
    }

    if (action === "retire") {
      requireInformedConsentPermission(auth, "wording:approve");
      const result = await retireWordingVersion(auth, payload as { wordingId?: string }, request);
      return NextResponse.json(toJsonSafe(result));
    }

    if (action === "compare") {
      requireInformedConsentPermission(auth, "governance:view");
      const result = await compareWordingVersions(auth, payload as { previousWordingId?: string; nextWordingId?: string });
      return NextResponse.json(toJsonSafe(result));
    }

    return NextResponse.json({ error: "Unsupported wording governance action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
