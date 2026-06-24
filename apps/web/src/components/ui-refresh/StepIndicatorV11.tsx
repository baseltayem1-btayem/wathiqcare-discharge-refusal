/**
 * StepIndicatorV11
 * ------------------------------------------------------------
 * Visual step pill row used in the v1.1 patient header.
 *
 * Pure presentational — receives `current` and `total` from the
 * parent that owns the workflow state machine. No side effects.
 *
 * Mirrors the Figma export's StepIndicator pattern
 * (design/figma/wathiqcare-v1.1/src/app/App.tsx ~L262).
 */
"use client";

import type { Lang } from "./_utils";
import { cn, rowDir } from "./_utils";

export interface StepIndicatorV11Props {
  current: number;
  total: number;
  lang?: Lang;
  /** Visible step counter label. */
  stepLabel?: string;
  ofLabel?: string;
  className?: string;
}

export function StepIndicatorV11({
  current,
  total,
  lang = "en",
  stepLabel,
  ofLabel,
  className,
}: StepIndicatorV11Props) {
  const safeCurrent = Math.max(1, Math.min(current, total));
  const tStep = stepLabel ?? (lang === "ar" ? "خطوة" : "Step");
  const tOf = ofLabel ?? (lang === "ar" ? "من" : "of");
  const ariaLabel = `${tStep} ${safeCurrent} ${tOf} ${total}`;
  const displayLabel = lang === "ar"
    ? `${safeCurrent} ${tOf} ${total}`
    : `${tStep} ${safeCurrent} ${tOf} ${total}`;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        rowDir(lang),
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => {
          const past = i < safeCurrent - 1;
          const active = i === safeCurrent - 1;
          return (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                past
                  ? "w-6 bg-[color:var(--wc-color-primary)]"
                  : active
                  ? "w-8 bg-[color:var(--wc-color-primary)]"
                  : "w-4 bg-[color:var(--wc-color-border-strong)]",
              )}
            />
          );
        })}
      </div>
      <span className="font-mono text-xs tabular-nums text-[color:var(--wc-color-text-muted)]">
        {displayLabel}
      </span>
    </div>
  );
}

export default StepIndicatorV11;
