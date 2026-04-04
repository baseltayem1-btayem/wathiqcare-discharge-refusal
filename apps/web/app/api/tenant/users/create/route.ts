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
