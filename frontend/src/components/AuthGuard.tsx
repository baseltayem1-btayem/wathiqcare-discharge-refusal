"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { getToken } from "@/utils/api";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const authDebug = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const token = getToken();
  const authenticated = typeof token === "string" && token.length > 0;

  useEffect(() => {
    if (authDebug) {
      console.info("[auth-debug] route_guard_evaluation", {
        pathname,
        authenticated,
        hasToken: Boolean(token),
      });
    }

    if (!authenticated) {
      const nextPath = pathname || "/cases";
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [authDebug, authenticated, pathname, router, token]);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{t("auth.sessionRequired")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("auth.sessionMissing")}</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {t("auth.goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
