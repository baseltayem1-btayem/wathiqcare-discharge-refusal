import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import {
    hasPlatformAccess,
    requireAuth,
    requireTenantAccess,
    requireTenantPermission,
} from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { bootstrapTenantAdminConfiguration } from "@/lib/server/tenant-admin";

type RouteContext = {
    params: Promise<{ tenantId: string }>;
};

type DepartmentPayload = {
    code?: string;
    name?: string;
    isActive?: boolean;
};

=======
import { hasPlatformAccess, requireAuth, requireTenantAccess, requireTenantPermission } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { bootstrapTenantAdminConfiguration } from "@/lib/server/tenant-admin";

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
function normalizeDepartmentCode(input: string): string {
    return input
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);
}

<<<<<<< HEAD
async function authorizeTenantDepartmentAccess(
    request: NextRequest,
    tenantId: string,
    permissions: string | string[],
) {
    const auth = await requireAuth(request);

    if (!hasPlatformAccess(auth)) {
        await requireTenantPermission(request, tenantId, permissions);
    } else {
        await requireTenantAccess(request, tenantId);
    }

    return auth;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();

        const { tenantId } = await params;
        await authorizeTenantDepartmentAccess(request, tenantId, [
            "departments.read",
            "departments.manage",
        ]);
=======
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> },
) {
    try {
        const { tenantId } = await params;
        const auth = await requireAuth(request);
        if (!hasPlatformAccess(auth)) {
            await requireTenantPermission(request, tenantId, ["departments.read", "departments.manage"]);
        } else {
            await requireTenantAccess(request, tenantId);
        }
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        await bootstrapTenantAdminConfiguration(tenantId);

        const departments = await prisma.department.findMany({
            where: { tenantId },
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
        });

        return NextResponse.json(toJsonSafe(departments));
    } catch (error) {
        return handleApiError(error);
    }
}

<<<<<<< HEAD
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();

        const { tenantId } = await params;
        const auth = await authorizeTenantDepartmentAccess(
            request,
            tenantId,
            "departments.manage",
        );

        const payload = (await request.json().catch(() => null)) as DepartmentPayload | null;

        const code = normalizeDepartmentCode(payload?.code ?? "");
        const name = (payload?.name ?? "").trim();
        const isActive = payload?.isActive ?? true;
=======
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> },
) {
    try {
        const { tenantId } = await params;
        const auth = await requireAuth(request);
        if (!hasPlatformAccess(auth)) {
            await requireTenantPermission(request, tenantId, "departments.manage");
        } else {
            await requireTenantAccess(request, tenantId);
        }

        const payload = (await request.json().catch(() => null)) as
            | {
                code?: string;
                name?: string;
                isActive?: boolean;
            }
            | null;

        const code = normalizeDepartmentCode(payload?.code ?? "");
        const name = payload?.name?.trim() ?? "";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        if (!code || !name) {
            throw new ApiError(400, "code and name are required");
        }

        const department = await prisma.department.upsert({
            where: {
                tenantId_code: {
                    tenantId,
                    code,
                },
            },
            update: {
                name,
<<<<<<< HEAD
                isActive,
=======
                isActive: payload?.isActive ?? true,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            },
            create: {
                tenantId,
                code,
                name,
<<<<<<< HEAD
                isActive,
=======
                isActive: payload?.isActive ?? true,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            },
        });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "department",
            entityId: department.id,
            action: "department_upserted",
            details: `Department ${code} updated`,
            metadataJson: {
                code,
                name,
                isActive: department.isActive,
            },
            request,
        });

        return NextResponse.json(toJsonSafe(department), { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
