import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId, requireTenantOperationalAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { resolveLegalWorkflow } from "@/lib/server/legal-workflow-engine";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);
    const { caseId: id } = await context.params;

    const caseItem = await prisma.case.findFirst({
      where: { id, tenantId },
      include: {
        documents: {
          select: {
            id: true,
            templateKey: true,
            status: true,
          },
        },
      },
    });

    if (!caseItem) {
      throw new ApiError(404, "Case not found");
    }

    const hasDocuments = caseItem.documents.length > 0;
    const hasLegalPackage = caseItem.documents.some(
      (doc) =>
        doc.templateKey === "legal_case_pdf" ||
        doc.templateKey === "legal_package_module" ||
        doc.templateKey === "court_bundle",
    );
    const isClosed = String(caseItem.status).toUpperCase() === "CLOSED";

    const workflow = resolveLegalWorkflow({
      caseId: caseItem.id,
      signals: {
        hasDocuments,
        hasLegalPackage,
        isClosed,
      },
    });

    return NextResponse.json({
      caseId: caseItem.id,
      caseLifecycleStatus: caseItem.status,
      workflow: {
        status: workflow.status,
        nextAction: workflow.nextAction,
        availableActions: workflow.availableActions,
      },
      signals: {
        hasDocuments,
        hasLegalPackage,
        isClosed,
      },
      source: "backend_legal_workflow_engine_v4",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
