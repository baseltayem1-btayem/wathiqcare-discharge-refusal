import type { Metadata } from "next";
import { cookies } from "next/headers";
import WathiqcareWhiteLanding from "@/components/landing/WathiqcareWhiteLanding";
import { isSupportedLanguage } from "@/lib/i18n";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";
import { getSessionCookieName } from "@/lib/server/sessionCookie";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WathiqCare | Enterprise Platform Entry",
  description:
    "Operational entry point for WathiqCare electronic informed consents and healthcare-linked electronic promissory notes.",
};

const FALLBACK_COOKIE_NAMES = ["wathiqcare_access_token", "token"] as const;

function resolveModuleHref(isAuthenticated: boolean, modulePath: string): string {
  return isAuthenticated ? modulePath : `/login?next=${encodeURIComponent(modulePath)}`;
}

async function resolveHasValidSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get(getSessionCookieName())?.value?.trim() ||
      FALLBACK_COOKIE_NAMES.map((name) => cookieStore.get(name)?.value?.trim()).find(Boolean) ||
      null;

    if (!sessionToken) {
      return false;
    }

    const claims = verifyAndDecodeJwt(sessionToken);
    return Boolean(claims?.sub);
  } catch {
    return false;
  }
}

async function resolveInitialLang(): Promise<"ar" | "en"> {
  try {
    const cookieStore = await cookies();
    const cookieLang = cookieStore.get("wathiqcare_lang")?.value;
    if (cookieLang && isSupportedLanguage(cookieLang)) {
      return cookieLang;
    }
  } catch {
    // Fall back to English.
  }

  return "en";
}

export default async function HomePage() {
  const [isAuthenticated, initialLang] = await Promise.all([
    resolveHasValidSession(),
    resolveInitialLang(),
  ]);

  return (
    <WathiqcareWhiteLanding
      key={initialLang}
      informedConsentsHref={resolveModuleHref(isAuthenticated, "/modules/informed-consents")}
      promissoryNotesHref={resolveModuleHref(isAuthenticated, "/modules/promissory-notes")}
    />
  );
}
