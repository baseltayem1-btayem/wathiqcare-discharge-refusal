import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantPermissionForAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
import { resolveTenantBrandingWithProfile } from "@/lib/server/tenantBranding";
import {
    getTenantBrandingProfile,
    upsertTenantBrandingProfile,
} from "@/lib/server/tenantBrandingStore";

const ALLOWED_ADMIN_ROLES = new Set(["tenant_admin", "tenant_owner"]);

type AuthorizedTenantContext = {
    auth: Awaited<ReturnType<typeof requireAuth>>;
    tenantId: string;
    tenant: {
        id: string;
        name: string;
        code: string;
        metadata: unknown;
    };
};

function ensureTenantAdminRole(role: string | undefined): void {
    const normalized = (role ?? "").trim().toLowerCase();

=======
import { prisma } from "@/lib/server/prisma";
import { resolveTenantBrandingWithProfile } from "@/lib/server/tenantBranding";
import { getTenantBrandingProfile, upsertTenantBrandingProfile } from "@/lib/server/tenantBrandingStore";

const ALLOWED_ADMIN_ROLES = new Set(["tenant_admin", "tenant_owner"]);

function ensureTenantAdminRole(role: string | undefined): void {
    const normalized = (role || "").trim().toLowerCase();
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (!ALLOWED_ADMIN_ROLES.has(normalized)) {
        throw new ApiError(403, "Only tenant admins can manage branding");
    }
}

<<<<<<< HEAD
function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new ApiError(400, "Request body must be a JSON object");
    }

    return value as Record<string, unknown>;
}

function readOptionalString(value: unknown): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    if (typeof value !== "string") {
        throw new ApiError(400, "Invalid branding field type");
    }

    return value;
}

async function getAuthorizedTenant(
    request: NextRequest,
    permission: string,
): Promise<AuthorizedTenantContext> {
    const prisma = getPrisma();

    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;

=======
async function getAuthorizedTenant(request: NextRequest, permission: string) {
    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (!tenantId) {
        throw new ApiError(403, "Tenant context is required");
    }

    ensureTenantAdminRole(auth.role);
<<<<<<< HEAD

    await requireTenantPermissionForAuth(auth, tenantId, permission, {
        allowPlatform: false,
    });

    const tenant = await getPrisma().tenant.findUnique({
=======
    await requireTenantPermissionForAuth(auth, tenantId, permission, { allowPlatform: false });

    const tenant = await prisma.tenant.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: { id: tenantId },
        select: {
            id: true,
            name: true,
            code: true,
            metadata: true,
        },
    });

    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    return { auth, tenantId, tenant };
}

export async function GET(request: NextRequest) {
    try {
        const { tenantId, tenant } = await getAuthorizedTenant(request, "users.read");
        const profile = await getTenantBrandingProfile(tenantId);

        return NextResponse.json(
            toJsonSafe({
                success: true,
                branding: resolveTenantBrandingWithProfile(tenant, profile),
            }),
        );
    } catch (error) {
        return handleApiError(error);
    }
}

<<<<<<< HEAD
=======
function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new ApiError(400, "Request body must be a JSON object");
    }
    return value as Record<string, unknown>;
}

function readOptionalString(value: unknown): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (typeof value !== "string") {
        throw new ApiError(400, "Invalid branding field type");
    }
    return value;
}

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
export async function PUT(request: NextRequest) {
    try {
        const { tenantId, tenant } = await getAuthorizedTenant(request, "roles.assign");
        const payload = asRecord(await request.json());

        const profile = await upsertTenantBrandingProfile(tenantId, {
            displayName: readOptionalString(payload.displayName),
            legalName: readOptionalString(payload.legalName),
            licenseNumber: readOptionalString(payload.licenseNumber),
<<<<<<< HEAD
            commercialRegistrationNumber: readOptionalString(
                payload.commercialRegistrationNumber,
            ),
=======
            commercialRegistrationNumber: readOptionalString(payload.commercialRegistrationNumber),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            taxNumber: readOptionalString(payload.taxNumber),
            contactEmail: readOptionalString(payload.contactEmail),
            contactPhone: readOptionalString(payload.contactPhone),
            addressLine1: readOptionalString(payload.addressLine1),
            addressLine2: readOptionalString(payload.addressLine2),
            city: readOptionalString(payload.city),
            country: readOptionalString(payload.country),
            postalCode: readOptionalString(payload.postalCode),
            websiteUrl: readOptionalString(payload.websiteUrl),
            logoUrl: readOptionalString(payload.logoUrl),
            documentHeaderText: readOptionalString(payload.documentHeaderText),
            documentFooterText: readOptionalString(payload.documentFooterText),
            legalDisclaimer: readOptionalString(payload.legalDisclaimer),
        });

        return NextResponse.json(
            toJsonSafe({
                success: true,
                branding: resolveTenantBrandingWithProfile(tenant, profile),
            }),
        );
    } catch (error) {
        return handleApiError(error);
    }
}
