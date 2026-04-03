import { randomUUID } from "node:crypto";
import {
    InvitationStatus,
    MembershipStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { issueMagicLinkForUser } from "@/lib/server/magic-link-auth";
import { getPrisma } from "@/lib/server/prisma";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import {
    canonicalizeUserRole,
    membershipRoleForUserRole,
    userTypeForUserRole,
} from "@/lib/server/roles";

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

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ tenantId: string }> },
) {
    try {
        const prisma = getPrisma();
        const auth = await requirePlatformAccess(request);
        const { tenantId } = await context.params;

        if (!tenantId) throw new ApiError(400, "tenantId is required");

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, isActive: true },
        });

        if (!tenant) throw new ApiError(404, "Tenant not found");
        if (!tenant.isActive) throw new ApiError(403, "Tenant is inactive");

        const payload = (await request.json().catch(() => null)) as CreateTenantAdminPayload | null;
        if (!payload) throw new ApiError(400, "Invalid JSON body");

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
            throw new ApiError(400, "Invalid role");
        }

        const role = canonicalizeUserRole(rawRole);
        const membershipRole = membershipRoleForUserRole(role);
        const userType = userTypeForUserRole(role, email);

        const existing = await prisma.user.findUnique({ where: { email } });

        const invitationToken =
            randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");

        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // ─────────────────────────────────────────────
        // Existing user flow
        // ─────────────────────────────────────────────
        if (existing) {
            const existingMembership = await prisma.tenantMembership.findUnique({
                where: { tenantId_userId: { tenantId, userId: existing.id } },
            });

            if (existingMembership) {
                throw new ApiError(409, "User already in tenant");
            }

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
                    },
                },
            });

            await prisma.invitation.create({
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

            if (sendInvite) {
                const magic = await issueMagicLinkForUser(existing.id);

                await sendInviteEmail({
                    email,
                    fullName: existing.fullName,
                    tenantName: tenant.name,
                    role,
                    magic,
                });
            }

            return NextResponse.json(
                toJsonSafe({
                    success: true,
                    user_id: existing.id,
                    membershipId: membership.id,
                }),
                { status: 201 },
            );
        }

        // ─────────────────────────────────────────────
        // New user flow
        // ─────────────────────────────────────────────
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
                    },
                },
            });

            await tx.invitation.create({
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

            return { user, membership };
        });

        if (sendInvite) {
            const magic = await issueMagicLinkForUser(created.user.id);

            await sendInviteEmail({
                email,
                fullName,
                tenantName: tenant.name,
                role,
                magic,
            });
        }

        return NextResponse.json(
            toJsonSafe({
                success: true,
                user_id: created.user.id,
            }),
            { status: 201 },
        );
    } catch (error) {
        return handleApiError(error);
    }
}

// ─────────────────────────────────────────────
// Email
// ─────────────────────────────────────────────

interface InviteEmailArgs {
    email: string;
    fullName: string;
    tenantName: string;
    role: string;
    magic: { magicUrl: string; expiresMinutes: number };
}

async function sendInviteEmail({
    email,
    fullName,
    tenantName,
    role,
    magic,
}: InviteEmailArgs) {
    const html = buildWathiqCareEmailHtml({
        title: "You've been invited to WathiqCare",
        bodyHtml: `<p>Hello ${fullName}, you are now ${role} in ${tenantName}</p>`,
        ctaUrl: magic.magicUrl,
        ctaText: "Access WathiqCare",
        expiresNote: `Expires in ${magic.expiresMinutes} minutes`,
        securityNote: "You are receiving this because an admin invited you to WathiqCare.",
    });

    const text = buildWathiqCareEmailText({
        title: "Invitation",
        bodyLines: [
            `Hello ${fullName}`,
            `You are now ${role} in ${tenantName}`,
        ],
        ctaUrl: magic.magicUrl,
        ctaLabel: "Access",
        securityNote: "You are receiving this because an admin invited you to WathiqCare.",
    });

    await sendEmailWithDiagnostics({
        to: email,
        subject: "WathiqCare Invitation",
        html,
        text,
    });
}