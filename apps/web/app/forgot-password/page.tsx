"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/utils/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch<{ message?: string }>("/api/auth/reset-request", {
        method: "POST",
        body: JSON.stringify({ email }),
        authFailureMode: "inline",
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef7fb] px-4">
        <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">✉️</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Check your inbox</h1>
          <p className="mt-2 text-sm text-slate-600">
            If an account exists for <strong>{email}</strong>, a password reset link has been sent. The link expires in 30 minutes.
          </p>
          <p className="mt-1 text-xs text-slate-400">Didn&apos;t receive it? Check your spam folder.</p>
          <Link href="/login" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef7fb] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Image src="/images/wathiqcare-logo.png" alt="WathiqCare" width={140} height={42} className="h-auto w-[110px] object-contain" />
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
          <Link href="/login" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          <h1 className="mt-2 text-xl font-bold text-slate-900">Forgot your password?</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your email address and we&apos;ll send you a reset link.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-slate-700">Email address</label>
              <input
                id="reset-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                placeholder="your.email@domain.com"
              />
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Mail className="h-4 w-4" />
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
