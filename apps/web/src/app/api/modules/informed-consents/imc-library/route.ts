import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readFormsLibrary(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/modules/informed-consents/forms`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: true,
      items: [],
      featureFlagEnabled: true,
      source: "forms_fallback_empty",
      generatedAt: new Date().toISOString(),
    };
  }

  const payload = await response.json();
  const templates = Array.isArray(payload?.templates) ? payload.templates : [];

  return {
    ok: true,
    items: templates,
    templates,
    total: templates.length,
    specialties: payload?.specialties || [],
    featureFlagEnabled: true,
    source: "approved-imc-consent-library-fallback",
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const payload = await readFormsLibrary(request);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("[informed-consents/imc-library] Fallback failed", error);
    return NextResponse.json(
      {
        ok: true,
        items: [],
        templates: [],
        total: 0,
        featureFlagEnabled: true,
        source: "safe_empty_fallback",
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}
