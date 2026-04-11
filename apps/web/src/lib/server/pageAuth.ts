import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";
import { getSessionCookieName } from "@/lib/server/sessionCookie";

const FALLBACK_COOKIE_NAMES = ["wathiqcare_access_token", "token"] as const;

function readSessionTokenFromCookies(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const primary = cookieStore.get(getSessionCookieName())?.value?.trim();
  if (primary) {
    return primary;
  }

  for (const cookieName of FALLBACK_COOKIE_NAMES) {
    const token = cookieStore.get(cookieName)?.value?.trim();
    if (token) {
      return token;
    }
  }

  return null;
}

export async function requirePageSessionOrRedirect(nextPath?: string): Promise<void> {
  const cookieStore = await cookies();
  const token = readSessionTokenFromCookies(cookieStore);

  if (!token) {
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${nextQuery}`);
  }

  try {
    verifyAndDecodeJwt(token);
  } catch {
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${nextQuery}`);
  }
}