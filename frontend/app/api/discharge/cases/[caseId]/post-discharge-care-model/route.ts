import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";

type RouteContext = { params: Promise<{ caseId: string }> };

const ALLOWED_MODELS = new Set([
    "home_medical_equipment_support",
    "family_care_undertaking",
    "home_healthcare_agreement",
    "extended_care_transfer",
]);

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        requireAuth(request);
        await params;

        const body = (await request.json().catch(() => null)) as { care_model?: string } | null;
        const selected = (body?.care_model ?? "").trim().toLowerCase();

        if (!selected || !ALLOWED_MODELS.has(selected)) {
            throw new ApiError(400, "نموذج الرعاية بعد الخروج غير مدعوم");
        }

        const isHomecare = selected === "home_healthcare_agreement";

        return NextResponse.json({
            care_model: selected,
            trigger_home_healthcare_workflow: isHomecare,
            next_step: isHomecare
                ? "بدء اتفاقية الرعاية الصحية المنزلية"
                : "متابعة تخطيط الخروج المعتاد",
        });
    } catch (error) {
        return handleApiError(error);
    }
}
