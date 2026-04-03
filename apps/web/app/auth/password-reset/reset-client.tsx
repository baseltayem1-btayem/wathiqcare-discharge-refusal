"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { apiFetch } from "@/utils/api";

export default function PasswordResetClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleResetRequest(event: FormEvent) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            await apiFetch<{ message?: string }>("/api/auth/reset-request", {
                method: "POST",
                body: JSON.stringify({ email }),
                authFailureMode: "inline",
            });
            setSuccess(true);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to send reset email. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResetConfirm(event: FormEvent) {
        event.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match. Please re-enter your new password.");
            return;
        }

        setLoading(true);
        try {
            await apiFetch<{ message?: string }>("/api/auth/reset-confirm", {
                method: "POST",
                body: JSON.stringify({ token, password }),
                authFailureMode: "inline",
            });
            setSuccess(true);
            setTimeout(() => router.push("/login"), 3000);
        } catch (confirmError) {
            setError(confirmError instanceof Error ? confirmError.message : "Unable to reset password. The link may be expired or already used.");
        } finally {
            setLoading(false);
        }
    }

    // ----- Success states -----
    if (success && !token) {
        return (
            <section className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-[0_12px_36px_rgba(15,23,42,0.08)] text-center">
                <div className="mb-4 flex justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">✉️</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Check your inbox</h1>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                    If an account exists for <strong>{email}</strong>, a password reset link has been sent.
                    The link expires in 30 minutes.
                </p>
                <p className="mt-2 text-xs text-slate-400">Didn&apos;t receive it? Check your spam folder.</p>
                <div className="mt-6">
                    <Link
                        href="/login"
                        className="inline-flex items-center rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
                    >
                        Back to sign in
                    </Link>
                </div>
            </section>
        );
    }

    if (success && token) {
        return (
            <section className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-[0_12px_36px_rgba(15,23,42,0.08)] text-center">
                <div className="mb-4 flex justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Password updated</h1>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    Your WathiqCare password has been changed successfully.
                    You will be redirected to sign in shortly.
                </p>
                <div className="mt-6">
                    <Link
                        href="/login"
                        className="inline-flex items-center rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
                    >
                        Sign in now
                    </Link>
                </div>
            </section>
        );
    }

    // ----- Error state for invalid/expired token -----
    if (token && error && (error.toLowerCase().includes("expired") || error.toLowerCase().includes("already been used") || error.toLowerCase().includes("invalid"))) {
        return (
            <section className="rounded-3xl border border-rose-200 bg-white p-8 shadow-[0_12px_36px_rgba(15,23,42,0.08)] text-center">
                <div className="mb-4 flex justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-3xl">⏰</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {error.toLowerCase().includes("already been used") ? "Link already used" : "Link expired"}
                </h1>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                    {error.toLowerCase().includes("already been used")
                        ? "This password reset link has already been used. Please request a new one if you need to change your password."
                        : "This password reset link has expired. Password reset links are valid for 30 minutes."}
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                    <Link
                        href="/auth/password-reset"
                        className="inline-flex items-center rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
                    >
                        Request a new link
                    </Link>
                    <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600">
                        Back to sign in
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
            <h1 className="text-2xl font-bold text-slate-900">
                {token ? "Create a new password" : "Reset your password"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
                {token
                    ? "Choose a strong, unique password for your WathiqCare account. Minimum 12 characters."
                    : "Enter your email address and we will send you a secure link to reset your password."}
            </p>

            <form onSubmit={token ? handleResetConfirm : handleResetRequest} className="mt-6 space-y-4">
                {!token && (
                    <label className="block text-sm font-medium text-slate-700">
                        Email address
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                            placeholder="your.email@example.com"
                            required
                            autoFocus
                        />
                    </label>
                )}

                {token && (
                    <>
                        <label className="block text-sm font-medium text-slate-700">
                            New password
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                                placeholder="Minimum 12 characters"
                                required
                                autoFocus
                            />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                            Confirm new password
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                                placeholder="Repeat your new password"
                                required
                            />
                        </label>
                    </>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
                >
                    {loading
                        ? token ? "Updating password..." : "Sending reset link..."
                        : token ? "Update password" : "Send reset link"}
                </button>

                <div className="text-center">
                    <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600">
                        Back to sign in
                    </Link>
                </div>
            </form>
        </section>
    );
}
