import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { buildWathiqCareEmailHtml, buildWathiqCareEmailText, sendEmailWithDiagnostics } from "@/lib/server/email-provider";
import { writeAuditLog } from "@/lib/server/saas-services";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

/**
 * POST /api/tenant/users/[userId]/reset-password
 * Sends password reset email to a user (admin/tenant admin initiated)
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        const auth = await requireAuth(request);
        const tenantId = auth.tenant_id;

        if (!tenantId || !userId) {
            throw new ApiError(400, "tenantId and userId are required");
        }

        // Verify user is tenant admin
        if (!["tenant_admin", "tenant_owner"].includes((auth.role || "").toLowerCase())) {
            throw new ApiError(403, "Only tenant admins can trigger password resets");
        }

        // Find the user
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                tenantId
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                tenantId: true,
            }
        });

        if (!user) {
            throw new ApiError(404, "User not found in this tenant");
        }

        // Create password reset token
        const rawToken = randomUUID();
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store token on user record
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordResetTokenHash: tokenHash,
                passwordResetExpiresAt: expiresAt,
            }
        });

        // Build password reset email
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://wathiqcare.online").replace(/\/$/, "");
        const resetLink = `${appUrl}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;

        const emailText = buildWathiqCareEmailText({
            title: "WathiqCare Password Reset",
            bodyLines: [
                `Hi ${user.fullName},`,
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
            bodyHtml: `<p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7;">Hi ${user.fullName},</p><p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">A tenant administrator requested a password reset for your account.</p>`,
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

        // Log audit event
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
            email: user.email
        });

    } catch (error) {
        return handleApiError(error);
    }
}
