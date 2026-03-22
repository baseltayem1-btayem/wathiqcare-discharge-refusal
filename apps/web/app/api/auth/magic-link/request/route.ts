import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { requestMagicLink } from "@/lib/server/magic-link-auth";
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

type MagicLinkRequestPayload = {
    email?: string;
};

const GENERIC_RESPONSE = {
    success: true,
    message: "If your account is eligible, a login link has been sent.",
};

export async function POST(request: NextRequest) {
    try {
        const payload = (await request.json().catch(() => null)) as MagicLinkRequestPayload | null;
        const email = payload?.email?.trim().toLowerCase() || "";

        const result = await requestMagicLink(email, request);

        if (result.userId && result.tenantId && result.deliveryAttempted) {
            await writeAuditLog({
                tenantId: result.tenantId,
                userId: result.userId,
                entityType: "auth",
                entityId: result.userId,
                action: "magic_link_requested",
                details: "Magic-link login requested",
                metadataJson: { provider: "local_magic" },
                request,
            });
        }

        if (result.userId && result.tenantId && result.rejectionReason === "USER_DOMAIN_MISMATCH") {
            await writeAuditLog({
                tenantId: result.tenantId,
                userId: result.userId,
                entityType: "auth",
                entityId: result.userId,
                action: "magic_link_request_rejected_domain",
                details: "Magic-link request rejected due to non-allowed domain",
                metadataJson: { email },
                request,
            });
        }

        return NextResponse.json(GENERIC_RESPONSE);
    } catch (error) {
        return handleApiError(error);
    }
}
