import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  const enabled = process.env.ENABLE_PUBLIC_PASSWORD_SIGNUP === "true";
  if (!enabled) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Public signup is disabled. Accounts must be provisioned by an authorized administrator.",
      },
      { status: 403 },
    );
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
