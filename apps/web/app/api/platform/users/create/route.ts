import { randomUUID } from "node:crypto";
import { InvitationStatus, MembershipRole, MembershipStatus } from "@/lib/server/prisma-enums";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { issueMagicLinkForUser } from "@/lib/server/magic-link-auth";
import { getPlatformTenant } from "@/lib/server/platform-tenant";

import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import { userTypeForUserRole } from "@/lib/server/roles";

export const runtime = "nodejs";

const PLATFORM_USER_ROLES = new Set([
    "platform_admin",
    "platform_operator",
    "support_viewer",
]);

type CreatePlatformUserPayload = {
    email?: string;
    fullName?: string;
    role?: string;
    sendInvite?: boolean;
    isActive?: boolean;
};

/**
 * POST /api/platform/users/create
 * Create a new platform-scoped user.
 * Allowed roles: platform_admin, platform_operator, support_viewer.
 * Gated: PLATFORM_ADMIN only.
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await requirePlatformAccess(request);

        const payload = (await request.json().catch(() => null)) as CreatePlatformUserPayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const email = (payload.email || "").trim().toLowerCase();
        const fullName = (payload.fullName || "").trim();
        const role = (payload.role || "platform_operator").trim().toLowerCase();
        const sendInvite = payload.sendInvite !== false;
        const isActive = payload.isActive !== false;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "Valid email is required");
        }
        if (!fullName) {
            throw new ApiError(400, "fullName is required");
        }
        if (!PLATFORM_USER_ROLES.has(role)) {
            throw new ApiError(400, `role must be one of: ${[...PLATFORM_USER_ROLES].join(", ")}`);
        }


        // Use singleton Prisma client
        const prisma = getPrisma();

        // Ensure the platform tenant exists (auto-bootstrapped if missing).
        const platformTenant = await getPlatformTenant();

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ApiError(409, "A user with this email already exists");
        }

        const invitationToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const created = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
            const user = await tx.user.create({
                data: {
                    tenantId: platformTenant.id,
                    email,
                    fullName,
                    role,
                    userType: userTypeForUserRole(role),
                    status: "active",
                    isActive,
                    hashedPassword: null,
                    emailVerified: false,
                    authProvider: "local_magic",
                },
            });

            const membership = await tx.tenantMembership.create({
                data: {
                    tenantId: platformTenant.id,
                    userId: user.id,
                    role: MembershipRole.ADMIN,
                    status: MembershipStatus.ACTIVE,
                    invitedAt: new Date(),
                    metadata: {
                        invitedByUserId: auth.sub,
                        inviteFlow: "platform_user_create",
                        platformRole: role,
                    },
                },
            });

            const invitation = await tx.invitation.create({
                data: {
                    tenantId: platformTenant.id,
                    email,
                    role: MembershipRole.ADMIN,
                    status: InvitationStatus.PENDING,
                    token: invitationToken,
                    expiresAt: invitationExpiresAt,
                    invitedByUserId: auth.sub,
                },
            });

            return { user, membership, invitation };
        });

        await writeAuditLog({
            tenantId: platformTenant.id,
            userId: auth.sub,
            entityType: "USER",
            entityId: created.user.id,
            action: "PLATFORM_USER_CREATED",
            details: `Platform user created: ${email} with role ${role}`,
            metadataJson: { email, fullName, role },
            request,
        });

        if (sendInvite) {
            const magic = await issueMagicLinkForUser(created.user.id);

            const html = buildWathiqCareEmailHtml({
                title: "You've been invited to WathiqCare",
                preheader: `${fullName}, you have been added as a platform team member.`,
                bodyHtml: `
          <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">Hello ${fullName},</p>
          <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
            You have been added to the <strong>WathiqCare platform team</strong> with role
            <strong>${role}</strong>.
            Use the secure link below to access your account.
          </p>
        `,
                ctaUrl: magic.magicUrl,
                ctaText: "Access WathiqCare",
                expiresNote: `This link expires in ${magic.expiresMinutes} minutes and can only be used once.`,
                securityNote: "You received this because a platform administrator provisioned your account.",
            });

            const text = buildWathiqCareEmailText({
                title: "You've been invited to WathiqCare",
                bodyLines: [
                    `Hello ${fullName},`,
                    `You have been added to the WathiqCare platform team with role: ${role}.`,
                    "Use the secure link below to access your account:",
                ],
                ctaUrl: magic.magicUrl,
                ctaLabel: "Access WathiqCare",
                expiresNote: `This link expires in ${magic.expiresMinutes} minutes.`,
                securityNote: "You received this because a platform administrator provisioned your account.",
            });

            await sendEmailWithDiagnostics({
                to: email,
                subject: "You've been invited to WathiqCare",
                html,
                text,
            });

            await writeAuditLog({
                tenantId: platformTenant.id,
                userId: auth.sub,
                entityType: "INVITATION",
                entityId: created.invitation.id,
                action: "USER_INVITED",
                details: `Platform invitation sent to ${email}`,
                metadataJson: { email, role },
                request,
            });
        }

        return NextResponse.json(
            toJsonSafe({ success: true, user_id: created.user.id }),
            { status: 201 },
        );
    } catch (error) {
        return handleApiError(error);
    }
}
