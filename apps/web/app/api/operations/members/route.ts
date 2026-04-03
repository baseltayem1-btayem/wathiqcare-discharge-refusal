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
<<<<<<< HEAD
export async function GET(request: NextRequest) {
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);

    const deptParam = request.nextUrl.searchParams.get("department");
    const targetDept = parseOperationDepartment(deptParam);

<<<<<<< HEAD
    const users = await getPrisma().user.findMany({
=======
    const users = await prisma.user.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
