import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { forwardToBackend } from "@/lib/server/backendProxy";

type RouteContext = {
    params: Promise<{ documentId: string }>;
};

function fallbackViewHtml(documentId: string): string {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Document View</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 24px; color: #0f172a;">
    <h2 style="margin-bottom: 8px;">Document View Unavailable</h2>
    <p style="margin-top: 0;">عرض المستند غير متاح مؤقتا.</p>
    <p style="line-height: 1.6;">The document is linked to this case, but rendering is temporarily unavailable. Please use download or retry shortly.</p>
    <p style="font-size: 12px; color: #475569;">Document ID: ${documentId}</p>
  </body>
</html>`;
}

export async function GET(request: NextRequest, context: RouteContext) {
    const auth = await requireAuth(request);
    const { documentId } = await context.params;

    const backendResponse = await forwardToBackend(request, `/api/documents/${encodeURIComponent(documentId)}/view`);
    if (backendResponse.ok) {
        return backendResponse;
    }

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

    return new NextResponse(fallbackViewHtml(documentId), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
    });
}
