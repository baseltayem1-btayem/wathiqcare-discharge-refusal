import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import {
    isMagicLinkDeniedError,
    toAccessDeniedMetadata,
    verifyMagicLink,
} from "@/lib/server/magic-link-auth";
import { writeAuditLog } from "@/lib/server/saas-services";
import { buildSessionCookieOptions, getSessionCookieName } from "@/lib/server/sessionCookie";
import { getTokenTtlSeconds } from "@/lib/server/auth-token";

export const runtime = "nodejs";

function codeFromDetail(detail: string): string {
    const normalized = detail.trim().toLowerCase();
    if (normalized.includes("domain not allowed")) {
        return "DOMAIN_NOT_ALLOWED";
    }
    if (normalized.includes("expired")) {
        return "EXPIRED_LINK";
    }
    if (normalized.includes("used")) {
        return "ALREADY_USED";
    }
    return "INVALID_TOKEN";
}

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token") || "";

    try {
        const { user, session } = await verifyMagicLink(token);

        try {
            await writeAuditLog({
                tenantId: user.tenant_id,
                userId: user.id,
                entityType: "auth",
                entityId: user.id,
                action: "magic_link_used",
                details: "Magic-link token consumed",
                metadataJson: { provider: "local_magic" },
                request,
            });

            await writeAuditLog({
                tenantId: user.tenant_id,
                userId: user.id,
                entityType: "auth",
                entityId: user.id,
                action: "login_success",
                details: "User authenticated via magic-link",
                metadataJson: { provider: "local_magic" },
                request,
            });
        } catch (auditError) {
            console.error("magic-link verify: audit write failed", auditError);
        }

        const response = NextResponse.json({
            authenticated: true,
            provider: "local_magic",
            redirectTo: session.redirectTo,
            userType: session.userType,
        });

        response.cookies.set(
            getSessionCookieName(),
            session.accessToken,
            buildSessionCookieOptions(
                getTokenTtlSeconds(),
                request,
            ),
        );

        return response;
    } catch (error) {
        if (isMagicLinkDeniedError(error)) {
            try {
                if (error.tenantId && error.userId) {
                    const action = error.code === "DOMAIN_NOT_ALLOWED"
                        ? "login_denied_domain_not_allowed"
                        : "login_denied";
                    await writeAuditLog({
                        tenantId: error.tenantId,
                        userId: error.userId,
                        entityType: "auth",
                        entityId: error.userId,
                        action,
                        details: error.message,
                        metadataJson: toAccessDeniedMetadata(error),
                        request,
                    });
                }
            } catch (auditError) {
                console.error("magic-link verify: denied audit write failed", auditError);
            }

            return NextResponse.json(
                {
                    detail: error.message,
                    code: error.code,
                },
                { status: error.status },
            );
        }

        if (error instanceof Error) {
            const status = codeFromDetail(error.message) === "INVALID_TOKEN" ? 400 : 410;
            return NextResponse.json(
                {
                    detail: error.message,
                    code: codeFromDetail(error.message),
                },
                { status },
            );
        }

        return handleApiError(error);
    }
}
