"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/utils/api";

type VerifyResponse = {
    authenticated: boolean;
    redirectTo?: string;
};

type VerifyErrorCode =
    | "EXPIRED_LINK"
    | "ALREADY_USED"
    | "INVALID_TOKEN"
    | "DOMAIN_NOT_ALLOWED"
    | "PENDING_APPROVAL"
    | "NO_ROLE_ASSIGNED"
    | "NO_LICENSE_ASSIGNED";

type VerifyErrorPayload = {
    detail?: string;
    code?: VerifyErrorCode;
};

function friendlyError(code: VerifyErrorCode | undefined, detail: string | undefined): string {
    if (code === "EXPIRED_LINK") return "This login link has expired. Please request a new one.";
    if (code === "ALREADY_USED") return "This login link was already used. Please request a new one.";
    if (code === "INVALID_TOKEN") return "This login link is invalid. Please request a new one.";
    if (code === "DOMAIN_NOT_ALLOWED") return "Domain not allowed";
    if (code === "PENDING_APPROVAL") return "Pending approval";
    if (code === "NO_ROLE_ASSIGNED") return "No role assigned";
    if (code === "NO_LICENSE_ASSIGNED") return "No license assigned";
    return detail || "Unable to verify login link.";
}

function MagicVerifyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);

    const [error, setError] = useState<string>("");

    useEffect(() => {
        let mounted = true;

        async function runVerification() {
            if (!token) {
                setError("This login link is invalid. Please request a new one.");
                return;
            }

            try {
                const result = await apiFetch<VerifyResponse>(`/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`, {
                    method: "GET",
                    cache: "no-store",
                });

                if (!mounted) {
                    return;
                }

                if (result.authenticated) {
                    router.replace(result.redirectTo || "/dashboard");
                    return;
                }

                setError("Unable to verify login link.");
            } catch (err) {
                if (!mounted) {
                    return;
                }

                const payload = (err as { details?: VerifyErrorPayload | null })?.details ?? null;
                setError(friendlyError(payload?.code, payload?.detail));
            }
        }

        void runVerification();

        return () => {
            mounted = false;
        };
    }, [router, token]);

    return (
        <main className="min-h-screen bg-[#f2f8fb] px-4 py-10 sm:px-6">
            <div className="mx-auto w-full max-w-xl rounded-3xl border border-cyan-100 bg-white p-6 shadow-[0_14px_34px_rgba(12,74,110,0.12)] sm:p-8">
                {!error ? (
                    <>
                        <h1 className="text-xl font-bold text-slate-900">Verifying your secure login link...</h1>
                        <p className="mt-2 text-sm text-slate-600">Please wait while we securely sign you in.</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-xl font-bold text-slate-900">Login link verification failed</h1>
                        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                        <div className="mt-5">
                            <Link
                                href="/login"
                                className="inline-flex items-center rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
                            >
                                Back to login
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}

export default function MagicVerifyPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-[#f2f8fb] px-4 py-10 sm:px-6">
                    <div className="mx-auto w-full max-w-xl rounded-3xl border border-cyan-100 bg-white p-6 shadow-[0_14px_34px_rgba(12,74,110,0.12)] sm:p-8">
                        <h1 className="text-xl font-bold text-slate-900">Verifying your secure login link...</h1>
                        <p className="mt-2 text-sm text-slate-600">Please wait while we securely sign you in.</p>
                    </div>
                </main>
            }
        >
            <MagicVerifyPageContent />
        </Suspense>
    );
}
