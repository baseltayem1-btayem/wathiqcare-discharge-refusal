"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { type AuthFailureMode, validateSessionForRoute } from "@/utils/api";

type AuthGuardProps = {
  children: ReactNode;
  authFailureMode?: AuthFailureMode;
  blocking?: boolean;
};

export default function AuthGuard({ children, authFailureMode = "redirect", blocking = true }: AuthGuardProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      setChecking(true);

      try {
        const session = await validateSessionForRoute(
          `AuthGuard route check (${pathname || "/modules"})`,
          {
            nextPath: pathname || "/modules",
            authFailureMode,
          },
        );

        if (cancelled) {
          return;
        }

        if (session.valid !== false || authFailureMode === "inline") {
          setAuthenticated(true);
          return;
        }

        setAuthenticated(false);
      } catch {
        if (!cancelled) {
          if (authFailureMode === "inline") {
            // Inline pages handle session failures in-page and should remain mounted.
            setAuthenticated(true);
          } else {
            // Fail closed for protected routes so unauthenticated users don't render guarded content.
            setAuthenticated(false);
          }
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, [authFailureMode, pathname]);

  if (checking && blocking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{t("auth.sessionRequired")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("dashboard.health.loading")}</p>
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
