import { randomUUID } from "node:crypto";
import {
    InvitationStatus,
    MembershipRole,
    MembershipStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { issueMagicLinkForUser } from "@/lib/server/magic-link-auth";
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

function normalizeEmail(value?: string): string {
    return (value ?? "").trim().toLowerCase();
}

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma(); // ✅ FIX

        const auth = await requirePlatformAccess(request);

        const payload = (await request.json().catch(() => null)) as CreatePlatformUserPayload | null;
        if (!payload) throw new ApiError(400, "Invalid JSON body");

        const email = normalizeEmail(payload.email);
        const fullName = (payload.fullName ?? "").trim();
        const role = (payload.role ?? "platform_operator").trim().toLowerCase();
        const sendInvite = payload.sendInvite !== false;
        const isActive = payload.isActive !== false;

        if (!email || !validateEmail(email)) {
            throw new ApiError(400, "Valid email is required");
        }

        if (!fullName) {
            throw new ApiError(400, "fullName is required");
        }

        if (!PLATFORM_USER_ROLES.has(role)) {
            throw new ApiError(
                400,
                `role must be one of: ${[...PLATFORM_USER_ROLES].join(", ")}`
            );
        }

        const platformTenant = await getPrisma().tenant.findUnique({
            where: { code: "wathiqcare" },
            select: { id: true, name: true },
        });

        if (!platformTenant) {
            throw new ApiError(500, "Platform tenant not configured");
        }

        const existing = await getPrisma().user.findUnique({ where: { email } });
        if (existing) {
            throw new ApiError(409, "User already exists");
        }

        const invitationToken =
            randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const created = await getPrisma().$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    tenantId: platformTenant.id,
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
                bodyHtml: `<p>Hello ${fullName}, you are now ${role} on the platform.</p>`,
                ctaUrl: magic.magicUrl,
                ctaText: "Access WathiqCare",
                expiresNote: `Expires in ${magic.expiresMinutes} minutes`,
                securityNote: "You are receiving this because a platform admin created your account.",
            });

            const text = buildWathiqCareEmailText({
                title: "Invitation",
                bodyLines: [`Hello ${fullName}`, `You are now ${role} on WathiqCare`],
                ctaUrl: magic.magicUrl,
                ctaLabel: "Access",
                securityNote: "You are receiving this because a platform admin created your account.",
            });

            await sendEmailWithDiagnostics({
                to: email,
                subject: "WathiqCare Invitation",
                html,
                text,
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
