import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { requireAuth } from "@/lib/server/auth";
import { getUserResetState } from "@/lib/server/auth-reset";
import { hashPassword, validatePasswordStrength } from "@/lib/server/password";

/**
 * POST /api/auth/change-password
 * Changes password for the currently authenticated user.
 * Used by /first-login page when mustChangePassword / password_reset_required is true.
 *
 * IMPORTANT: This route passes `allowPasswordResetRequired: true` to requireAuth so that
 * users with password_reset_required = true can reach this endpoint. Without this bypass
 * the auth guard would return 403 before the user could ever clear the flag — a catch-22.
 */
export async function POST(request: NextRequest) {
    const endpoint = request.nextUrl.pathname;
    console.info("CHANGE_PASSWORD_ROUTE_HIT", { endpoint });

    try {
        // allowPasswordResetRequired: true lets sessions with password_reset_required=true
        // through so users can fulfil the forced-reset requirement.
        const auth = await requireAuth(request, { allowPasswordResetRequired: true });
        const prisma = getPrisma();

        // Log current DB state for diagnostics before any mutation.
        const resetStateBefore = await getUserResetState(prisma, auth.sub);
        console.info("CHANGE_PASSWORD_PRE_STATE", {
            endpoint,
            userId: auth.sub,
            passwordResetRequired: resetStateBefore.passwordResetRequired,
            sessionRevokedAt: resetStateBefore.sessionRevokedAt?.toISOString() ?? null,
            authGuardDecision: "allowed (allowPasswordResetRequired=true)",
        });

        const payload = (await request.json().catch(() => null)) as { password?: string } | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const { password } = payload;
        if (!password) {
            throw new ApiError(400, "Password is required");
        }

        const validation = validatePasswordStrength(password);
        if (!validation.valid) {
            throw new ApiError(400, validation.errors.join("; "));
        }

        const passwordHash = await hashPassword(password);

        // Clear password_reset_required and revoke any pre-change sessions so
        // the new credentials take effect immediately.
        await prisma.$executeRaw`
            UPDATE users
            SET hashed_password          = ${passwordHash},
                auth_provider            = 'local_password',
                last_password_changed_at = NOW(),
                password_reset_required  = FALSE,
                session_revoked_at       = NOW(),
                failed_login_attempts    = 0,
                locked_until             = NULL
            WHERE id = ${auth.sub}
        `;

        console.info("CHANGE_PASSWORD_SUCCESS", { endpoint, userId: auth.sub });
        return NextResponse.json({ ok: true, message: "Password updated successfully" });
    } catch (error) {
        const isApiError = error instanceof ApiError;
        console.error("CHANGE_PASSWORD_REJECTED", {
            endpoint,
            errorType: isApiError ? "ApiError" : (error instanceof Error ? error.constructor.name : "UnknownError"),
            statusCode: isApiError ? error.status : null,
        });
        return handleApiError(error);
    }
}
