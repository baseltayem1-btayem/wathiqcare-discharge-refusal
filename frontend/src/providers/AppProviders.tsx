"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import GlobalApiErrorBanner from "@/components/GlobalApiErrorBanner";
import { AuthSessionProvider } from "@/lib/session/AuthSessionProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 1,
                        refetchOnWindowFocus: false,
                        staleTime: 20_000,
                    },
                    mutations: {
                        retry: 0,
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthSessionProvider>
                <GlobalApiErrorBanner />
                {children}
            </AuthSessionProvider>
        </QueryClientProvider>
    );
}
