"use client";

import type {
  ConsentSignerProgressItem,
  ConsentSignerStatus,
} from "./types";

export type ConsentSignersBarProps = {
  items: ConsentSignerProgressItem[];
  language: "en" | "ar";
  /** Optional click handler to allow stepping in preview only. */
  onSelect?: (step: ConsentSignerProgressItem["step"]) => void;
  activeStep?: ConsentSignerProgressItem["step"];
};

const STATUS_TONE: Record<ConsentSignerStatus, { bg: string; fg: string }> = {
  pending: { bg: "var(--wc-ent-state-neutral-bg)", fg: "var(--wc-ent-state-neutral-fg)" },
  "in-progress": { bg: "var(--wc-ent-state-info-bg)", fg: "var(--wc-ent-state-info-fg)" },
  complete: { bg: "var(--wc-ent-state-ok-bg)", fg: "var(--wc-ent-state-ok-fg)" },
  skipped: { bg: "var(--wc-ent-state-neutral-bg)", fg: "var(--wc-ent-fg-muted)" },
};

const STATUS_LABEL: Record<ConsentSignerStatus, { en: string; ar: string }> = {
  pending: { en: "Pending", ar: "بانتظار" },
  "in-progress": { en: "In progress", ar: "قيد التنفيذ" },
  complete: { en: "Complete", ar: "مكتمل" },
  skipped: { en: "Skipped", ar: "متخطى" },
};

/**
 * Dense 4-step signer progress bar. Reads the staged informed-consent
 * signer order (patient → witness → physician → OTP) at a glance.
 *
 * Stateless. Caller owns the model. Click handler optional.
 */
export default function ConsentSignersBar({
  items,
  language,
  onSelect,
  activeStep,
}: ConsentSignersBarProps) {
  const isAr = language === "ar";

  return (
    <ol
      className="flex w-full items-stretch gap-2"
      data-testid="consent-signers-bar"
    >
      {items.map((item, idx) => {
        const tone = STATUS_TONE[item.status];
        const isActive = activeStep === item.step;
        return (
          <li key={item.step} className="flex-1">
            <button
              type="button"
              onClick={onSelect ? () => onSelect(item.step) : undefined}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-start transition"
              style={{
                background: isActive ? "#ffffff" : tone.bg,
                color: tone.fg,
                border: isActive
                  ? "1px solid var(--wc-ent-state-info-fg)"
                  : "var(--wc-ent-border)",
                cursor: onSelect ? "pointer" : "default",
              }}
              data-step={item.step}
              data-status={item.status}
              data-active={isActive ? "true" : "false"}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  color: tone.fg,
                }}
              >
                {item.status === "complete" ? "✓" : idx + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-semibold">
                  {isAr ? item.label.ar : item.label.en}
                </span>
                <span
                  className="truncate text-[10px] uppercase tracking-wider"
                  style={{ color: "var(--wc-ent-fg-muted)" }}
                >
                  {isAr ? STATUS_LABEL[item.status].ar : STATUS_LABEL[item.status].en}
                  {item.actorName ? ` · ${item.actorName}` : ""}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
