"use client";

export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/utils/api";

type PageProps = {
  params: Promise<{ token: string }>;
};

type ContextPayload = {
  moduleType: string;
  documentId: string;
  redirectPath: string;
};

type RequestOtpResponse = {
  challengeId: string;
  expiresAt: string;
  deliveryStatus: "sent" | "failed";
  fallbackMode: boolean;
  maskedPhone: string;
};

type VerifyOtpResponse = {
  verified: boolean;
  redirectPath: string;
  moduleType: string;
  documentId: string;
  attemptsRemaining: number;
};

function toReadableDate(value: string | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function PublicSigningPage({ params }: PageProps) {
  const { token } = use(params);
  const router = useRouter();

  const [context, setContext] = useState<ContextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpState, setOtpState] = useState<RequestOtpResponse | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyOtpResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setLoading(true);
      setError("");
      try {
        const payload = await apiFetch<ContextPayload>(`/api/sign/${encodeURIComponent(token)}/context`);
        if (cancelled) return;
        setContext(payload);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message.replace(/^\d+:/, "").trim() : "Failed to load signing session");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function sendOtp() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<RequestOtpResponse>(`/api/sign/${encodeURIComponent(token)}/request-otp`, {
        method: "POST",
        body: JSON.stringify({ mobileNumber, locale: "ar" }),
      });
      setOtpState(response);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^\d+:/, "").trim() : "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<VerifyOtpResponse>(`/api/sign/${encodeURIComponent(token)}/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ otpCode }),
      });
      setVerifyState(response);
      if (response.verified && response.redirectPath) {
        router.push(response.redirectPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^\d+:/, "").trim() : "Failed to verify OTP");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Secure Signing Verification</h1>
          <p className="mt-3 text-sm text-slate-600">Loading secure session...</p>
        </div>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h1 className="text-xl font-semibold">Invalid or expired signing link</h1>
          <p className="mt-2 text-sm">{error || "Unable to verify this signing link."}</p>
          <Link href="/" className="mt-4 inline-flex rounded-md border border-rose-300 px-3 py-2 text-sm">
            Return to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">WathiqCare Secure Sign</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Verify OTP before signing</h1>
          <p className="mt-2 text-sm text-slate-600">Module: {context.moduleType} | Document: {context.documentId}</p>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="block text-sm font-medium text-slate-700">Mobile Number</label>
          <input
            type="tel"
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
            placeholder="+9665XXXXXXXX"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-500 focus:ring"
          />
          <button
            onClick={sendOtp}
            disabled={busy}
            className="inline-flex items-center rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Sending..." : "Request OTP"}
          </button>
        </div>

        {otpState ? (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p>OTP status: {otpState.deliveryStatus === "sent" ? "Sent" : "Failed"}</p>
            <p>Mobile: {otpState.maskedPhone}</p>
            <p>Expires at: {toReadableDate(otpState.expiresAt)}</p>
            {otpState.fallbackMode ? <p>SMS provider is not configured in this environment.</p> : null}

            <label className="block text-sm font-medium text-emerald-900">OTP Code</label>
            <input
              type="text"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              placeholder="123456"
              className="w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-500 focus:ring"
            />

            <button
              onClick={verifyOtp}
              disabled={busy}
              className="inline-flex items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        ) : null}

        {verifyState && !verifyState.verified ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Invalid OTP. Attempts remaining: {verifyState.attemptsRemaining}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>
        ) : null}

        <p className="text-xs text-slate-500">
          After successful verification, you will be redirected to the secure signing workflow.
        </p>
      </div>
    </main>
  );
}
