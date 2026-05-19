"use client";

import { useEffect, useRef, useState } from "react";
import type { MockOtpStatus } from "./types";

export type MockOtpVerificationProps = {
  language: "en" | "ar";
  maskedPhone: string;
  /** Visible mock code (preview only). In production this would never be exposed. */
  expectedCode?: string;
  onVerified?: () => void;
  onStatusChange?: (status: MockOtpStatus) => void;
};

const STRINGS = {
  en: {
    title: "OTP Verification",
    subtitle: "Patient identity confirmation",
    previewNote:
      "Preview shell — no real SMS is sent. In production this calls /api/sign/[token]/request-otp and /verify-otp.",
    sendCode: "Send code",
    resend: "Resend",
    enterCode: "Enter the 6-digit code",
    verify: "Verify",
    verifying: "Verifying…",
    sending: "Sending…",
    verified: "Code verified",
    failed: "Incorrect code — try again",
    attemptsRemaining: "Attempts remaining",
    sentTo: "Code sent to",
    mockHint: "Mock code (preview only)",
  },
  ar: {
    title: "التحقق برمز OTP",
    subtitle: "تأكيد هوية المريض",
    previewNote:
      "هذه واجهة معاينة فقط — لا يتم إرسال رسالة فعلية. في الإنتاج يتم استدعاء /api/sign/[token]/request-otp و /verify-otp.",
    sendCode: "إرسال الرمز",
    resend: "إعادة الإرسال",
    enterCode: "أدخل الرمز المكون من 6 أرقام",
    verify: "تحقق",
    verifying: "جاري التحقق…",
    sending: "جاري الإرسال…",
    verified: "تم التحقق من الرمز",
    failed: "رمز غير صحيح — حاول مرة أخرى",
    attemptsRemaining: "المحاولات المتبقية",
    sentTo: "تم إرسال الرمز إلى",
    mockHint: "رمز تجريبي (للمعاينة فقط)",
  },
} as const;

/**
 * Mock OTP verification panel — preview-only UI shell.
 *
 * Visually mirrors the production OTP flow served by:
 *   POST /api/sign/[token]/request-otp
 *   POST /api/sign/[token]/verify-otp
 *
 * but uses purely in-component state. No network calls. No SMS sent.
 * Intended for stakeholder UAT of the enterprise consent layout.
 */
export default function MockOtpVerification({
  language,
  maskedPhone,
  expectedCode = "482917",
  onVerified,
  onStatusChange,
}: MockOtpVerificationProps) {
  const s = STRINGS[language];
  const [status, setStatus] = useState<MockOtpStatus>("idle");
  const [code, setCode] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const handleSend = () => {
    setStatus("sending");
    setCode("");
    // Simulated network roundtrip.
    setTimeout(() => {
      setStatus("awaiting-code");
      inputRef.current?.focus();
    }, 600);
  };

  const handleVerify = () => {
    setStatus("verifying");
    setTimeout(() => {
      if (code.trim() === expectedCode) {
        setStatus("verified");
        onVerified?.();
      } else {
        const next = Math.max(0, attemptsRemaining - 1);
        setAttemptsRemaining(next);
        setStatus(next > 0 ? "failed" : "failed");
      }
    }, 500);
  };

  return (
    <section
      className="wc-ent-card"
      style={{ border: "var(--wc-ent-border)" }}
      data-testid="mock-otp-verification"
      data-status={status}
    >
      <header
        className="flex items-start justify-between gap-3 border-b px-3 py-2"
        style={{ borderColor: "var(--wc-ent-surface-ribbon-border)", background: "#f6f8fb" }}
      >
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--wc-ent-fg-muted)" }}
          >
            {s.subtitle}
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--wc-ent-fg-strong)" }}>
            {s.title}
          </div>
        </div>
        <span
          className="rounded px-2 py-1 text-[10px] font-bold uppercase"
          style={{
            background: "var(--wc-ent-state-warn-bg)",
            color: "var(--wc-ent-state-warn-fg)",
          }}
        >
          Preview · No SMS
        </span>
      </header>

      <div
        className="border-b px-3 py-2 text-[11px] leading-relaxed"
        style={{
          borderColor: "var(--wc-ent-surface-ribbon-border)",
          color: "var(--wc-ent-fg-muted)",
          background: "#fffdf4",
        }}
      >
        {s.previewNote}
      </div>

      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <div>
            <span style={{ color: "var(--wc-ent-fg-muted)" }}>{s.sentTo}: </span>
            <bdi
              dir="ltr"
              className="font-mono font-semibold"
              style={{ color: "var(--wc-ent-fg-strong)" }}
            >
              {maskedPhone}
            </bdi>
          </div>
          <div style={{ color: "var(--wc-ent-fg-muted)" }}>
            {s.mockHint}:{" "}
            <bdi dir="ltr" className="font-mono font-semibold">
              {expectedCode}
            </bdi>
          </div>
        </div>

        {status === "idle" ? (
          <button
            type="button"
            onClick={handleSend}
            className="w-full rounded px-3 py-2 text-sm font-semibold"
            style={{
              background: "var(--wc-ent-state-info-bg)",
              color: "var(--wc-ent-state-info-fg)",
              border: "var(--wc-ent-border)",
            }}
            data-testid="otp-send-button"
          >
            {s.sendCode}
          </button>
        ) : null}

        {status === "sending" ? (
          <div
            className="rounded px-3 py-2 text-center text-sm"
            style={{
              background: "var(--wc-ent-state-info-bg)",
              color: "var(--wc-ent-state-info-fg)",
            }}
          >
            {s.sending}
          </div>
        ) : null}

        {status === "awaiting-code" ||
        status === "verifying" ||
        status === "failed" ? (
          <div className="space-y-2">
            <label className="block">
              <span
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {s.enterCode}
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                dir="ltr"
                className="w-full rounded border px-3 py-2 text-center font-mono text-lg tracking-[0.4em]"
                style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
                data-testid="otp-code-input"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span style={{ color: "var(--wc-ent-fg-muted)" }}>
                {s.attemptsRemaining}: <bdi dir="ltr">{attemptsRemaining}</bdi>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSend}
                  className="rounded border px-3 py-1.5 text-xs"
                  style={{
                    borderColor: "var(--wc-ent-surface-ribbon-border)",
                    color: "var(--wc-ent-fg-strong)",
                  }}
                  data-testid="otp-resend-button"
                >
                  {s.resend}
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={code.length !== 6 || status === "verifying"}
                  className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{
                    background: "var(--wc-ent-state-info-bg)",
                    color: "var(--wc-ent-state-info-fg)",
                    border: "var(--wc-ent-border)",
                  }}
                  data-testid="otp-verify-button"
                >
                  {status === "verifying" ? s.verifying : s.verify}
                </button>
              </div>
            </div>
            {status === "failed" ? (
              <div
                className="rounded px-3 py-2 text-xs"
                style={{
                  background: "var(--wc-ent-state-err-bg)",
                  color: "var(--wc-ent-state-err-fg)",
                }}
                data-testid="otp-failed-banner"
              >
                {s.failed}
              </div>
            ) : null}
          </div>
        ) : null}

        {status === "verified" ? (
          <div
            className="flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold"
            style={{
              background: "var(--wc-ent-state-ok-bg)",
              color: "var(--wc-ent-state-ok-fg)",
            }}
            data-testid="otp-verified-banner"
          >
            <span className="text-base">✓</span>
            {s.verified}
          </div>
        ) : null}
      </div>
    </section>
  );
}
