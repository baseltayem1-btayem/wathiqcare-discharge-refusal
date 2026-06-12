import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/http";
import { generatePublicEducationVisualAid } from "@/lib/server/public-signing-service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const education = await generatePublicEducationVisualAid({
      token,
      request,
    });

    return NextResponse.json({ ok: true, education }, { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (error) {
    return handleApiError(error);
  }
}