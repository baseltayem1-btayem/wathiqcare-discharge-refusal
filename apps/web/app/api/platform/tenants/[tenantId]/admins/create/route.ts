import { randomUUID } from "node:crypto";
import { InvitationStatus, MembershipRole, MembershipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { issueMagicLinkForUser } from "@/lib/server/magic-link-auth";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import { canonicalizeUserRole, membershipRoleForUserRole, userTypeForUserRole } from "@/lib/server/roles";

export const runtime = "nodejs";

const ALLOWED_ADMIN_ROLES = new Set(["tenant_owner", "tenant_admin"]);

type CreateTenantAdminPayload = {
    email?: string;
    fullName?: string;
    role?: string;
    department?: string;
    sendInvite?: boolean;
    isActive?: boolean;
};

/**
 * POST /api/platform/tenants/[tenantId]/admins/create
 * Platform admin creates a new tenant admin or tenant owner for existing tenant.
 * Bypasses domain restriction — platform admin can provision any email domain.
 * Gated: PLATFORM_ADMIN only.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ tenantId: string }> },
) {
    try {
        const auth = await requirePlatformAccess(request);
        const { tenantId } = await context.params;

        if (!tenantId) {
            throw new ApiError(400, "tenantId is required");
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, isActive: true },
        });
        if (!tenant) {
            throw new ApiError(404, "Tenant not found");
        }
        if (!tenant.isActive) {
            throw new ApiError(403, "Cannot add admins to an inactive tenant");
        }

        const payload = (await request.json().catch(() => null)) as CreateTenantAdminPayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const email = (payload.email || "").trim().toLowerCase();
        const fullName = (payload.fullName || "").trim();
        const rawRole = (payload.role || "tenant_admin").trim().toLowerCase();
        const department = (payload.department || "").trim().toUpperCase() || null;
        const sendInvite = payload.sendInvite !== false;
        const isActive = payload.isActive !== false;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "Valid email is required");
        }
        if (!fullName) {
            throw new ApiError(400, "fullName is required");
        }
        if (!ALLOWED_ADMIN_ROLES.has(rawRole)) {
            throw new ApiError(400, "role must be one of: tenant_owner, tenant_admin");
        }

        const role = canonicalizeUserRole(rawRole);
        const membershipRole = membershipRoleForUserRole(role);
        const userType = userTypeForUserRole(role, email);

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            // Check if they already have a membership in this tenant
            const existingMembership = await prisma.tenantMembership.findUnique({
                where: { tenantId_userId: { tenantId, userId: existing.id } },
            });
            if (existingMembership) {
                throw new ApiError(409, "User already has membership in this tenant");
            }
            // If user exists elsewhere, create membership for this tenant
            const invitationToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
            const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const membership = await prisma.tenantMembership.create({
                data: {
                    tenantId,
                    userId: existing.id,
                    role: membershipRole,
                    status: MembershipStatus.ACTIVE,
                    invitedAt: new Date(),
                    metadata: {
                        department,
                        invitedByUserId: auth.sub,
                        inviteFlow: "platform_tenant_admin_create",
                    },
                },
            });

            const invitation = await prisma.invitation.create({
                data: {
                    tenantId,
                    email,
                    role: membershipRole,
                    status: InvitationStatus.PENDING,
                    token: invitationToken,
                    expiresAt: invitationExpiresAt,
                    invitedByUserId: auth.sub,
                },
            });

            await writeAuditLog({
                tenantId,
                userId: auth.sub,
                entityType: "USER",
                entityId: existing.id,
                action: "TENANT_ADMIN_CREATED",
                details: `Existing user ${email} added as ${role} to tenant ${tenant.name}`,
                metadataJson: { email, role, membershipId: membership.id },
                request,
            });

            await writeAuditLog({
                tenantId,
                userId: auth.sub,
                entityType: "ROLE",
                entityId: existing.id,
                action: "ROLE_ASSIGNED",
                details: `Role ${role} assigned to ${email} by platform admin`,
                metadataJson: { email, role, membershipRole },
                request,
            });

            if (sendInvite) {
                const magic = await issueMagicLinkForUser(existing.id);
                await sendInviteEmail({ email, fullName: existing.fullName, tenantName: tenant.name, role, magic });

                await writeAuditLog({
                    tenantId,
                    userId: auth.sub,
                    entityType: "INVITATION",
                    entityId: invitation.id,
                    action: "USER_INVITED",
                    details: `Invite sent to existing user ${email} for tenant ${tenant.name}`,
                    metadataJson: { email, role },
                    request,
                });
            }

            return NextResponse.json(
                toJsonSafe({ success: true, user_id: existing.id, membershipId: membership.id }),
                { status: 201 },
            );
        }

        // New user
        const invitationToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const created = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    tenantId,
                    email,
                    fullName,
                    role,
                    userType,
                    status: "active",
                    isActive,
                    hashedPassword: null,
                    emailVerified: false,
                    authProvider: "local_magic",
                },
            });

            const membership = await tx.tenantMembership.create({
                data: {
                    tenantId,
                    userId: user.id,
                    role: membershipRole,
                    status: MembershipStatus.ACTIVE,
                    invitedAt: new Date(),
                    metadata: {
                        department,
                        invitedByUserId: auth.sub,
                        inviteFlow: "platform_tenant_admin_create",
                    },
                },
            });

            const invitation = await tx.invitation.create({
                data: {
                    tenantId,
                    email,
                    role: membershipRole,
                    status: InvitationStatus.PENDING,
                    token: invitationToken,
                    expiresAt: invitationExpiresAt,
                    invitedByUserId: auth.sub,
                },
            });

            return { user, membership, invitation };
        });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "USER",
            entityId: created.user.id,
            action: "TENANT_ADMIN_CREATED",
            details: `Tenant admin created: ${email} with role ${role} in tenant ${tenant.name}`,
            metadataJson: { email, fullName, role, department },
            request,
        });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "ROLE",
            entityId: created.user.id,
            action: "ROLE_ASSIGNED",
            details: `Role ${role} assigned to ${email} by platform admin`,
            metadataJson: { email, role, membershipRole },
            request,
        });

        if (sendInvite) {
            const magic = await issueMagicLinkForUser(created.user.id);
            await sendInviteEmail({ email, fullName, tenantName: tenant.name, role, magic });

            await writeAuditLog({
                tenantId,
                userId: auth.sub,
                entityType: "INVITATION",
                entityId: created.invitation.id,
                action: "USER_INVITED",
                details: `Invitation sent to ${email} for tenant ${tenant.name}`,
                metadataJson: { email, role, tenantId },
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

interface InviteEmailArgs {
    email: string;
    fullName: string;
    tenantName: string;
    role: string;
    magic: { magicUrl: string; expiresMinutes: number };
}

async function sendInviteEmail({ email, fullName, tenantName, role, magic }: InviteEmailArgs) {
    const html = buildWathiqCareEmailHtml({
        title: "You've been invited to WathiqCare",
        preheader: `${fullName}, you've been set up as ${role} for ${tenantName}.`,
        bodyHtml: `
      <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">Hello ${fullName},</p>
      <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
        You have been added as <strong>${role}</strong> for <strong>${tenantName}</strong> on WathiqCare.
        Use the secure link below to access your account.
      </p>
    `,
        ctaUrl: magic.magicUrl,
        ctaText: "Access WathiqCare",
        expiresNote: `This secure link expires in ${magic.expiresMinutes} minutes and can only be used once.`,
        securityNote: "You received this because a platform administrator provisioned your account.",
    });

    const text = buildWathiqCareEmailText({
        title: "You've been invited to WathiqCare",
        bodyLines: [
            `Hello ${fullName},`,
            `You have been added as ${role} for ${tenantName} on WathiqCare.`,
            "Use the secure link below to access your account:",
        ],
        ctaUrl: magic.magicUrl,
        ctaLabel: "Access WathiqCare",
        expiresNote: `This secure link expires in ${magic.expiresMinutes} minutes.`,
        securityNote: "You received this because a platform administrator provisioned your account.",
    });

    await sendEmailWithDiagnostics({
        to: email,
        subject: "You've been invited to WathiqCare",
        html,
        text,
    });
}
