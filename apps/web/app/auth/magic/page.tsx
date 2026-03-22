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

type ErrorDisplay = {
    icon: string;
    heading: string;
    body: string;
    cta?: { label: string; href: string };
    secondary?: { label: string; href: string };
};

function getErrorDisplay(code: VerifyErrorCode | undefined, detail: string | undefined): ErrorDisplay {
    if (code === "EXPIRED_LINK") {
        return {
            icon: "⏰",
            heading: "Link expired",
            body: "This sign-in link has expired. Sign-in links are valid for 10 minutes. Please request a new one.",
            cta: { label: "Request a new link", href: "/login" },
        };
    }
    if (code === "ALREADY_USED") {
        return {
            icon: "🔒",
            heading: "Link already used",
            body: "This sign-in link has already been used. Each link can only be used once for your security. Please request a new one.",
            cta: { label: "Request a new link", href: "/login" },
        };
    }
    if (code === "DOMAIN_NOT_ALLOWED") {
        return {
            icon: "🚫",
            heading: "Domain not authorized",
            body: "Your email domain is not authorized to access this platform. Please contact your administrator.",
            cta: { label: "Back to sign in", href: "/login" },
        };
    }
    if (code === "PENDING_APPROVAL") {
        return {
            icon: "⏳",
            heading: "Account pending approval",
            body: "Your account is awaiting administrator approval. You will receive an email once your access is activated.",
            cta: { label: "Back to sign in", href: "/login" },
        };
    }
    if (code === "NO_ROLE_ASSIGNED") {
        return {
            icon: "👤",
            heading: "No role assigned",
            body: "Your account does not have a role assigned yet. Please contact your system administrator.",
            cta: { label: "Back to sign in", href: "/login" },
        };
    }
    return {
        icon: "❌",
        heading: "Invalid sign-in link",
        body: detail || "This sign-in link is invalid or cannot be verified. Please request a new one.",
        cta: { label: "Request a new link", href: "/login" },
    };
}

function MagicVerifyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);

    const [errorDisplay, setErrorDisplay] = useState<ErrorDisplay | null>(null);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function runVerification() {
            if (!token) {
                setErrorDisplay(getErrorDisplay("INVALID_TOKEN", undefined));
                return;
            }

            try {
                const result = await apiFetch<VerifyResponse>(`/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`, {
                    method: "GET",
                    cache: "no-store",
                });

                if (!mounted) return;

                if (result.authenticated) {
                    setVerified(true);
                    router.replace(result.redirectTo || "/dashboard");
                    return;
                }

                setErrorDisplay(getErrorDisplay(undefined, "Unable to verify sign-in link."));
            } catch (err) {
                if (!mounted) return;

                const payload = (err as { details?: VerifyErrorPayload | null })?.details ?? null;
                setErrorDisplay(getErrorDisplay(payload?.code, payload?.detail));
            }
        }

        void runVerification();
        return () => { mounted = false; };
    }, [router, token]);

    if (errorDisplay) {
        return (
            <main className="min-h-screen bg-[#eef7fb] px-4 py-12 sm:px-6">
                <div className="mx-auto w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-8 shadow-[0_14px_34px_rgba(12,74,110,0.10)] sm:p-10 text-center">
                    <div className="mb-4 flex justify-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-4xl border border-rose-200">
                            {errorDisplay.icon}
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">{errorDisplay.heading}</h1>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">{errorDisplay.body}</p>
                    <div className="mt-7 flex flex-col items-center gap-3">
                        {errorDisplay.cta && (
                            <Link
                                href={errorDisplay.cta.href}
                                className="inline-flex items-center rounded-xl bg-cyan-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
                            >
                                {errorDisplay.cta.label}
                            </Link>
                        )}
                        {errorDisplay.secondary && (
                            <Link href={errorDisplay.secondary.href} className="text-xs text-slate-400 hover:text-slate-600">
                                {errorDisplay.secondary.label}
                            </Link>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#eef7fb] px-4 py-12 sm:px-6">
            <div className="mx-auto w-full max-w-lg rounded-3xl border border-cyan-100 bg-white p-8 shadow-[0_14px_34px_rgba(12,74,110,0.10)] sm:p-10 text-center">
                {verified ? (
                    <>
                        <div className="mb-4 flex justify-center">
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-4xl border border-emerald-200">✅</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">Signed in successfully</h1>
                        <p className="mt-2 text-sm text-slate-500">Redirecting you to your dashboard...</p>
                    </>
                ) : (
                    <>
                        <div className="mb-5 flex justify-center">
                            <svg className="h-12 w-12 animate-spin text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">Verifying your sign-in link</h1>
                        <p className="mt-2 text-sm text-slate-500">Please wait while we securely sign you in…</p>
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
                <main className="min-h-screen bg-[#eef7fb] px-4 py-12 sm:px-6">
                    <div className="mx-auto w-full max-w-lg rounded-3xl border border-cyan-100 bg-white p-8 shadow-[0_14px_34px_rgba(12,74,110,0.10)] sm:p-10 text-center">
                        <div className="mb-5 flex justify-center">
                            <svg className="h-12 w-12 animate-spin text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">Verifying your sign-in link</h1>
                        <p className="mt-2 text-sm text-slate-500">Please wait while we securely sign you in…</p>
                    </div>
                </main>
            }
        >
            <MagicVerifyPageContent />
        </Suspense>
    );
}

