import { NextRequest } from "next/server";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { getSessionCookieName } from "@/lib/server/sessionCookie";

export type AcknowledgmentMethodDescriptor = {
    method: "TABLET_SIGNATURE" | "EMAIL_NOTICE";
    legacy_method: "tablet_signature" | "email_notice";
    available: boolean;
    label_ar: string;
    reason: string | null;
};

type BackendEmailCapabilitiesResponse = {
    available?: boolean;
    reason?: string | null;
};

const EMAIL_UNAVAILABLE_REASON_AR = "إشعارات البريد الإلكتروني غير مهيأة حالياً.";
const EMAIL_CHECK_FAILED_REASON_AR = "تعذر التحقق من جاهزية خدمة البريد حالياً.";

function extractBearerToken(request: NextRequest): string | null {
    const cookieToken = request.cookies.get(getSessionCookieName())?.value?.trim();
    if (cookieToken) {
        return `Bearer ${cookieToken}`;
    }

    return null;
}

async function getBackendEmailAvailability(
    request: NextRequest,
): Promise<{ available: boolean; reason: string | null }> {
    const backendBase = getConfiguredBackendApiBaseUrl();
    const authHeader = extractBearerToken(request);
    if (!backendBase || !authHeader) {
        return { available: false, reason: null };
    }

    const endpoint = new URL("/api/emails/capabilities", `${backendBase}/`);

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                accept: "application/json",
                authorization: authHeader,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            return { available: false, reason: EMAIL_CHECK_FAILED_REASON_AR };
        }

        const payload = (await response.json().catch(() => null)) as BackendEmailCapabilitiesResponse | null;
        return {
            available: Boolean(payload?.available),
            reason: payload?.reason?.trim() || null,
        };
    } catch {
        return { available: false, reason: EMAIL_CHECK_FAILED_REASON_AR };
    }
}

export async function buildAcknowledgmentMethods(
    request: NextRequest,
): Promise<AcknowledgmentMethodDescriptor[]> {
    const backendAvailability = await getBackendEmailAvailability(request);
    const emailAvailable = backendAvailability.available;
    const emailReason = emailAvailable
        ? null
        : backendAvailability.reason || EMAIL_UNAVAILABLE_REASON_AR;

    return [
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
            available: emailAvailable,
            label_ar: "إرسال إشعار عبر البريد الإلكتروني",
            reason: emailAvailable ? null : emailReason,
        },
    ];
}