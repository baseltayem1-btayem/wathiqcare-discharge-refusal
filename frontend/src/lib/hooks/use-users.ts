"use client";

import { useQuery } from "@tanstack/react-query";

import { usersApi } from "@/lib/api/modules/users";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useUsersListQuery(enabled = true) {
    return useQuery({
        queryKey: queryKeys.users.list,
        queryFn: () => usersApi.list(),
        enabled,
    });
}
