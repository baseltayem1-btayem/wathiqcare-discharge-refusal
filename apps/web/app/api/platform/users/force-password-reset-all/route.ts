import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
  buildPasswordResetLink,
  createPasswordResetToken,
  ensurePasswordResetSchema,
  getPasswordResetTtlMinutes,
  sendPasswordResetEmail,
} from "@/lib/server/auth-reset";
import { writeAuditLog } from "@/lib/server/saas-services";

type ForcePasswordResetPayload = {
  reason?: string;
  clearPasswordHashes?: boolean;
  includeInactiveUsers?: boolean;
};

export const runtime = "nodejs";

function normalizeReason(raw: string | undefined): string {
  const value = (raw || "").trim();
  if (!value) {
    return "Global forced password reset";
  }
  return value.slice(0, 500);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePlatformAccess(request);
    if (!auth.tenant_id) {
      throw new ApiError(403, "Platform tenant context is missing");
    }

    const payload = (await request.json().catch(() => null)) as ForcePasswordResetPayload | null;
    const reason = normalizeReason(payload?.reason);
    const includeInactiveUsers = payload?.includeInactiveUsers === true;
    const clearPasswordHashes = payload?.clearPasswordHashes === true;

    const prisma = getPrisma();
    await ensurePasswordResetSchema(prisma);

    const candidates = await prisma.user.findMany({
      where: includeInactiveUsers ? undefined : { isActive: true },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const filtered = candidates.filter((item) => Boolean(item.email));
    const ttlMinutes = getPasswordResetTtlMinutes();

    let processed = 0;
    let emailSent = 0;
    let emailFailed = 0;

    const failures: Array<{ userId: string; email: string; reason: string }> = [];

    for (const user of filtered) {
      const token = await createPasswordResetToken(prisma, {
        userId: user.id,
        createdBy: auth.sub,
        reason,
      });

      await prisma.$executeRaw`
        UPDATE users
        SET password_reset_required = TRUE,
            session_revoked_at = NOW(),
            hashed_password = CASE WHEN ${clearPasswordHashes} THEN NULL ELSE hashed_password END
        WHERE id = ${user.id}
      `;

      const resetLink = buildPasswordResetLink(token.rawToken);

      try {
        await sendPasswordResetEmail({
          to: user.email,
          resetLink,
          expiresMinutes: ttlMinutes,
        });
        emailSent += 1;
      } catch (error) {
        emailFailed += 1;
        failures.push({
          userId: user.id,
          email: user.email,
          reason: error instanceof Error ? error.message : String(error),
        });
      }

      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "USER_ACCOUNT",
        entityId: user.id,
        action: "FORCE_PASSWORD_RESET_ISSUED",
        details: `reason=${reason} clearPasswordHashes=${clearPasswordHashes} email=${user.email}`,
        metadataJson: {
          reason,
          clearPasswordHashes,
          recipient: user.email,
          tokenId: token.tokenId,
        },
        request,
      });

      processed += 1;
    }

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "SECURITY_OPERATION",
      entityId: "global-force-password-reset",
      action: "FORCE_PASSWORD_RESET_COMPLETED",
      details: `processed=${processed} emailSent=${emailSent} emailFailed=${emailFailed}`,
      metadataJson: {
        reason,
        includeInactiveUsers,
        clearPasswordHashes,
        processed,
        emailSent,
        emailFailed,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      processed,
      emailSent,
      emailFailed,
      includeInactiveUsers,
      clearPasswordHashes,
      failures,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
