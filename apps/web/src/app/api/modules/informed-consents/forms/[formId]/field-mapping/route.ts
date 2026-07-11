import { NextRequest, NextResponse } from "next/server";
import { getConsentFieldMappingReadiness } from "@/lib/server/consent-field-mappings";

type RouteContext = {
  params: Promise<{
    formId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { formId } = await context.params;
  const readiness = getConsentFieldMappingReadiness(decodeURIComponent(formId));

  return NextResponse.json({
    ok: true,
    source: "consent-field-mapping-foundation",
    ...readiness,
  });
}
