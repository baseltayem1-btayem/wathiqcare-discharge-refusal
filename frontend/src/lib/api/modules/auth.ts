import { apiClient } from "@/lib/api/http-client";
import { AuthUserProfile, LoginPayload, LoginResult } from "@/lib/api/types";

export type RefreshResult = {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
};

export const authApi = {
    login(payload: LoginPayload) {
        return apiClient.post<LoginResult, LoginPayload>("/auth/login", payload);
    },

    refresh(refreshToken: string) {
        return apiClient.post<RefreshResult, { refreshToken: string }>("/auth/refresh", {
            refreshToken,
        });
    },

    logout() {
        return apiClient.post<{ invalidated: boolean; message: string }>("/auth/logout");
    },

    me() {
        return apiClient.get<AuthUserProfile>("/auth/me");
    },
};
