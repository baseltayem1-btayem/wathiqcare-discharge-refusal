import { apiClient } from "@/lib/api/http-client";
import { AuthUserProfile } from "@/lib/api/types";

export const usersApi = {
    me() {
        return apiClient.get<AuthUserProfile>("/auth/me");
    },

    list() {
        return apiClient.get<Array<Record<string, unknown>>>("/users");
    },
};
