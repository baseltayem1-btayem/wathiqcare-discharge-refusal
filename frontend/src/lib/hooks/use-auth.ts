"use client";

import { useMutation } from "@tanstack/react-query";

import { useAuthSession } from "@/lib/session/AuthSessionProvider";
import type { LoginPayload } from "@/lib/api/types";

export function useLoginMutation() {
    const { login } = useAuthSession();

    return useMutation({
        mutationFn: (payload: LoginPayload) => login(payload),
    });
}

export function useLogoutMutation() {
    const { logout } = useAuthSession();

    return useMutation({
        mutationFn: () => logout(),
    });
}

export { useAuthSession };
