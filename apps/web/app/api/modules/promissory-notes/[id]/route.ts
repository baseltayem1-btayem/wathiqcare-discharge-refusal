import { type NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";

const prisma = getPrisma();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "promissory-notes");
    const { id } = await params;

    if (!auth.tenant_id) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
    }

    const note = await prisma.promissoryNote.findFirst({
      where: { id, tenantId: auth.tenant_id },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            patientName: true,
            patientIdNumber: true,
            medicalRecordNo: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Promissory note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/modules/promissory-notes/[id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
