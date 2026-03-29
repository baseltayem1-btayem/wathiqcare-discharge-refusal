import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { departmentForRole, parseOperationDepartment } from "@/lib/server/operations";

/**
 * GET /api/operations/members?department=NURSING
 * Returns active tenant users whose role maps to the requested department.
 * Used to populate the assignee picker in the department queue view.
 */
try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);

    const deptParam = request.nextUrl.searchParams.get("department");
    const targetDept = parseOperationDepartment(deptParam);

    const users = await prisma.user.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, fullName: true, role: true },
        orderBy: { fullName: "asc" },
    });

    const filtered = users.filter((u) => departmentForRole(u.role) === targetDept);

    return NextResponse.json(filtered);
} catch (error) {
    return handleApiError(error);
}
}
