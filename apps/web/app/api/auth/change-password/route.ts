import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { requireAuth } from "@/lib/server/auth";
import { hashPassword, validatePasswordStrength } from "@/lib/server/password";

/**
 * POST /api/auth/change-password
 * Changes password for the currently authenticated user.
 * Used by /first-login page when mustChangePassword is true.
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request);
        const prisma = getPrisma();

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

        await prisma.$executeRaw`
            UPDATE users
            SET hashed_password         = ${passwordHash},
                auth_provider           = 'local_password',
                last_password_changed_at = NOW(),
                password_reset_required = FALSE,
                session_revoked_at      = NULL,
                failed_login_attempts   = 0,
                locked_until            = NULL
            WHERE id = ${auth.sub}
        `;

        return NextResponse.json({ ok: true, message: "Password updated successfully" });
    } catch (error) {
        return handleApiError(error);
    }
}
