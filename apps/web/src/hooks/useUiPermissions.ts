"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/api";
import {
  can,
  canAccessCase,
  getPermissionDeniedMessage,
  hasAnyPermission,
  type UiAuthContext,
  type UiCaseAccessContext,
  type UiPermissionKey,
} from "@/lib/permissions/ui-rbac";

type AuthMeResponse = {
  platformRole?: string | null;
  claims?: {
    role?: string | null;
    platform_role?: string | null;
    sub?: string | null;
  };
  user?: {
    id?: string | null;
    role?: string | null;
  } | null;
};

type UiPermissionState = {
  ready: boolean;
  auth: UiAuthContext;
  can: (permission: UiPermissionKey) => boolean;
  hasAnyPermission: (permissions: UiPermissionKey[]) => boolean;
  canAccessCase: (caseContext: UiCaseAccessContext | null | undefined, permission: UiPermissionKey) => boolean;
  deniedMessage: string;
};

const FALLBACK_AUTH: UiAuthContext = {
  role: null,
  platformRole: null,
  userId: null,
};

let cachedAuth: UiAuthContext | null = null;
let authPromise: Promise<UiAuthContext> | null = null;

async function fetchAuthContext(): Promise<UiAuthContext> {
  if (cachedAuth) {
    return cachedAuth;
  }

  if (!authPromise) {
    authPromise = apiFetch<AuthMeResponse>("/api/auth/me", {
      cache: "no-store",
      authFailureMode: "inline",
    })
      .then((me) => {
        const auth: UiAuthContext = {
          role: me?.user?.role ?? me?.claims?.role ?? null,
          platformRole: me?.platformRole ?? me?.claims?.platform_role ?? null,
          userId: me?.user?.id ?? me?.claims?.sub ?? null,
        };

        cachedAuth = auth;
        return auth;
      })
      .catch(() => FALLBACK_AUTH)
      .finally(() => {
        authPromise = null;
      });
  }

  return authPromise;
}

export function useUiPermissions(): UiPermissionState {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<UiAuthContext>(FALLBACK_AUTH);

  useEffect(() => {
    let cancelled = false;

    fetchAuthContext()
      .then((resolved) => {
        if (!cancelled) {
          setAuth(resolved);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuth(FALLBACK_AUTH);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      ready,
      auth,
      can: (permission: UiPermissionKey) => can(permission, auth),
      hasAnyPermission: (permissions: UiPermissionKey[]) => hasAnyPermission(permissions, auth),
      canAccessCase: (caseContext: UiCaseAccessContext | null | undefined, permission: UiPermissionKey) =>
        canAccessCase(caseContext, permission, auth),
      deniedMessage: getPermissionDeniedMessage(),
    }),
    [auth, ready],
  );
}
