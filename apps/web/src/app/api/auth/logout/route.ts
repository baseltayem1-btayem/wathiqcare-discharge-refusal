import { NextResponse } from "next/server";
import { buildSessionCookieClearOptions, getSessionCookieName } from "@/lib/server/sessionCookie";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(getSessionCookieName(), "", buildSessionCookieClearOptions(request));

  return response;
}
