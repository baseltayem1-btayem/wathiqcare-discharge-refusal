"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch } from "@/utils/api";

export default function PasswordResetClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleResetRequest(event: FormEvent) {
        event.preventDefault();
        setError("");
        setNotice("");
        setLoading(true);

        try {
            const result = await apiFetch<{ message?: string }>("/api/auth/reset-request", {
                method: "POST",
                body: JSON.stringify({ email }),
                authFailureMode: "inline",
            });
            setNotice(result.message || "If the account exists, a reset link has been sent.");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to send reset email");
        } finally {
            setLoading(false);
        }
    }

    async function handleResetConfirm(event: FormEvent) {
        event.preventDefault();
        setError("");
        setNotice("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const result = await apiFetch<{ message?: string }>("/api/auth/reset-confirm", {
                method: "POST",
                body: JSON.stringify({ token, password }),
                authFailureMode: "inline",
            });
            setNotice(result.message || "Password updated successfully");
            setTimeout(() => router.push("/login"), 1000);
        } catch (confirmError) {
            setError(confirmError instanceof Error ? confirmError.message : "Unable to reset password");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
            <h1 className="text-2xl font-bold text-slate-900">
                {token ? "Set a new password" : "Reset your password"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
                {token
                    ? "Choose a strong password for your WathiqCare account."
                    : "Enter your email and we will send you a secure password reset link."}
            </p>

            <form onSubmit={token ? handleResetConfirm : handleResetRequest} className="mt-6 space-y-4">
                {!token && (
                    <label className="block text-sm font-medium text-slate-700">
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                            placeholder="your.email@example.com"
                            required
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
                            />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                            Confirm password
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                                placeholder="Repeat your password"
                                required
                            />
                        </label>
                    </>
                )}

                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
                >
                    {loading
                        ? token ? "Updating password..." : "Sending reset link..."
                        : token ? "Update password" : "Send reset link"}
                </button>
            </form>
        </section>
    );
}