"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import AccessDenied from "@/components/AccessDenied";
import PlatformAdminShell from "@/components/PlatformAdminShell";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetchJson } from "@/utils/api";

type AuthMeResponse = {
  userType?: "platform_admin" | "tenant_admin" | "tenant_user";
  platformRole?: string | null;
  claims?: {
    platform_role?: string | null;
  };
};

/**
 * Three-state auth gate for all /platform/* routes.
 *
 * checking  -> renders an opaque loading shell (no content flash).
 * forbidden -> renders AccessDenied inline; no redirect loop possible.
 * allowed   -> renders children directly; no secondary AuthGuard needed
 *              because session and role are already confirmed here.
 *
 * The previous implementation wrapped children in <AuthGuard blocking={false}>
 * which caused a race condition: AuthGuard initialises as unauthenticated=true
 * and renders a "Go to Login" screen for one render cycle before its own
 * /api/auth/me resolves. Removing that duplicate check eliminates the flash.
 */
type GateState = "checking" | "allowed" | "forbidden";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [state, setState] = useState<GateState>("checking");

  const resolveAccess = useCallback(async () => {
    try {
      const me = await apiFetchJson<AuthMeResponse>("/api/auth/me", {
        cache: "no-store",
      });
      const hasPlatformRole = Boolean(me?.platformRole ?? me?.claims?.platform_role);
      setState(me?.userType === "platform_admin" || hasPlatformRole ? "allowed" : "forbidden");
    } catch {
      setState("forbidden");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void resolveAccess();
    }, 0);

    return () => clearTimeout(timer);
  }, [resolveAccess]);

  if (state === "checking") {
    return (
      <PlatformAdminShell title={txt("Loading...", "جاري التحميل...")} subtitle="">
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            <span className="text-sm">{txt("Verifying access...", "جاري التحقق من صلاحية الوصول...")}</span>
          </div>
        </div>
      </PlatformAdminShell>
    );
  }

  if (state === "forbidden") {
    return (
      <PlatformAdminShell title={txt("Access Denied", "تم رفض الوصول")} subtitle="">
        <AccessDenied resource={txt("Platform Admin Portal", "بوابة إدارة المنصة")} />
      </PlatformAdminShell>
    );
  }

  // state === "allowed": session confirmed, platform_admin role confirmed.
  return (
    <PlatformAdminShell title={txt("Platform Admin", "إدارة المنصة")} subtitle="">
      {children}
    </PlatformAdminShell>
  );
}
