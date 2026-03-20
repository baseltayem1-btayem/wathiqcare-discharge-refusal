import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

function toBackendPath(pathParts: string[]): string {
    return `/api/emails/${pathParts.map(encodeURIComponent).join("/")}`;
}

type RouteContext = {
    params: Promise<{ path: string[] }>;
};

async function handle(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    const backendPath = `${toBackendPath(path ?? [])}${request.nextUrl.search}`;
    return forwardToBackend(request, backendPath);
}

export async function GET(request: NextRequest, context: RouteContext) {
    return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
    return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
    return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    return handle(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
    return handle(request, context);
}
