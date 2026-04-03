import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import {
    hasPlatformAccess,
    requireAuth,
    requireTenantAccess,
    requireTenantPermission,
} from "@/lib/server/auth";
import { normalizeDomain } from "@/lib/server/auth-domain-policy";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
=======
import { hasPlatformAccess, requireAuth, requireTenantAccess, requireTenantPermission } from "@/lib/server/auth";
import { normalizeDomain } from "@/lib/server/auth-domain-policy";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { writeAuditLog } from "@/lib/server/saas-services";

type DomainRow = {
    id: string;
    tenant_id: string;
    domain: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
};

<<<<<<< HEAD
type RouteContext = {
    params: Promise<{ tenantId: string }>;
};

async function authorize(request: NextRequest, tenantId: string) {
    const auth = await requireAuth(request);

=======
async function authorize(request: NextRequest, tenantId: string) {
    const auth = await requireAuth(request);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (hasPlatformAccess(auth)) {
        await requireTenantAccess(request, tenantId);
        return auth;
    }

    await requireTenantPermission(request, tenantId, "roles.manage");
    return auth;
}

<<<<<<< HEAD
async function listDomains(
    prisma: ReturnType<typeof getPrisma>,
    tenantId: string,
): Promise<DomainRow[]> {
    return prisma.$queryRaw<DomainRow[]>`
        SELECT id, tenant_id, domain, is_active, created_at, updated_at
        FROM tenant_allowed_domains
        WHERE tenant_id = ${tenantId}
        ORDER BY domain ASC
    `;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();
        const { tenantId } = await params;

        await authorize(request, tenantId);

        const domains = await listDomains(prisma, tenantId);

=======
async function listDomains(tenantId: string): Promise<DomainRow[]> {
    return prisma.$queryRaw<DomainRow[]>`
    SELECT id, tenant_id, domain, is_active, created_at, updated_at
    FROM tenant_allowed_domains
    WHERE tenant_id = ${tenantId}
    ORDER BY domain ASC
  `;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> },
) {
    try {
        const { tenantId } = await params;
        await authorize(request, tenantId);

        const domains = await listDomains(tenantId);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        return NextResponse.json({ domains });
    } catch (error) {
        return handleApiError(error);
    }
}

<<<<<<< HEAD
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();
        const { tenantId } = await params;

        const auth = await authorize(request, tenantId);

        const payload = (await request.json().catch(() => null)) as { domain?: string } | null;

        const domain = normalizeDomain(payload?.domain);

=======
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> },
) {
    try {
        const { tenantId } = await params;
        const auth = await authorize(request, tenantId);

        const payload = (await request.json().catch(() => null)) as { domain?: string } | null;
        const domain = normalizeDomain(payload?.domain);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!domain) {
            throw new ApiError(400, "Invalid domain");
        }

        const existing = await prisma.$queryRaw<DomainRow[]>`
<<<<<<< HEAD
            SELECT id
            FROM tenant_allowed_domains
            WHERE tenant_id = ${tenantId}
              AND domain = ${domain}
            LIMIT 1
        `;

        if (existing[0]) {
            await prisma.$executeRaw`
                UPDATE tenant_allowed_domains
                SET is_active = TRUE,
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
            `;
        } else {
            await prisma.$executeRaw`
                INSERT INTO tenant_allowed_domains (id, tenant_id, domain, is_active)
                VALUES (${randomUUID()}, ${tenantId}, ${domain}, TRUE)
            `;
=======
      SELECT id, tenant_id, domain, is_active, created_at, updated_at
      FROM tenant_allowed_domains
      WHERE tenant_id = ${tenantId}
        AND domain = ${domain}
      LIMIT 1
    `;

        if (existing[0]) {
            await prisma.$executeRaw`
        UPDATE tenant_allowed_domains
        SET is_active = TRUE,
            updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
        } else {
            await prisma.$executeRaw`
        INSERT INTO tenant_allowed_domains (id, tenant_id, domain, is_active)
        VALUES (${randomUUID()}, ${tenantId}, ${domain}, TRUE)
      `;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        }

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "tenant_domain",
            entityId: domain,
            action: "domain_added",
            details: `Allowed tenant domain added: ${domain}`,
            metadataJson: { domain },
            request,
        });

<<<<<<< HEAD
        return NextResponse.json(
            { domains: await listDomains(prisma, tenantId) },
            { status: 201 },
        );
=======
        return NextResponse.json({ domains: await listDomains(tenantId) }, { status: 201 });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    } catch (error) {
        return handleApiError(error);
    }
}

<<<<<<< HEAD
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();
        const { tenantId } = await params;

        const auth = await authorize(request, tenantId);

        const payload = (await request.json().catch(() => null)) as
            | { domain?: string; isActive?: boolean }
            | null;

        const domain = normalizeDomain(payload?.domain);

=======
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> },
) {
    try {
        const { tenantId } = await params;
        const auth = await authorize(request, tenantId);

        const payload = (await request.json().catch(() => null)) as { domain?: string; isActive?: boolean } | null;
        const domain = normalizeDomain(payload?.domain);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!domain || typeof payload?.isActive !== "boolean") {
            throw new ApiError(400, "domain and isActive are required");
        }

        const updated = await prisma.$executeRaw`
<<<<<<< HEAD
            UPDATE tenant_allowed_domains
            SET is_active = ${payload.isActive},
                updated_at = NOW()
            WHERE tenant_id = ${tenantId}
              AND domain = ${domain}
        `;
=======
      UPDATE tenant_allowed_domains
      SET is_active = ${payload.isActive},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND domain = ${domain}
    `;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        if (updated === 0) {
            throw new ApiError(404, "Domain not found");
        }

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "tenant_domain",
            entityId: domain,
            action: payload.isActive ? "domain_added" : "domain_disabled",
<<<<<<< HEAD
            details: payload.isActive
                ? `Allowed tenant domain re-enabled: ${domain}`
                : `Allowed tenant domain disabled: ${domain}`,
=======
            details: payload.isActive ? `Allowed tenant domain re-enabled: ${domain}` : `Allowed tenant domain disabled: ${domain}`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            metadataJson: { domain, isActive: payload.isActive },
            request,
        });

<<<<<<< HEAD
        return NextResponse.json({
            domains: await listDomains(prisma, tenantId),
        });
=======
        return NextResponse.json({ domains: await listDomains(tenantId) });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    } catch (error) {
        return handleApiError(error);
    }
}

<<<<<<< HEAD
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();
        const { tenantId } = await params;

=======
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> },
) {
    try {
        const { tenantId } = await params;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const auth = await authorize(request, tenantId);

        const payload = (await request.json().catch(() => null)) as { domain?: string } | null;
        const queryDomain = request.nextUrl.searchParams.get("domain") || "";
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const domain = normalizeDomain(payload?.domain || queryDomain);

        if (!domain) {
            throw new ApiError(400, "domain is required");
        }

        const usage = await prisma.$queryRaw<Array<{ count: bigint }>>`
<<<<<<< HEAD
            SELECT COUNT(*)::bigint AS count
            FROM users
            WHERE tenant_id = ${tenantId}
              AND lower(split_part(email, '@', 2)) = ${domain}
        `;

        const userCount = Number(usage[0]?.count ?? 0);

        if (userCount > 0) {
            throw new ApiError(
                409,
                "Domain is in use by tenant users and cannot be removed",
            );
        }

        await prisma.$executeRaw`
            DELETE FROM tenant_allowed_domains
            WHERE tenant_id = ${tenantId}
              AND domain = ${domain}
        `;
=======
      SELECT COUNT(*)::bigint AS count
      FROM users
      WHERE tenant_id = ${tenantId}
        AND lower(split_part(email, '@', 2)) = ${domain}
    `;

        const userCount = Number(usage[0]?.count ?? 0);
        if (userCount > 0) {
            throw new ApiError(409, "Domain is in use by tenant users and cannot be removed");
        }

        await prisma.$executeRaw`
      DELETE FROM tenant_allowed_domains
      WHERE tenant_id = ${tenantId}
        AND domain = ${domain}
    `;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "tenant_domain",
            entityId: domain,
            action: "domain_removed",
            details: `Allowed tenant domain removed: ${domain}`,
            metadataJson: { domain },
            request,
        });

<<<<<<< HEAD
        return NextResponse.json({
            domains: await listDomains(prisma, tenantId),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
=======
        return NextResponse.json({ domains: await listDomains(tenantId) });
    } catch (error) {
        return handleApiError(error);
    }
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
