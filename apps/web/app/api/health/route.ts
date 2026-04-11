import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "frontend",
        role: "api-proxy-host",
        backendHealth: "not_checked_here",
    });
}
