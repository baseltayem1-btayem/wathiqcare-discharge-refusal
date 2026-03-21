"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { getToken, logAuthRedirect } from "@/utils/api";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const authDebug = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function evaluateAuth() {
      setChecking(true);

      const token = getToken();
      const hasToken = typeof token === "string" && token.length > 0;

      if (hasToken) {
        if (authDebug) {
          console.info("[auth-debug] route_guard_evaluation", {
            pathname,
            authenticated: true,
            source: "localStorage",
          });
        }

        if (active) {
          setAuthenticated(true);
          setChecking(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const cookieAuthenticated = response.ok;
        if (authDebug) {
          console.info("[auth-debug] route_guard_evaluation", {
            pathname,
            authenticated: cookieAuthenticated,
            source: "cookie_session_check",
            status: response.status,
          });
        }

        if (active) {
          setAuthenticated(cookieAuthenticated);
        }
      } catch (error) {
        if (authDebug) {
          console.info("[auth-debug] route_guard_evaluation", {
            pathname,
            authenticated: false,
            source: "cookie_session_check_failed",
            error: error instanceof Error ? error.message : String(error),
          });
        }
        if (active) {
          setAuthenticated(false);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void evaluateAuth();

    return () => {
      active = false;
    };
  }, [authDebug, pathname]);

  useEffect(() => {
    if (checking || authenticated) {
      return;
    }
    const nextPath = pathname || "/cases";
    logAuthRedirect("auth_guard_no_valid_session", { pathname: nextPath });
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [authenticated, checking, pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{t("auth.sessionRequired")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

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
