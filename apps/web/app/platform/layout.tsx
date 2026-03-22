"use client";

import { ReactNode } from "react";
import AuthGuard from "@/components/AuthGuard";
import AccessDenied from "@/components/AccessDenied";
import PlatformAdminShell from "@/components/PlatformAdminShell";
import { useCallback, useEffect, useState } from "react";
import { apiFetchJson } from "@/utils/api";

type AuthMeResponse = {
    userType?: "platform_admin" | "tenant_admin" | "tenant_user";
};

export default function PlatformLayout({ children }: { children: ReactNode }) {
    const [forbidden, setForbidden] = useState(false);
    const [checking, setChecking] = useState(true);

    const validatePlatformAccess = useCallback(async () => {
        try {
            const me = await apiFetchJson<AuthMeResponse>("/api/auth/me", { cache: "no-store" });
            const isPlatformAdmin = me?.userType === "platform_admin";
            if (!isPlatformAdmin) {
                setForbidden(true);
            }
        } catch {
            setForbidden(true);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        void validatePlatformAccess();
    }, [validatePlatformAccess]);

    if (checking) {
        return (
            <AuthGuard blocking={false}>
                <PlatformAdminShell title="Loading..." subtitle="">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center text-gray-500">Loading platform...</div>
                    </div>
                </PlatformAdminShell>
            </AuthGuard>
        );
    }

    if (forbidden) {
        return (
            <AuthGuard authFailureMode="inline" blocking={false}>
                <PlatformAdminShell title="Access Denied" subtitle="">
                    <AccessDenied resource="Platform Admin Portal" />
                </PlatformAdminShell>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard blocking={false}>
            <PlatformAdminShell title="Platform Admin" subtitle="">
                {children}
            </PlatformAdminShell>
        </AuthGuard>
    );
}
