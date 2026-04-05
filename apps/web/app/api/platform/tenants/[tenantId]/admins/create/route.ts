import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import { userTypeForUserRole } from "@/lib/server/roles";

export const runtime = "nodejs";

const TENANT_ADMIN_ROLES = new Set(["tenant_admin", "tenant_owner"]);
const MEMBERSHIP_ROLE_ADMIN = "ADMIN" as const;
const MEMBERSHIP_STATUS_ACTIVE = "ACTIVE" as const;
const INVITATION_STATUS_PENDING = "PENDING" as const;

type RouteContext = {
    params: Promise<{ tenantId: string }>;
};

type CreateTenantAdminPayload = {
    email?: string;
    fullName?: string;
    role?: string;
    department?: string;
    sendInvite?: boolean;
    isActive?: boolean;
};

function normalizeEmail(value: string | undefined): string {
    return (value || "").trim().toLowerCase();
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const auth = await requirePlatformAccess(request);
        const { tenantId } = await params;
        const prisma = getPrisma();

        const payload = (await request.json().catch(() => null)) as CreateTenantAdminPayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const email = normalizeEmail(payload.email);
        const fullName = (payload.fullName || "").trim();
        const role = (payload.role || "tenant_admin").trim().toLowerCase();
        const department = (payload.department || "").trim() || null;
        const sendInvite = payload.sendInvite !== false;
        const isActive = payload.isActive !== false;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "Valid email is required");
        }
        if (!fullName) {
            throw new ApiError(400, "fullName is required");
        }
        if (!TENANT_ADMIN_ROLES.has(role)) {
            throw new ApiError(400, "role must be one of: tenant_admin, tenant_owner");
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, code: true, isActive: true },
        });
        if (!tenant) {
            throw new ApiError(404, "Tenant not found");
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ApiError(409, "A user with this email already exists");
        }

        const invitationToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const created = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    email,
                    fullName,
                    role,
                    userType: userTypeForUserRole(role, email),
                    status: "active",
                    isActive,
                    hashedPassword: null,
                    emailVerified: false,
                    authProvider: "local_magic",
                },
            });

            const membership = await tx.tenantMembership.create({
                data: {
                    tenantId: tenant.id,
                    userId: user.id,
                    role: MEMBERSHIP_ROLE_ADMIN,
                    status: MEMBERSHIP_STATUS_ACTIVE,
                    invitedAt: new Date(),
                    metadata: {
                        invitedByUserId: auth.sub,
                        inviteFlow: "platform_tenant_admin_create",
                        platformRole: role,
                        department,
                    },
                },
            });

            const invitation = await tx.invitation.create({
                data: {
                    tenantId: tenant.id,
                    email,
                    role: MEMBERSHIP_ROLE_ADMIN,
                    status: INVITATION_STATUS_PENDING,
                    token: invitationToken,
                    expiresAt: invitationExpiresAt,
                    invitedByUserId: auth.sub,
                },
            });

            return { user, membership, invitation };
        });

        if (sendInvite) {
            const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "https://wathiqcare.online").replace(/\/$/, "");
            const inviteUrl = `${baseUrl}/login?invite=${encodeURIComponent(invitationToken)}`;
            const expiresMinutes = 7 * 24 * 60;

            const html = buildWathiqCareEmailHtml({
                title: "You've been invited to WathiqCare",
                preheader: `${fullName}, you have been added as ${role} for ${tenant.name}.`,
                bodyHtml: `
                    <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">Hello ${fullName},</p>
                    <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
                        You have been added as <strong>${role}</strong> for <strong>${tenant.name}</strong> on WathiqCare.
                        Use the secure link below to access your account.
                    </p>
                `,
                ctaUrl: inviteUrl,
                ctaText: "Access WathiqCare",
                expiresNote: `This secure link expires in ${expiresMinutes} minutes.`,
                securityNote: "You received this because a platform administrator provisioned your account.",
            });

            const text = buildWathiqCareEmailText({
                title: "You've been invited to WathiqCare",
                bodyLines: [
                    `Hello ${fullName},`,
                    `You have been added as ${role} for ${tenant.name} on WathiqCare.`,
                    "Use the secure link below to access your account:",
                ],
                ctaUrl: inviteUrl,
                ctaLabel: "Access WathiqCare",
                expiresNote: `This secure link expires in ${expiresMinutes} minutes.`,
                securityNote: "You received this because a platform administrator provisioned your account.",
            });

            await sendEmailWithDiagnostics({
                to: email,
                subject: "You've been invited to WathiqCare",
                html,
                text,
            });
        }

        await writeAuditLog({
            tenantId: tenant.id,
            userId: auth.sub,
            entityType: "USER",
            entityId: created.user.id,
            action: "TENANT_ADMIN_CREATED",
            details: `Tenant admin created: ${email} (${role})`,
            metadataJson: {
                tenantId: tenant.id,
                tenantCode: tenant.code,
                email,
                fullName,
                role,
                department,
                sendInvite,
            },
            request,
        });

        return NextResponse.json(
            toJsonSafe({
                success: true,
                user_id: created.user.id,
                invitation_id: created.invitation.id,
            }),
            { status: 201 },
        );
    } catch (error) {
        return handleApiError(error);
    }
}
