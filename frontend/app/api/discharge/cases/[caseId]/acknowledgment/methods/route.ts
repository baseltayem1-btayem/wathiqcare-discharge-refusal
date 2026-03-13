import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        requireAuth(request);
        await params; // caseId not needed – methods are tenant-wide config

        return NextResponse.json({
            methods: [
                {
                    method: "SMS_OTP",
                    legacy_method: "sms_otp",
                    available: true,
                    label_ar: "رمز التحقق برسالة نصية",
                    reason: null,
                },
                {
                    method: "TABLET_SIGNATURE",
                    legacy_method: "tablet_signature",
                    available: true,
                    label_ar: "توقيع الجهاز اللوحي",
                    reason: null,
                },
                {
                    method: "NAFATH",
                    legacy_method: "nafath",
                    available: false,
                    label_ar: "نفاذ",
                    reason: "خدمة نفاذ غير مفعّلة في البيئة الحالية",
                },
            ],
        });
    } catch (error) {
        return handleApiError(error);
    }
}
