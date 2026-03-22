import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth, requireTenantAccess, requireTenantPermission } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { bootstrapTenantAdminConfiguration } from "@/lib/server/tenant-admin";

function normalizeDepartmentCode(input: string): string {
    return input
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);
}

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
                isActive: payload?.isActive ?? true,
            },
            create: {
                tenantId,
                code,
                name,
                isActive: payload?.isActive ?? true,
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
}
