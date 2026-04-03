import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
=======
import { prisma } from "@/lib/server/prisma";
import { buildWathiqCareEmailHtml, buildWathiqCareEmailText, sendEmailWithDiagnostics } from "@/lib/server/email-provider";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

<<<<<<< HEAD
type RouteContext = {
    params: Promise<{ userId: string }>;
};

function ensureTenantAdmin(role: string | undefined): void {
    const normalized = (role ?? "").trim().toLowerCase();

    if (!["tenant_admin", "tenant_owner"].includes(normalized)) {
        throw new ApiError(403, "Only tenant admins can resend invitations");
    }
}

function getAppUrl(): string {
    return (process.env.NEXT_PUBLIC_APP_URL || "https://wathiqcare.online").replace(/\/$/, "");
}

/**
 * POST /api/tenant/users/[userId]/resend-invite
 * Resends invitation email to a user with PENDING invitation status
 */
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const prisma = getPrisma();

=======
/**
 * POST /api/tenant/users/[userId]/resend-invite
 * Resends invitation email to a user with INVITED status
 */
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
            throw new ApiError(403, "Only tenant admins can resend invitations");
        }

        // Find the user and their membership
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
=======
        // Find pending invitation
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const invitation = await prisma.invitation.findFirst({
            where: {
                tenantId,
                email: user.email,
<<<<<<< HEAD
                status: "PENDING",
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                token: true,
                status: true,
                createdAt: true,
                expiresAt: true,
            },
        });

        if (!invitation) {
            throw new ApiError(
                400,
                "No pending invitation found for this user. Try creating a new invitation.",
            );
        }

        const inviteLink = `${getAppUrl()}/auth/accept-invite?token=${encodeURIComponent(
            invitation.token,
        )}`;

        const recipientName = (user.fullName || user.email).trim();
=======
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
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://wathiqcare.online").replace(/\/$/, "");
        const inviteLink = `${appUrl}/auth/accept-invite?token=${encodeURIComponent(invitation.token)}`;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        const emailText = buildWathiqCareEmailText({
            title: "WathiqCare Invitation",
            bodyLines: [
<<<<<<< HEAD
                `Hi ${recipientName},`,
=======
                `Hi ${user.fullName},`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                "",
                "You have been invited to join our WathiqCare tenant.",
                "Use the secure link below to accept the invitation.",
            ],
            ctaUrl: inviteLink,
            ctaLabel: "Accept invitation",
            expiresNote: "This invitation link expires in 7 days.",
            securityNote: "Invitation links are single-use and protected by expiry.",
        });

        const emailHtml = buildWathiqCareEmailHtml({
<<<<<<< HEAD
            title: "You're invited to WathiqCare",
            preheader: "Accept your tenant invitation",
            bodyHtml: `
                <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7;">
                    Hi ${recipientName},
                </p>
                <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">
                    You have been invited to join our WathiqCare tenant. Click the button below to continue.
                </p>
            `,
=======
            title: `You're invited to WathiqCare`,
            preheader: "Accept your tenant invitation",
            bodyHtml: `<p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7;">Hi ${user.fullName},</p><p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">You have been invited to join our WathiqCare tenant. Click the button below to continue.</p>`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            ctaUrl: inviteLink,
            ctaText: "Accept Invitation",
            expiresNote: "This invitation link expires in 7 days.",
            securityNote: "If you did not expect this invitation, ignore this message.",
        });

        await sendEmailWithDiagnostics({
            to: user.email,
            subject: "WathiqCare Invitation - Please Join Our Tenant",
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
            action: "INVITE_RESENT",
            details: `Invitation resent to ${user.email} (invitationId=${invitation.id})`,
            request,
        });

        return NextResponse.json({
            success: true,
            message: "Invitation email resent successfully",
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
