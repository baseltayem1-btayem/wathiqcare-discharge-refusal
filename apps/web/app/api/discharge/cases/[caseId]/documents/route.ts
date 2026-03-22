import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listWorkflowDocuments } from "@/lib/server/dischargeRefusalWorkflow";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const documents = await listWorkflowDocuments(auth, caseId);
    return NextResponse.json(
      documents.map((document) => ({
        id: document.id,
        case_id: caseId,
        template_key: document.template_key,
        document_code: document.document_code,
        title: document.title,
        titleEn: document.title,
        file_name: document.file_name,
        generated_at: document.generated_at,
        templateVersion: document.templateVersion,
        generationStatus: document.generationStatus,
        signedStatus: document.signedStatus,
        archivedStatus: document.archivedStatus,
        createdBy: document.createdBy,
        signedBy: document.signedBy,
        signedAt: document.signedAt,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}