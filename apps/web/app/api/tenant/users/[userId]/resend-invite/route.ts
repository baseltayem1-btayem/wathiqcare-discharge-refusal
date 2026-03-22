import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { buildWathiqCareEmailHtml, buildWathiqCareEmailText, sendEmailWithDiagnostics } from "@/lib/server/email-provider";
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

/**
 * POST /api/tenant/users/[userId]/resend-invite
 * Resends invitation email to a user with INVITED status
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
            throw new ApiError(403, "Only tenant admins can resend invitations");
        }

        // Find the user and their membership
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

        // Find pending invitation
        const invitation = await prisma.invitation.findFirst({
            where: {
                tenantId,
                email: user.email,
                status: "PENDING"
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        if (!invitation) {
            throw new ApiError(400, "No pending invitation found for this user. Try creating a new invitation.");
        }

        // Resend the email
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${encodeURIComponent(invitation.token)}`;

        const emailText = buildWathiqCareEmailText(
            `Hi ${user.fullName},`,
            `You have been invited to join our WathiqCare tenant. Click the link below to accept the invitation.`,
            `Invitation Link:\n${inviteLink}`,
            "This invitation will expire in 7 days."
        );

        const emailHtml = buildWathiqCareEmailHtml(
            `Hi ${user.fullName},`,
            `<p>You have been invited to join our WathiqCare tenant. Click the button below to accept the invitation.</p>`,
            `<a href="${inviteLink}" style="display:inline-block;padding:10px 20px;background-color:#0066cc;color:white;text-decoration:none;border-radius:4px;">Accept Invitation</a>`,
            "This invitation will expire in 7 days."
        );

        await sendEmailWithDiagnostics(
            {
                recipients: [user.email],
                subject: "WathiqCare Invitation - Please Join Our Tenant",
                htmlBody: emailHtml,
                textBody: emailText,
                cc: [],
                attachments: []
            }
        );

        // Log audit event
        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            action: "INVITE_RESENT",
            targetUserId: userId,
            details: {
                targetEmail: user.email,
                invitationId: invitation.id
            },
            status: "success"
        });

        return NextResponse.json({
            success: true,
            message: "Invitation email resent successfully",
            email: user.email
        });

    } catch (error) {
        return handleApiError(error);
    }
}
