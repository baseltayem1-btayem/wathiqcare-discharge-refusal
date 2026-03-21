import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set("wathiqcare_access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    domain: isProd ? ".wathiqcare.online" : undefined,
    path: "/",
    maxAge: 0,
  });

  return response;
}
