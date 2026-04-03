import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
import { forwardToBackend } from "@/lib/server/backendProxy";

type RouteContext = {
    params: Promise<{ documentId: string }>;
};

=======
import { prisma } from "@/lib/server/prisma";
import { getPrisma } from "@/lib/server/prisma";
import { forwardToBackend } from "@/lib/server/backendProxy";

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
    <p style="line-height: 1.6;">
      The document is linked to this case, but preview rendering is temporarily unavailable.
      Please use the download action or retry shortly.
    </p>
=======
    <p style="line-height: 1.6;">The document is linked to this case, but preview rendering is temporarily unavailable. Please use the download action or retry shortly.</p>
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    <p style="font-size: 12px; color: #475569;">Document ID: ${documentId}</p>
  </body>
</html>`;
}

<<<<<<< HEAD
function htmlResponse(content: string): NextResponse {
    return new NextResponse(content, {
        status: 200,
        headers: {
            "content-type": "text/html; charset=utf-8",
        },
    });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
    const auth = await requireAuth(request);
    const { documentId } = await params;

    const backendResponse = await forwardToBackend(
        request,
        `/api/documents/${encodeURIComponent(documentId)}/preview`,
    );

=======
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> },
) {
    const auth = requireAuth(request);
    const { documentId } = await params;

    const backendResponse = await forwardToBackend(request, `/api/documents/${encodeURIComponent(documentId)}/preview`);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (backendResponse.ok) {
        return backendResponse;
    }

    const prisma = getPrisma();
<<<<<<< HEAD

    const document = await prisma.document.findUnique({
        where: { id: documentId },
    });

    if (!document || document.tenantId !== auth.tenant_id) {
        return NextResponse.json(
            { detail: "Document not found" },
            { status: 404 },
        );
    }

    if (document.previewHtml && document.previewHtml.trim()) {
        return htmlResponse(document.previewHtml);
    }

    return htmlResponse(fallbackPreviewHtml(documentId));
}
=======
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
