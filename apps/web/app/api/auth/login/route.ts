import { NextRequest } from "next/server";

// Compatibility route: preserve older clients that still call /api/auth/login.
export async function POST(request: NextRequest) {
    const target = new URL("/api/auth/password/login", request.url);
    return Response.redirect(target, 307);
}
