import { randomUUID } from "node:crypto";
import {
    InvitationStatus,
    MembershipRole,
    MembershipStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantPermissionForAuth } from "@/lib/server/auth";
import {
    extractDomain,
    isTenantDomainAllowed,
    normalizeEmail,
} from "@/lib/server/auth-domain-policy";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { issueMagicLinkForUser } from "@/lib/server/magic-link-auth";
import { getPrisma } from "@/lib/server/prisma";
import {
    getTenantSubscriptionSummary,
    syncActiveUserUsage,
    writeAuditLog,
} from "@/lib/server/saas-services";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import { userTypeForUserRole } from "@/lib/server/roles";

export const runtime = "nodejs";

type CreateTenantUserPayload = {
    email?: string;
    fullName?: string;
    role?: "user" | "manager" | "admin" | string;
    department?: string;
};

const ALLOWED_CREATOR_ROLES = new Set(["tenant_admin", "tenant_owner"]);

function ensureCreatorRole(role: string | undefined): void {
    const normalized = (role ?? "").trim().toLowerCase();

    if (!ALLOWED_CREATOR_ROLES.has(normalized)) {
        throw new ApiError(403, "Only tenant admins can create users");
    }
}

function mapRequestedRole(input: string | undefined): {
    inputRole: "user" | "manager" | "admin";
    userRole: string;
    membershipRole: MembershipRole;
} {
    const normalized = (input ?? "user").trim().toLowerCase();

    if (normalized === "admin") {
        return {
            inputRole: "admin",
            userRole: "tenant_admin",
            membershipRole: MembershipRole.ADMIN,
        };
    }

    if (normalized === "manager") {
        return {
            inputRole: "manager",
            userRole: "doctor",
            membershipRole: MembershipRole.MANAGER,
        };
    }

    if (normalized === "user") {
        return {
            inputRole: "user",
            userRole: "viewer",
            membershipRole: MembershipRole.MEMBER,
        };
    }

    throw new ApiError(400, "role must be one of: user, manager, admin");
}

async function ensureCreatorMembershipActive(
    prisma: ReturnType<typeof getPrisma>,
    tenantId: string,
    userId: string,
): Promise<void> {
    const membership = await getPrisma().tenantMembership.findUnique({
        where: {
            tenantId_userId: {
                tenantId,
                userId,
            },
        },
        select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
        throw new ApiError(403, "Creator must have an active tenant membership");
    }
}

export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma(); // ✅ FIX

        const auth = await requireAuth(request);
        const tenantId = auth.tenant_id;

        if (!tenantId) {
            throw new ApiError(403, "Tenant context is required");
        }

        ensureCreatorRole(auth.role);

        await ensureCreatorMembershipActive(prisma, tenantId, auth.sub);

        await requireTenantPermissionForAuth(auth, tenantId, "users.create", {
            allowPlatform: false,
        });

        const payload = (await request.json().catch(() => null)) as CreateTenantUserPayload | null;

        const email = normalizeEmail(payload?.email);
        const fullName = (payload?.fullName ?? "").trim();
        const department = (payload?.department ?? "").trim().toUpperCase() || null;

        if (!email || !fullName) {
            throw new ApiError(400, "email and fullName are required");
        }

        const roleMapping = mapRequestedRole(payload?.role);

        if (roleMapping.inputRole === "admin") {
            await requireTenantPermissionForAuth(auth, tenantId, "roles.assign", {
                allowPlatform: false,
            });
        }

        const emailDomain = extractDomain(email);

        if (!emailDomain || !(await isTenantDomainAllowed(tenantId, emailDomain))) {
            throw new ApiError(403, "Email domain is not allowed for this tenant");
        }

        const existingUser = await getPrisma().user.findUnique({ where: { email } });

        if (existingUser) {
            throw new ApiError(409, "User already exists");
        }

        const seatSummary = await getTenantSubscriptionSummary(tenantId);

        if (seatSummary.availableSeats < 1) {
            throw new ApiError(403, "No available licenses");
        }

        const tenant = await getPrisma().tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, code: true },
        });

        if (!tenant) {
            throw new ApiError(404, "Tenant not found");
        }

        const invitationToken =
            randomUUID().replace(/-/g, "") +
            randomUUID().replace(/-/g, "");

        const invitationExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
        );

        const created = await getPrisma().$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    tenantId,
                    email,
                    fullName,
                    role: roleMapping.userRole,
                    userType: userTypeForUserRole(roleMapping.userRole, email),
                    status: "active",
                    isActive: true,
                    hashedPassword: null,
                    emailVerified: false,
                    authProvider: "local_magic",
                },
            });

            const membership = await tx.tenantMembership.create({
                data: {
                    tenantId,
                    userId: user.id,
                    role: roleMapping.membershipRole,
                    status: MembershipStatus.ACTIVE,
                    invitedAt: new Date(),
                    metadata: {
                        department,
                        invitedByUserId: auth.sub,
                        inviteFlow: "tenant_user_create",
                    },
                },
            });

            const invitation = await tx.invitation.create({
                data: {
                    tenantId,
                    email,
                    role: roleMapping.membershipRole,
                    status: InvitationStatus.PENDING,
                    token: invitationToken,
                    expiresAt: invitationExpiresAt,
                    invitedByUserId: auth.sub,
                },
            });

            return { user, membership, invitation };
        });

        await syncActiveUserUsage(tenantId);

        const magic = await issueMagicLinkForUser(created.user.id);

        const inviteHtml = buildWathiqCareEmailHtml({
            title: "You're invited to WathiqCare",
            preheader: `${fullName}, you have been invited to join ${tenant.name}.`,
            bodyHtml: `
                <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
                    Hello ${fullName},
                </p>
                <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
                    You have been invited to join <strong>${tenant.name}</strong> on WathiqCare.
                </p>
            `,
            ctaUrl: magic.magicUrl,
            ctaText: "Open WathiqCare Securely",
            expiresNote: `This secure login link expires in ${magic.expiresMinutes} minutes.`,
            securityNote: "You are receiving this invitation because a tenant admin created your account.",
        });

        const inviteText = buildWathiqCareEmailText({
            title: "You've been invited to WathiqCare",
            bodyLines: [
                `Hello ${fullName}`,
                `You have been invited to join ${tenant.name}`,
            ],
            ctaUrl: magic.magicUrl,
            ctaLabel: "Secure sign in",
            securityNote: "You are receiving this invitation because a tenant admin created your account.",
        });

        await sendEmailWithDiagnostics({
            to: email,
            subject: "You've been invited to WathiqCare",
            html: inviteHtml,
            text: inviteText,
        });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "user",
            entityId: created.user.id,
            action: "USER_CREATED",
            request,
        });

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
