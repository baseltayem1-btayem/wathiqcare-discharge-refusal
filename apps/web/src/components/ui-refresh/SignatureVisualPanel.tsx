/**
 * SignatureVisualPanel
 * ------------------------------------------------------------
 * VISUAL SHELL ONLY. Renders the signature-pad layout:
 *
 *   - title + description
 *   - drawable canvas surface
 *   - clear button
 *   - eIDAS legal notice line (caller-supplied copy)
 *   - confirm button (caller-wired)
 *
 * Hard rule: this component must NOT generate the legal signature
 * payload, hash, timestamp, certificate, or audit event. Those
 * concerns remain in the existing signing pipeline. The parent owns:
 *
 *   - `hasSignature`           — boolean from its state
 *   - `onStrokeStart()`        — call when the user begins drawing
 *   - `onStrokeEnd(dataUrl?)`  — call when the user lifts; the data
 *                                URL is optional and is the parent's
 *                                responsibility to persist via the
 *                                existing API.
 *   - `onClear()`              — reset visual state in the parent
 *   - `onConfirm()`            — wired to the existing confirm API
 *
 * No defaults are provided for the action callbacks.
 */
"use client";

import { useRef } from "react";
import { Lock } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, rowDir } from "./_utils";

export interface SignatureVisualPanelProps {
  lang?: Lang;
  title: string;
  description: string;
  clearLabel: string;
  confirmLabel: string;
  legalNotice: string;
  placeholderHint: string;
  hasSignature: boolean;
  onStrokeStart: () => void;
  onStrokeEnd: (dataUrl?: string) => void;
  onClear: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  className?: string;
}

export function SignatureVisualPanel({
  lang = "en",
  title,
  description,
  clearLabel,
  confirmLabel,
  legalNotice,
  placeholderHint,
  hasSignature,
  onStrokeStart,
  onStrokeEnd,
  onClear,
  onConfirm,
  submitting = false,
  className,
}: SignatureVisualPanelProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        lang === "ar" ? "text-right" : "text-left",
        className,
      )}
    >
      <header
        className={cn(
          "flex flex-col gap-1",
          lang === "ar" ? "items-end" : "items-start",
        )}
      >
        <h1 className="text-xl font-bold text-[color:var(--wc-color-text)]">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-[color:var(--wc-color-text-muted)]">
          {description}
        </p>
      </header>

      <div
        ref={canvasRef}
        role="img"
        aria-label={hasSignature ? title : placeholderHint}
        className={cn(
          "relative aspect-[3/1] w-full rounded-[var(--wc-radius-md)] border-2 bg-[color:var(--wc-color-input-bg)]",
          hasSignature
            ? "border-[color:var(--wc-color-primary)]"
            : "border-dashed border-[color:var(--wc-color-border-strong)]",
        )}
        onMouseDown={onStrokeStart}
        onMouseUp={() => onStrokeEnd()}
        onTouchStart={onStrokeStart}
        onTouchEnd={() => onStrokeEnd()}
      >
        {!hasSignature ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="h-0.5 w-8 rounded bg-[color:var(--wc-color-text-muted)]/30" />
            <p className="text-xs text-[color:var(--wc-color-text-muted)]">
              {placeholderHint}
            </p>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg
              viewBox="0 0 300 120"
              className="h-full w-full opacity-70"
              aria-hidden
            >
              <path
                d="M 40 80 C 60 40, 80 90, 100 70 C 120 50, 130 85, 160 65 C 180 50, 195 80, 220 72 C 240 65, 250 75, 260 70"
                stroke="var(--wc-color-primary)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <div className="absolute bottom-8 left-8 right-8 h-px bg-[color:var(--wc-color-border)]" />
      </div>

      {hasSignature && (
        <button
          type="button"
          onClick={onClear}
          className="self-center text-sm text-[color:var(--wc-color-text-muted)] underline-offset-2 hover:underline"
        >
          {clearLabel}
        </button>
      )}

      <div
        className={cn(
          "flex items-start gap-2 text-xs text-[color:var(--wc-color-text-muted)]",
          rowDir(lang),
        )}
      >
        <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
        <span>{legalNotice}</span>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!hasSignature || submitting}
        className={cn(
          "mt-auto w-full rounded-[var(--wc-radius-md)] py-3.5 text-sm font-semibold transition-colors",
          hasSignature && !submitting
            ? "bg-[color:var(--wc-color-primary)] text-[color:var(--wc-color-primary-contrast)] hover:opacity-90"
            : "cursor-not-allowed bg-[color:var(--wc-color-surface-muted)] text-[color:var(--wc-color-text-muted)]",
        )}
      >
        {confirmLabel}
      </button>
    </section>
  );
}

export default SignatureVisualPanel;
