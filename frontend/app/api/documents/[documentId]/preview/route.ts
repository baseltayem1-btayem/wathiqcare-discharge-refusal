import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
// prisma import removed: use getPrisma()
import { getPrisma } from "@/lib/server/prisma";
import { forwardToBackend } from "@/lib/server/backendProxy";

function fallbackPreviewHtml(documentId: string): string {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Document Preview</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 24px; color: #0f172a;">
    <h2 style="margin-bottom: 8px;">Document Preview Unavailable</h2>
    <p style="margin-top: 0;">عرض المستند غير متاح مؤقتا.</p>
    <p style="line-height: 1.6;">The document is linked to this case, but preview rendering is temporarily unavailable. Please use the download action or retry shortly.</p>
    <p style="font-size: 12px; color: #475569;">Document ID: ${documentId}</p>
  </body>
</html>`;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> },
) {
    const auth = requireAuth(request);
    const { documentId } = await params;

    const backendResponse = await forwardToBackend(request, `/api/documents/${encodeURIComponent(documentId)}/preview`);
    if (backendResponse.ok) {
        return backendResponse;
    }

    const prisma = getPrisma();
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.tenantId !== auth.tenant_id) {
        return NextResponse.json({ detail: "Document not found" }, { status: 404 });
    }

    if (document.previewHtml && document.previewHtml.trim()) {
        return new NextResponse(document.previewHtml, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
        });
    }

    return new NextResponse(fallbackPreviewHtml(documentId), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
    });
}
