import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

type RouteContext = { params: Promise<{ caseId: string }> };

const CARE_MODELS = [
    { value: "home_medical_equipment_support", label: "Home Medical Equipment Support" },
    { value: "family_care_undertaking", label: "Family Care Undertaking" },
    { value: "home_healthcare_agreement", label: "Home Health Care Agreement" },
    { value: "extended_care_transfer", label: "Extended Care Transfer" },
];

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        requireAuth(request);
        await params; // caseId retained for route consistency

        return NextResponse.json({
            models: CARE_MODELS,
            home_healthcare_option: "home_healthcare_agreement",
        });
    } catch (error) {
        return handleApiError(error);
    }
}
