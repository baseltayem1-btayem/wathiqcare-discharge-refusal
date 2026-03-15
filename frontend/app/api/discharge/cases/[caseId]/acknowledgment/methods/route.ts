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
                    method: "TABLET_SIGNATURE",
                    legacy_method: "tablet_signature",
                    available: true,
                    label_ar: "توقيع الجهاز اللوحي",
                    reason: null,
                },
                {
                    method: "EMAIL_NOTICE",
                    legacy_method: "email_notice",
                    available: true,
                    label_ar: "إرسال إشعار عبر البريد الإلكتروني",
                    reason: null,
                },
            ],
        });
    } catch (error) {
        return handleApiError(error);
    }
}
