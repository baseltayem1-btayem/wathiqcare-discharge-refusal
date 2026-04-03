<<<<<<< HEAD
import { randomUUID, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ userId: string }>;
};

function ensureTenantAdmin(role: string | undefined): void {
    const normalized = (role ?? "").trim().toLowerCase();

    if (!["tenant_admin", "tenant_owner"].includes(normalized)) {
        throw new ApiError(403, "Only tenant admins can trigger password resets");
    }
}

function getAppUrl(): string {
    return (process.env.NEXT_PUBLIC_APP_URL || "https://wathiqcare.online").replace(/\/$/, "");
}

=======
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { buildWathiqCareEmailHtml, buildWathiqCareEmailText, sendEmailWithDiagnostics } from "@/lib/server/email-provider";
import { writeAuditLog } from "@/lib/server/saas-services";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
/**
 * POST /api/tenant/users/[userId]/reset-password
 * Sends password reset email to a user (admin/tenant admin initiated)
 */
<<<<<<< HEAD
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const prisma = getPrisma();

=======
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const { userId } = await context.params;
        const auth = await requireAuth(request);
        const tenantId = auth.tenant_id;

        if (!tenantId || !userId) {
            throw new ApiError(400, "tenantId and userId are required");
        }

<<<<<<< HEAD
        ensureTenantAdmin(auth.role);

        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                tenantId,
=======
        // Verify user is tenant admin
        if (!["tenant_admin", "tenant_owner"].includes((auth.role || "").toLowerCase())) {
            throw new ApiError(403, "Only tenant admins can trigger password resets");
        }

        // Find the user
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                tenantId
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                tenantId: true,
<<<<<<< HEAD
            },
=======
            }
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        });

        if (!user) {
            throw new ApiError(404, "User not found in this tenant");
        }

<<<<<<< HEAD
        const rawToken = randomUUID();
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

=======
        // Create password reset token
        const rawToken = randomUUID();
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store token on user record
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordResetTokenHash: tokenHash,
                passwordResetExpiresAt: expiresAt,
<<<<<<< HEAD
            },
        });

        const resetLink = `${getAppUrl()}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;
        const recipientName = (user.fullName || user.email).trim();
=======
            }
        });

        // Build password reset email
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://wathiqcare.online").replace(/\/$/, "");
        const resetLink = `${appUrl}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        const emailText = buildWathiqCareEmailText({
            title: "WathiqCare Password Reset",
            bodyLines: [
<<<<<<< HEAD
                `Hi ${recipientName},`,
=======
                `Hi ${user.fullName},`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                "",
                "Your password reset has been requested by your tenant administrator.",
            ],
            ctaUrl: resetLink,
            ctaLabel: "Reset password",
            expiresNote: "This reset link expires in 24 hours.",
            securityNote: "If this wasn't expected, contact your administrator immediately.",
        });

        const emailHtml = buildWathiqCareEmailHtml({
            title: "Reset your WathiqCare password",
            preheader: "Tenant administrator requested a password reset",
<<<<<<< HEAD
            bodyHtml: `
                <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7;">
                    Hi ${recipientName},
                </p>
                <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">
                    A tenant administrator requested a password reset for your account.
                </p>
            `,
=======
            bodyHtml: `<p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7;">Hi ${user.fullName},</p><p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">A tenant administrator requested a password reset for your account.</p>`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            ctaUrl: resetLink,
            ctaText: "Reset Password",
            expiresNote: "This reset link expires in 24 hours.",
            securityNote: "If you did not expect this request, ignore this message and contact support.",
        });

        await sendEmailWithDiagnostics({
            to: user.email,
            subject: "WathiqCare Password Reset Request",
            html: emailHtml,
            text: emailText,
        });

<<<<<<< HEAD
=======
        // Log audit event
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "USER",
            entityId: userId,
            action: "PASSWORD_RESET_TRIGGERED",
            details: `Password reset triggered for ${user.email}`,
            request,
        });

        return NextResponse.json({
            success: true,
            message: "Password reset email sent successfully",
<<<<<<< HEAD
            email: user.email,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
=======
            email: user.email
        });

    } catch (error) {
        return handleApiError(error);
    }
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
