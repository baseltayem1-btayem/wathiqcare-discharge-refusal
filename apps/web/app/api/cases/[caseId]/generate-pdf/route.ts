import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { generateCasePdfReport } from "@/lib/server/legal-case-pdf-service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | { mode?: "draft" | "final"; language?: "en" | "ar"; regenerate?: boolean }
      | null;

    const requestedFinal = body?.mode === "final";
    const trigger = body?.regenerate ? "manual_regenerate" : "manual_generate";

    const result = await generateCasePdfReport({
      auth,
      caseId,
      request,
      trigger,
      requestedFinal,
      language: body?.language === "ar" ? "ar" : "en",
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      const missingRequired = error.message.startsWith("PDF generation blocked. Missing required fields:")
        ? error.message
            .replace("PDF generation blocked. Missing required fields:", "")
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        : [];
      return NextResponse.json(
        {
          error: error.message,
          code: error.code ?? null,
          fields: error.fields ?? null,
          detail: error.message,
          message: error.message,
          missingRequired,
        },
        { status: error.status },
      );
    }
    return handleApiError(error);
  }
}
