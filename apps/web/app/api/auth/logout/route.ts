import { NextResponse } from "next/server";
import { buildSessionCookieClearOptions, getSessionCookieName } from "@/lib/server/sessionCookie";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(getSessionCookieName(), "", buildSessionCookieClearOptions());

  return response;
}
