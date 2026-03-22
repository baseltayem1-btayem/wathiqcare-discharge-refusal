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
    { params }: { params: { userId: string } }
) {
    try {
        const auth = await requireAuth(request);
        const tenantId = auth.tenant_id;
        const userId = params.userId;

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
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;

        const emailText = buildWathiqCareEmailText(
            `Hi ${user.fullName},`,
            `Your WathiqCare account password reset has been requested by your tenant administrator.`,
            `Click the link below to reset your password:\n${resetLink}`,
            `This link will expire in 24 hours.\nIf you did not request this, contact your administrator.`
        );

        const emailHtml = buildWathiqCareEmailHtml(
            `Hi ${user.fullName},`,
            `<p>Your WathiqCare account password reset has been requested by your tenant administrator.</p>`,
            `<a href="${resetLink}" style="display:inline-block;padding:10px 20px;background-color:#0066cc;color:white;text-decoration:none;border-radius:4px;">Reset Password</a>`,
            `<p style="color:#666;font-size:12px;">This link will expire in 24 hours.<br/>If you did not request this, contact your administrator.</p>`
        );

        await sendEmailWithDiagnostics({
            recipients: [user.email],
            subject: "WathiqCare Password Reset Request",
            htmlBody: emailHtml,
            textBody: emailText,
            cc: [],
            attachments: []
        });

        // Log audit event
        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            action: "PASSWORD_RESET_TRIGGERED",
            targetUserId: userId,
            details: {
                targetEmail: user.email,
                triggeredBy: "admin"
            },
            status: "success"
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
