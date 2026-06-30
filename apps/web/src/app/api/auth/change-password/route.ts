import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { requireAuth } from "@/lib/server/auth";
import { hashPassword, validatePasswordStrength } from "@/lib/server/password";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChangePasswordPayload = {
  newPassword?: string;
};

/**
 * POST /api/auth/change-password
 * Changes the password for the currently authenticated user.
 * Used by /first-login when mustChangePassword is true.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allowPasswordReset: true });
    const prisma = getPrisma();

    const payload = (await request.json().catch(() => null)) as ChangePasswordPayload | null;
    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const { newPassword } = payload;
    if (!newPassword || typeof newPassword !== "string") {
      throw new ApiError(400, "New password is required");
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      throw new ApiError(400, validation.errors.join("; "));
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$executeRaw`
      UPDATE users
      SET hashed_password = ${passwordHash},
          auth_provider = 'local_password',
          last_password_changed_at = NOW(),
          password_reset_required = FALSE,
          failed_login_attempts = 0,
          locked_until = NULL,
          session_revoked_at = NULL
      WHERE id = ${auth.sub}
    `;

    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
