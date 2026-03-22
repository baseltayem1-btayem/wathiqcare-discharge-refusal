import { SubscriptionStatus } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PUBLIC_EMAIL_DOMAINS = new Set([
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
]);

export type PostAuthDenialCode =
    | "DOMAIN_NOT_ALLOWED"
    | "PENDING_APPROVAL"
    | "NO_ROLE_ASSIGNED"
    | "NO_LICENSE_ASSIGNED"
    | "TENANT_INACTIVE";

export class PostAuthAccessError extends ApiError {
    code: PostAuthDenialCode;
    tenantId: string;
    userId: string;

    constructor(code: PostAuthDenialCode, message: string, args: { tenantId: string; userId: string }) {
        super(403, message);
        this.code = code;
        this.tenantId = args.tenantId;
        this.userId = args.userId;
    }
}

export function normalizeDomain(value: string | null | undefined): string | null {
    const domain = (value || "").trim().toLowerCase().replace(/^@+/, "");
    if (!domain || domain.includes("@") || domain.includes(" ") || !domain.includes(".")) {
        return null;
    }
    return domain;
}

export function normalizeEmail(value: string | null | undefined): string | null {
    const email = (value || "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
        return null;
    }
    return email;
}

export function extractDomain(email: string | null | undefined): string | null {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }

    const parts = normalizedEmail.split("@");
    if (parts.length !== 2) {
        return null;
    }

    return normalizeDomain(parts[1]);
}

export async function hasAnyActiveTenantForDomain(domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) {
        return false;
    }

    const rows = await prisma.$queryRaw<Array<{ tenant_id: string }>>`
    SELECT tad.tenant_id
    FROM tenant_allowed_domains tad
    INNER JOIN tenants t ON t.id = tad.tenant_id
    WHERE tad.domain = ${normalizedDomain}
      AND tad.is_active = TRUE
      AND t.is_active = TRUE
    LIMIT 1
  `;

    return rows.length > 0;
}

export async function isTenantDomainAllowed(tenantId: string, domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomain(domain);
    if (!tenantId || !normalizedDomain) {
        return false;
    }

    const rows = await prisma.$queryRaw<Array<{ tenant_id: string }>>`
    SELECT tenant_id
    FROM tenant_allowed_domains
    WHERE tenant_id = ${tenantId}
      AND domain = ${normalizedDomain}
      AND is_active = TRUE
    LIMIT 1
  `;

    return rows.length > 0;
}

export type AuthPolicyUser = {
    id: string;
    tenantId: string;
    email: string;
    role: string | null;
    isActive: boolean;
    status: string | null;
};

function statusIsPending(status: string | null): boolean {
    const normalizedStatus = (status || "").trim().toLowerCase();
    return ["pending", "pending_approval", "invited", "inactive", "suspended"].includes(normalizedStatus);
}

export type PostAuthSnapshot = {
    domainAllowed: boolean;
    tenantActive: boolean;
    userActive: boolean;
    status: string | null;
    hasRole: boolean;
    hasLicense: boolean;
};

export function evaluatePostAuthSnapshot(snapshot: PostAuthSnapshot): PostAuthDenialCode | null {
    if (!snapshot.domainAllowed) {
        return "DOMAIN_NOT_ALLOWED";
    }

    if (!snapshot.tenantActive) {
        return "TENANT_INACTIVE";
    }

    if (!snapshot.userActive || statusIsPending(snapshot.status)) {
        return "PENDING_APPROVAL";
    }

    if (!snapshot.hasRole) {
        return "NO_ROLE_ASSIGNED";
    }

    if (!snapshot.hasLicense) {
        return "NO_LICENSE_ASSIGNED";
    }

    return null;
}

export async function enforceSharedPostAuthAccess(user: AuthPolicyUser): Promise<void> {
    const domain = extractDomain(user.email);
    const domainAllowed = !!domain && (await isTenantDomainAllowed(user.tenantId, domain));

    const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { isActive: true },
    });

    const role = (user.role || "").trim();

    const [membership, subscription] = await Promise.all([
        prisma.tenantMembership.findUnique({
            where: {
                tenantId_userId: {
                    tenantId: user.tenantId,
                    userId: user.id,
                },
            },
            select: { status: true },
        }),
        prisma.subscription.findFirst({
            where: {
                tenantId: user.tenantId,
                status: {
                    in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
                },
            },
            select: { id: true },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const denial = evaluatePostAuthSnapshot({
        domainAllowed,
        tenantActive: tenant?.isActive === true,
        userActive: user.isActive,
        status: user.status,
        hasRole: role.length > 0,
        hasLicense: membership?.status === "ACTIVE" && !!subscription,
    });

    if (denial) {
        const messageByCode: Record<PostAuthDenialCode, string> = {
            DOMAIN_NOT_ALLOWED: "Domain not allowed",
            TENANT_INACTIVE: "Tenant inactive",
            PENDING_APPROVAL: "Pending approval",
            NO_ROLE_ASSIGNED: "No role assigned",
            NO_LICENSE_ASSIGNED: "No license assigned",
        };

        throw new PostAuthAccessError(denial, messageByCode[denial], {
            tenantId: user.tenantId,
            userId: user.id,
        });
    }
}
