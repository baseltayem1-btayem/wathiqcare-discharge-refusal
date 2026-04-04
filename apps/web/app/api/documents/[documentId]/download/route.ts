import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { forwardToBackend } from "@/lib/server/backendProxy";

type RouteContext = {
    params: Promise<{ documentId: string }>;
};

function htmlDownloadResponse(content: string, fileName: string): NextResponse {
    return new NextResponse(content, {
        status: 200,
        headers: {
            "content-type": "text/html; charset=utf-8",
            "content-disposition": `attachment; filename="${fileName}"`,
        },
    });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const prisma = getPrisma();
    const { documentId } = await params;

    const backendResponse = await forwardToBackend(
        request,
        `/api/documents/${encodeURIComponent(documentId)}/download`,
    );
    if (backendResponse.ok) {
        return backendResponse;
    }

    const document = await prisma.document.findFirst({
        where: { id: documentId, tenantId },
    });
    if (!document) {
        return NextResponse.json({ detail: "Document not found" }, { status: 404 });
    }

    if (document.previewHtml && document.previewHtml.trim()) {
        return htmlDownloadResponse(
            document.previewHtml,
            document.fileName || `${document.templateKey}.html`,
        );
    }

    return NextResponse.json(
        {
            detail:
                "Document download is temporarily unavailable. Please retry shortly while storage sync completes.",
        },
        { status: 503 },
    );
}
