import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { forwardToBackend } from "@/lib/server/backendProxy";
function htmlDownloadResponse(content: string, fileName: string): NextResponse {
    return new NextResponse(content, {
        status: 200,
        headers: {
            "content-type": "text/html; charset=utf-8",
            "content-disposition": `attachment; filename="${fileName}"`,
        },
    });
}

<<<<<<< HEAD
export async function GET(request: NextRequest, { params }: RouteContext) {
    const auth = await requireAuth(request);
    const { documentId } = await params;

    const backendResponse = await forwardToBackend(
        request,
        `/api/documents/${encodeURIComponent(documentId)}/download`,
    );

=======
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> },
) {
    const auth = requireAuth(request);
    const { documentId } = await params;

    const backendResponse = await forwardToBackend(request, `/api/documents/${encodeURIComponent(documentId)}/download`);
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
        return htmlDownloadResponse(
            document.previewHtml,
            document.fileName || `${document.templateKey}.html`,
        );
=======
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.tenantId !== auth.tenant_id) {
        return NextResponse.json({ detail: "Document not found" }, { status: 404 });
    }

    if (document.previewHtml && document.previewHtml.trim()) {
        return htmlDownloadResponse(document.previewHtml, document.fileName || `${document.templateKey}.html`);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    }

    return NextResponse.json(
        {
            detail:
                "Document download is temporarily unavailable. Please retry shortly while storage sync completes.",
        },
        { status: 503 },
    );
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
