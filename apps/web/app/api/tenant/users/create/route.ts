import { randomUUID } from "node:crypto";
import { InvitationStatus, MembershipRole, MembershipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantPermissionForAuth } from "@/lib/server/auth";
import { extractDomain, isTenantDomainAllowed, normalizeEmail } from "@/lib/server/auth-domain-policy";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { issueMagicLinkForUser } from "@/lib/server/magic-link-auth";
import { getPrisma } from "@/lib/server/prisma";
import { getTenantSubscriptionSummary, syncActiveUserUsage, writeAuditLog } from "@/lib/server/saas-services";
import { buildWathiqCareEmailHtml, buildWathiqCareEmailText, sendEmailWithDiagnostics } from "@/lib/server/email-provider";
import { userTypeForUserRole } from "@/lib/server/roles";

type CreateTenantUserPayload = {
    email?: string;
    fullName?: string;
    role?: "user" | "manager" | "admin" | string;
    department?: string;
};

const ALLOWED_CREATOR_ROLES = new Set(["tenant_admin", "tenant_owner"]);

function ensureCreatorRole(role: string | undefined): void {
    const normalized = (role || "").trim().toLowerCase();
    if (!ALLOWED_CREATOR_ROLES.has(normalized)) {
        throw new ApiError(403, "Only tenant admins can create users");
    }
}

function mapRequestedRole(input: string | undefined): {
    inputRole: "user" | "manager" | "admin";
    userRole: string;
    membershipRole: MembershipRole;
} {
    const normalized = (input || "user").trim().toLowerCase();
    if (normalized === "admin") {
        return { inputRole: "admin", userRole: "tenant_admin", membershipRole: MembershipRole.ADMIN };
    }
    if (normalized === "manager") {
        return { inputRole: "manager", userRole: "doctor", membershipRole: MembershipRole.MANAGER };
    }
    if (normalized === "user") {
        return { inputRole: "user", userRole: "viewer", membershipRole: MembershipRole.MEMBER };
    }
    throw new ApiError(400, "role must be one of: user, manager, admin");
}

async function ensureCreatorMembershipActive(tenantId: string, userId: string): Promise<void> {
    const prisma = getPrisma();
    const membership = await prisma.tenantMembership.findUnique({
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

export const runtime = "nodejs";

/**
 * POST /api/tenant/users/create
 * Create a new tenant-scoped user and send a magic-link invitation.
 * Allowed creators: tenant_admin, tenant_owner.
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request);
        const tenantId = auth.tenant_id;

        if (!tenantId) {
            throw new ApiError(403, "Tenant context is required");
        }

        ensureCreatorRole(auth.role);
        await ensureCreatorMembershipActive(tenantId, auth.sub);

        await requireTenantPermissionForAuth(auth, tenantId, "users.create", {
            allowPlatform: false,
        });

        const body = (await request.json().catch(() => null)) as CreateTenantUserPayload | null;
        if (!body) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const email = normalizeEmail((body.email || "").trim());
        const fullName = (body.fullName || "").trim();
        const department = (body.department || "").trim() || null;
        const { userRole, membershipRole } = mapRequestedRole(body.role);

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "Valid email is required");
        }
        if (!fullName) {
            throw new ApiError(400, "fullName is required");
        }

        const prisma = getPrisma();

        const domain = extractDomain(email);
        if (!domain || !(await isTenantDomainAllowed(tenantId, domain))) {
            throw new ApiError(403, `Email domain @${domain} is not allowed for this organisation`);
        }

        const subscription = await getTenantSubscriptionSummary(tenantId);
        if (subscription.availableSeats !== null && subscription.availableSeats <= 0) {
            throw new ApiError(402, "No available seats. Please upgrade your subscription.");
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ApiError(409, "A user with this email already exists");
        }

        const invitationToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const { user, invitation } = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    tenantId,
                    email,
                    fullName,
                    role: userRole,
                    userType: userTypeForUserRole(userRole),
                    status: "invited",
                    isActive: false,
                    hashedPassword: null,
                    emailVerified: false,
                    authProvider: "local_magic",
                },
            });

            await tx.tenantMembership.create({
                data: {
                    tenantId,
                    userId: newUser.id,
                    role: membershipRole,
                    status: MembershipStatus.INVITED,
                    invitedAt: new Date(),
                    metadata: department
                        ? { invitedByUserId: auth.sub, department }
                        : { invitedByUserId: auth.sub },
                },
            });

            const inv = await tx.invitation.create({
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

            return { user: newUser, invitation: inv };
        });

        const magic = await issueMagicLinkForUser(user.id);

        const html = buildWathiqCareEmailHtml({
            title: "You've been invited to WathiqCare",
            preheader: `${fullName}, you've been added to your organisation on WathiqCare.`,
            bodyHtml: `
      <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">Hello ${fullName},</p>
      <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
        You have been added to your organisation on <strong>WathiqCare</strong>.
        Use the secure link below to set up your account and get started.
      </p>
    `,
            ctaUrl: magic.magicUrl,
            ctaText: "Access WathiqCare →",
            expiresNote: `This link expires in ${magic.expiresMinutes} minutes and can only be used once.`,
            securityNote: "You received this because an administrator invited you to the platform. If you did not expect this, you may ignore this email.",
        });

        const text = buildWathiqCareEmailText({
            title: "You've been invited to WathiqCare",
            bodyLines: [
                `Hello ${fullName},`,
                "You have been added to your organisation on WathiqCare.",
                "Use the secure link below to access your account:",
            ],
            ctaUrl: magic.magicUrl,
            ctaLabel: "Access WathiqCare",
            expiresNote: `This link expires in ${magic.expiresMinutes} minutes.`,
            securityNote: "You received this because an administrator invited you to the platform.",
        });

        await sendEmailWithDiagnostics({ to: email, subject: "You've been invited to WathiqCare", html, text });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "USER",
            entityId: user.id,
            action: "TENANT_USER_INVITED",
            details: `Tenant user invited: ${email}`,
            metadataJson: { email, fullName, role: userRole, department },
            request,
        });

        await syncActiveUserUsage(tenantId);

        return NextResponse.json(
            toJsonSafe({ success: true, user_id: user.id, invitation_id: invitation.id }),
            { status: 201 },
        );
    } catch (error) {
        return handleApiError(error);
    }
}
