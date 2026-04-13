"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import AccessDenied from "@/components/AccessDenied";
import PlatformAdminShell from "@/components/PlatformAdminShell";
import { apiFetchJson } from "@/utils/api";

type AuthMeResponse = {
  userType?: "platform_admin" | "tenant_admin" | "tenant_user";
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
  const [state, setState] = useState<GateState>("checking");

  const resolveAccess = useCallback(async () => {
    try {
      const me = await apiFetchJson<AuthMeResponse>("/api/auth/me", {
        cache: "no-store",
      });
      setState(me?.userType === "platform_admin" ? "allowed" : "forbidden");
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
      <PlatformAdminShell title="Loading..." subtitle="">
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            <span className="text-sm">Verifying access...</span>
          </div>
        </div>
      </PlatformAdminShell>
    );
  }

  if (state === "forbidden") {
    return (
      <PlatformAdminShell title="Access Denied" subtitle="">
        <AccessDenied resource="Platform Admin Portal" />
      </PlatformAdminShell>
    );
  }

  // state === "allowed": session confirmed, platform_admin role confirmed.
  return (
    <PlatformAdminShell title="Platform Admin" subtitle="">
      {children}
    </PlatformAdminShell>
  );
}
