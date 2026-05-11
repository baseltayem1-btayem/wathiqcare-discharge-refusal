import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  createConsentTemplate,
  createTemplateVersion,
  listConsentLibrary,
  listCommitteeReviews,
  setTemplateVersionStatus,
  submitCommitteeReview,
  upsertConsentAIPrompt,
  upsertPromptRegistry,
  upsertWordingRepository,
} from "@/lib/server/consent-library-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const result = await listConsentLibrary(auth);
    return NextResponse.json(toJsonSafe(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = String(body?.action || "create_template").trim().toLowerCase();

    if (action === "create_template") {
      const created = await createConsentTemplate(auth, (body?.payload || {}) as Record<string, unknown>, request);
      return NextResponse.json(toJsonSafe(created), { status: 201 });
    }

    if (action === "create_version") {
      const created = await createTemplateVersion(auth, (body?.payload || {}) as Record<string, unknown>, request);
      return NextResponse.json(toJsonSafe(created), { status: 201 });
    }

    if (action === "set_version_status") {
      const updated = await setTemplateVersionStatus(auth, (body?.payload || {}) as Record<string, unknown>, request);
      return NextResponse.json(toJsonSafe(updated));
    }

    if (action === "upsert_ai_prompt") {
      const prompt = await upsertConsentAIPrompt(auth, (body?.payload || {}) as Record<string, unknown>, request);
      return NextResponse.json(toJsonSafe(prompt), { status: 201 });
    }

    if (action === "upsert_prompt_registry") {
      const prompt = await upsertPromptRegistry(auth, (body?.payload || {}) as Record<string, unknown>, request);
      return NextResponse.json(toJsonSafe(prompt), { status: 201 });
    }

    if (action === "upsert_wording_repository") {
      const wording = await upsertWordingRepository(auth, (body?.payload || {}) as Record<string, unknown>, request);
      return NextResponse.json(toJsonSafe(wording), { status: 201 });
    }

    if (action === "submit_committee_review") {
      const review = await submitCommitteeReview(auth, (body?.payload || {}) as Record<string, unknown>, request);
      return NextResponse.json(toJsonSafe(review), { status: 201 });
    }

    if (action === "list_committee_reviews") {
      const reviews = await listCommitteeReviews(auth, (body?.payload || {}) as Record<string, unknown>);
      return NextResponse.json(toJsonSafe(reviews));
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
