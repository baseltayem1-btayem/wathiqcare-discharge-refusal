/**
 * OTPVisualPanel
 * ------------------------------------------------------------
 * VISUAL SHELL ONLY. This component renders the OTP screen layout
 * (icon, copy, masked phone, 6 input cells, resend + verify buttons).
 *
 * Hard rule: this file MUST NOT perform OTP generation, validation,
 * persistence, rate-limiting, or audit emission. All of those
 * concerns remain in the existing OTP/signing pipeline. The parent
 * passes:
 *
 *   - `value`                — current 6-char string from its state
 *   - `onChange(next)`       — propagate input change upstream
 *   - `onResend()`           — wired to the existing resend API
 *   - `onVerify()`           — wired to the existing verify API
 *   - `verifying`, `error`   — surface backend status to UI
 *
 * No defaults are provided for the action callbacks — callers MUST
 * wire them. The component does not store, log, or transmit `value`
 * anywhere except via its own controlled inputs.
 */
"use client";

import { useRef } from "react";
import { Phone, Shield } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, rowDir, textAlign } from "./_utils";

export interface OTPVisualPanelProps {
  lang?: Lang;
  title: string;
  description: string;
  /** Already-masked phone number for display only (caller responsibility). */
  maskedPhone: string;
  expiryNotice?: string;
  resendLabel: string;
  verifyLabel: string;
  /** Controlled OTP value (digits only). */
  value: string;
  onChange: (next: string) => void;
  onResend: () => void;
  onVerify: () => void;
  /** 4–8; defaults to 6. */
  length?: number;
  verifying?: boolean;
  error?: string | null;
  className?: string;
}

export function OTPVisualPanel({
  lang = "en",
  title,
  description,
  maskedPhone,
  expiryNotice,
  resendLabel,
  verifyLabel,
  value,
  onChange,
  onResend,
  onVerify,
  length = 6,
  verifying = false,
  error = null,
  className,
}: OTPVisualPanelProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleCellChange = (index: number, ch: string) => {
    const digit = ch.replace(/\D/g, "").slice(-1);
    const next =
      (value.slice(0, index) + digit + value.slice(index + 1)).slice(0, length);
    onChange(next);
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const filled = value.length >= length;

  return (
    <section
      className={cn(
        "flex flex-col gap-5",
        textAlign(lang),
        className,
      )}
    >
      <header
        className={cn(
          "flex flex-col gap-2",
          lang === "ar" ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-[var(--wc-radius-lg)]",
            "bg-[color:var(--wc-color-primary)]/10",
          )}
          aria-hidden
        >
          <Shield
            size={22}
            className="text-[color:var(--wc-color-primary)]"
          />
        </div>
        <h1 className="text-xl font-bold text-[color:var(--wc-color-text)]">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-[color:var(--wc-color-text-muted)]">
          {description}
        </p>
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-2 rounded-[var(--wc-radius-pill)] px-3 py-1",
            "bg-[color:var(--wc-color-surface-secondary)]",
            rowDir(lang),
          )}
        >
          <Phone
            size={13}
            className="text-[color:var(--wc-color-primary)]"
            aria-hidden
          />
          <span
            dir="ltr"
            className="font-mono text-xs text-[color:var(--wc-color-primary)]"
          >
            {maskedPhone}
          </span>
        </div>
      </header>

      <div className="flex justify-center gap-2" dir="ltr">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={value[i] ?? ""}
            onChange={(e) => handleCellChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1} of ${length}`}
            className={cn(
              "h-12 w-10 rounded-[var(--wc-radius-md)] border bg-[color:var(--wc-color-input-bg)] text-center font-mono text-lg",
              "border-[color:var(--wc-color-border-strong)] text-[color:var(--wc-color-text)]",
              "focus:outline-none focus-visible:shadow-[var(--wc-focus-ring)]",
              error ? "border-[color:var(--wc-color-danger)]" : "",
            )}
          />
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="text-center text-sm text-[color:var(--wc-color-danger)]"
        >
          {error}
        </p>
      )}

      {expiryNotice && (
        <p className="text-center text-xs text-[color:var(--wc-color-text-muted)]">
          {expiryNotice}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onVerify}
          disabled={!filled || verifying}
          className={cn(
            "w-full rounded-[var(--wc-radius-md)] py-3.5 text-sm font-semibold transition-colors",
            filled && !verifying
              ? "bg-[color:var(--wc-color-primary)] text-[color:var(--wc-color-primary-contrast)] hover:opacity-90"
              : "cursor-not-allowed bg-[color:var(--wc-color-surface-muted)] text-[color:var(--wc-color-text-muted)]",
          )}
        >
          {verifyLabel}
        </button>
        <button
          type="button"
          onClick={onResend}
          className="text-center text-sm font-medium text-[color:var(--wc-color-primary)] underline-offset-2 hover:underline"
        >
          {resendLabel}
        </button>
      </div>
    </section>
  );
}

export default OTPVisualPanel;
