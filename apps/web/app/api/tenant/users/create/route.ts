import { randomUUID } from "node:crypto";
<<<<<<< HEAD
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
=======
import { InvitationStatus, MembershipRole, MembershipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantPermissionForAuth } from "@/lib/server/auth";
import { extractDomain, isTenantDomainAllowed, normalizeEmail } from "@/lib/server/auth-domain-policy";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { issueMagicLinkForUser } from "@/lib/server/magic-link-auth";
import { prisma } from "@/lib/server/prisma";
import { getTenantSubscriptionSummary, syncActiveUserUsage, writeAuditLog } from "@/lib/server/saas-services";
import { buildWathiqCareEmailHtml, buildWathiqCareEmailText, sendEmailWithDiagnostics } from "@/lib/server/email-provider";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
    const normalized = (role ?? "").trim().toLowerCase();

=======
    const normalized = (role || "").trim().toLowerCase();
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (!ALLOWED_CREATOR_ROLES.has(normalized)) {
        throw new ApiError(403, "Only tenant admins can create users");
    }
}

function mapRequestedRole(input: string | undefined): {
    inputRole: "user" | "manager" | "admin";
    userRole: string;
    membershipRole: MembershipRole;
} {
<<<<<<< HEAD
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
=======
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
    const membership = await prisma.tenantMembership.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: {
            tenantId_userId: {
                tenantId,
                userId,
            },
        },
<<<<<<< HEAD
        select: { status: true },
=======
        select: {
            status: true,
        },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
        throw new ApiError(403, "Creator must have an active tenant membership");
    }
}

export async function POST(request: NextRequest) {
    try {
<<<<<<< HEAD
        const prisma = getPrisma(); // ✅ FIX

        const auth = await requireAuth(request);
        const tenantId = auth.tenant_id;

=======
        const auth = await requireAuth(request);
        const tenantId = auth.tenant_id;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!tenantId) {
            throw new ApiError(403, "Tenant context is required");
        }

        ensureCreatorRole(auth.role);
<<<<<<< HEAD

        await ensureCreatorMembershipActive(prisma, tenantId, auth.sub);

        await requireTenantPermissionForAuth(auth, tenantId, "users.create", {
            allowPlatform: false,
        });

        const payload = (await request.json().catch(() => null)) as CreateTenantUserPayload | null;

        const email = normalizeEmail(payload?.email);
        const fullName = (payload?.fullName ?? "").trim();
        const department = (payload?.department ?? "").trim().toUpperCase() || null;
=======
        await ensureCreatorMembershipActive(tenantId, auth.sub);
        await requireTenantPermissionForAuth(auth, tenantId, "users.create", { allowPlatform: false });

        const payload = (await request.json().catch(() => null)) as CreateTenantUserPayload | null;
        const email = normalizeEmail(payload?.email);
        const fullName = (payload?.fullName || "").trim();
        const department = (payload?.department || "").trim().toUpperCase() || null;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        if (!email || !fullName) {
            throw new ApiError(400, "email and fullName are required");
        }

        const roleMapping = mapRequestedRole(payload?.role);
<<<<<<< HEAD

        if (roleMapping.inputRole === "admin") {
            await requireTenantPermissionForAuth(auth, tenantId, "roles.assign", {
                allowPlatform: false,
            });
        }

        const emailDomain = extractDomain(email);

=======
        if (roleMapping.inputRole === "admin") {
            await requireTenantPermissionForAuth(auth, tenantId, "roles.assign", { allowPlatform: false });
        }

        const emailDomain = extractDomain(email);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!emailDomain || !(await isTenantDomainAllowed(tenantId, emailDomain))) {
            throw new ApiError(403, "Email domain is not allowed for this tenant");
        }

<<<<<<< HEAD
        const existingUser = await getPrisma().user.findUnique({ where: { email } });

=======
        const existingUser = await prisma.user.findUnique({ where: { email } });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (existingUser) {
            throw new ApiError(409, "User already exists");
        }

        const seatSummary = await getTenantSubscriptionSummary(tenantId);
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (seatSummary.availableSeats < 1) {
            throw new ApiError(403, "No available licenses");
        }

<<<<<<< HEAD
        const tenant = await getPrisma().tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, code: true },
        });

=======
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, code: true },
        });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!tenant) {
            throw new ApiError(404, "Tenant not found");
        }

<<<<<<< HEAD
        const invitationToken =
            randomUUID().replace(/-/g, "") +
            randomUUID().replace(/-/g, "");

        const invitationExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
        );

        const created = await getPrisma().$transaction(async (tx) => {
=======
        const invitationToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const created = await prisma.$transaction(async (tx) => {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
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
=======
        <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
          Hello ${fullName},
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
          You have been invited to join <strong>${tenant.name}</strong> on WathiqCare.
          Use your secure one-time sign-in link below to access your account.
        </p>
      `,
            ctaUrl: magic.magicUrl,
            ctaText: "Open WathiqCare Securely",
            expiresNote: `This secure login link expires in ${magic.expiresMinutes} minutes and can be used only once.`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            securityNote: "You are receiving this invitation because a tenant admin created your account.",
        });

        const inviteText = buildWathiqCareEmailText({
            title: "You've been invited to WathiqCare",
            bodyLines: [
<<<<<<< HEAD
                `Hello ${fullName}`,
                `You have been invited to join ${tenant.name}`,
            ],
            ctaUrl: magic.magicUrl,
            ctaLabel: "Secure sign in",
=======
                `Hello ${fullName},`,
                `You have been invited to join ${tenant.name} on WathiqCare.`,
                "Use the secure one-time link below to sign in.",
            ],
            ctaUrl: magic.magicUrl,
            ctaLabel: "Secure sign in",
            expiresNote: `This secure login link expires in ${magic.expiresMinutes} minutes and can be used only once.`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
=======
            details: "Tenant admin created a new tenant-scoped user",
            metadataJson: {
                email,
                fullName,
                role: roleMapping.inputRole,
                department,
            },
            request,
        });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "license",
            entityId: created.user.id,
            action: "LICENSE_ASSIGNED",
            details: "Seat/license allocated to newly created user",
            metadataJson: {
                availableSeatsBefore: seatSummary.availableSeats,
                seatLimit: seatSummary.seatLimit,
            },
            request,
        });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "invitation",
            entityId: created.invitation.id,
            action: "USER_INVITED",
            details: "Invitation email sent with secure login link",
            metadataJson: {
                email,
                invitationToken: created.invitation.token,
                invitationExpiresAt: invitationExpiresAt.toISOString(),
                magicTokenId: magic.tokenId,
            },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
