"use client";

import {
    createContext,
    useEffect,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/api/http-client";
import { authApi } from "@/lib/api/modules/auth";
import { usersApi } from "@/lib/api/modules/users";
import {
    AUTH_SESSION_UPDATED_EVENT,
    clearStoredSessionTokens,
    getStoredSessionTokens,
    setStoredSessionTokens,
    type AuthSessionTokens,
} from "@/lib/api/token-store";
import type { AuthUserProfile, LoginPayload, LoginResult } from "@/lib/api/types";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type AuthSessionContextValue = {
    status: SessionStatus;
    user: AuthUserProfile | null;
    tokens: AuthSessionTokens | null;
    login: (payload: LoginPayload) => Promise<LoginResult>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<AuthUserProfile | null>;
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    hasRole: (role: string) => boolean;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [tokens, setTokens] = useState<AuthSessionTokens | null>(() => getStoredSessionTokens());

    useEffect(() => {
        function syncSessionState() {
            setTokens(getStoredSessionTokens());
        }

        window.addEventListener(AUTH_SESSION_UPDATED_EVENT, syncSessionState);
        return () => {
            window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, syncSessionState);
        };
    }, []);

    const profileQuery = useQuery({
        queryKey: ["auth", "me"],
        queryFn: () => usersApi.me(),
        enabled: Boolean(tokens?.accessToken),
        retry: false,
        staleTime: 30_000,
    });

    const login = useCallback(
        async (payload: LoginPayload) => {
            const result = await authApi.login(payload);
            const nextTokens: Omit<AuthSessionTokens, "issuedAt"> = {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                expiresIn: result.expiresIn,
            };

            setStoredSessionTokens(nextTokens);
            setTokens(getStoredSessionTokens());
            queryClient.setQueryData(["auth", "me"], result.user);
            return result;
        },
        [queryClient],
    );

    const logout = useCallback(async () => {
        try {
            if (tokens?.accessToken) {
                await authApi.logout();
            }
        } catch {
            // Stateless logout is best effort from UI side.
        } finally {
            clearStoredSessionTokens();
            setTokens(null);
            queryClient.removeQueries({ queryKey: ["auth"] });
        }
    }, [queryClient, tokens?.accessToken]);

    const refreshProfile = useCallback(async () => {
        if (!tokens?.accessToken) {
            return null;
        }

        try {
            const result = await queryClient.fetchQuery({
                queryKey: ["auth", "me"],
                queryFn: () => usersApi.me(),
            });
            return result;
        } catch {
            return null;
        }
    }, [queryClient, tokens?.accessToken]);

    const user = profileQuery.data ?? null;

    useEffect(() => {
        if (!(profileQuery.error instanceof ApiClientError)) {
            return;
        }

        if (profileQuery.error.status !== 401) {
            return;
        }

        clearStoredSessionTokens();
        setTokens(null);
        queryClient.removeQueries({ queryKey: ["auth"] });
    }, [profileQuery.error, queryClient]);

    const status: SessionStatus = tokens
        ? profileQuery.isPending
            ? "loading"
            : user
                ? "authenticated"
                : "unauthenticated"
        : "unauthenticated";

    const hasPermission = useCallback(
        (permission: string) => {
            if (!user) {
                return false;
            }
            if (user.isSuperAdmin) {
                return true;
            }
            return user.permissions.includes(permission);
        },
        [user],
    );

    const hasAnyPermission = useCallback(
        (permissions: string[]) => {
            if (!user) {
                return false;
            }
            if (user.isSuperAdmin) {
                return true;
            }
            return permissions.some((permission) => user.permissions.includes(permission));
        },
        [user],
    );

    const hasRole = useCallback(
        (role: string) => {
            if (!user) {
                return false;
            }
            if (user.isSuperAdmin) {
                return true;
            }
            return user.roles.some((item) => item.toLowerCase() === role.toLowerCase());
        },
        [user],
    );

    const value = useMemo<AuthSessionContextValue>(
        () => ({
            status,
            user,
            tokens,
            login,
            logout,
            refreshProfile,
            hasPermission,
            hasAnyPermission,
            hasRole,
        }),
        [status, user, tokens, login, logout, refreshProfile, hasPermission, hasAnyPermission, hasRole],
    );

    return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
    const context = useContext(AuthSessionContext);
    if (!context) {
        throw new Error("useAuthSession must be used within AuthSessionProvider");
    }
    return context;
}
