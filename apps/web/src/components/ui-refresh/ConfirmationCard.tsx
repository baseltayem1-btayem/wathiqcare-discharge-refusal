/**
 * ConfirmationCard
 * ------------------------------------------------------------
 * Success confirmation card displayed after the signing workflow
 * completes. The reference number, timestamp, and verification
 * badge are passed in by the caller — this component does NOT
 * read from the audit chain, evidence package, or signing API.
 *
 * Mirrors Figma ConfirmationScreen (App.tsx ~L1050).
 */
"use client";

import type { ReactNode } from "react";
import { CheckCircle, Shield } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, rowDir } from "./_utils";

export interface ConfirmationCardProps {
  lang?: Lang;
  title: string;
  description: string;
  /** Localised "Reference Number" label. */
  refLabel: string;
  refValue: string;
  /** Localised "Recorded At" label. */
  timestampLabel: string;
  /** Pre-formatted timestamp (caller owns the formatter). */
  timestampValue: string;
  verificationLabel: string;
  /** e.g. "OTP + Signature". */
  verificationValue: string;
  /** Optional slot for a Download PDF button (caller-wired). */
  actions?: ReactNode;
  className?: string;
}

export function ConfirmationCard({
  lang = "en",
  title,
  description,
  refLabel,
  refValue,
  timestampLabel,
  timestampValue,
  verificationLabel,
  verificationValue,
  actions,
  className,
}: ConfirmationCardProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-center gap-5 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-full",
          "bg-[color:var(--wc-color-success-soft)]",
        )}
        aria-hidden
      >
        <CheckCircle
          size={40}
          className="text-[color:var(--wc-color-success)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-[color:var(--wc-color-text)]">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-[color:var(--wc-color-text-muted)]">
          {description}
        </p>
      </div>

      <article
        className={cn(
          "flex w-full flex-col gap-3 rounded-[var(--wc-radius-md)] border bg-[color:var(--wc-color-surface)] p-4 shadow-[var(--wc-shadow-sm)]",
          "border-[color:var(--wc-color-border)]",
        )}
      >
        <div className={cn("flex items-center justify-between", rowDir(lang))}>
          <span className="text-xs text-[color:var(--wc-color-text-muted)]">
            {refLabel}
          </span>
          <span
            dir="ltr"
            className="font-mono text-xs font-bold text-[color:var(--wc-color-primary)]"
          >
            {refValue}
          </span>
        </div>
        <div className="h-px bg-[color:var(--wc-color-border)]" />
        <div className={cn("flex items-center justify-between", rowDir(lang))}>
          <span className="text-xs text-[color:var(--wc-color-text-muted)]">
            {timestampLabel}
          </span>
          <span
            dir="ltr"
            className="font-mono text-xs text-[color:var(--wc-color-text)]/70"
          >
            {timestampValue}
          </span>
        </div>
        <div className="h-px bg-[color:var(--wc-color-border)]" />
        <div className={cn("flex items-center justify-between", rowDir(lang))}>
          <span className="text-xs text-[color:var(--wc-color-text-muted)]">
            {verificationLabel}
          </span>
          <span className="flex items-center gap-1">
            <Shield
              size={12}
              className="text-[color:var(--wc-color-success)]"
              aria-hidden
            />
            <span className="text-xs font-semibold text-[color:var(--wc-color-success)]">
              {verificationValue}
            </span>
          </span>
        </div>
      </article>

      {actions && <div className="flex w-full flex-col gap-2">{actions}</div>}
    </section>
  );
}

export default ConfirmationCard;
