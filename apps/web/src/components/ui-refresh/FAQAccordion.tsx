/**
 * FAQAccordion
 * ------------------------------------------------------------
 * Accessible Q&A accordion for the education screen.
 *
 * Keyboard: each header is a native <button> so tab order /
 * Enter / Space work out of the box. `aria-expanded` and
 * `aria-controls` reflect open state.
 *
 * Mirrors Figma FAQ card (App.tsx ~L560).
 */
"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, rowDir, textAlign } from "./_utils";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  lang?: Lang;
  title?: string;
  items: ReadonlyArray<FAQItem>;
  /** Optional controlled open id; if omitted the component manages its own state. */
  openId?: string | null;
  onOpenChange?: (id: string | null) => void;
  className?: string;
}

export function FAQAccordion({
  lang = "en",
  title,
  items,
  openId,
  onOpenChange,
  className,
}: FAQAccordionProps) {
  const uid = useId();
  const [internalOpen, setInternalOpen] = useState<string | null>(null);
  const controlled = openId !== undefined;
  const current = controlled ? openId ?? null : internalOpen;
  const setOpen = (next: string | null) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--wc-radius-md)] border bg-[color:var(--wc-color-surface)] shadow-[var(--wc-shadow-sm)]",
        "border-[color:var(--wc-color-border)]",
        className,
      )}
    >
      {title && (
        <header
          className={cn(
            "border-b border-[color:var(--wc-color-border)] px-4 py-3",
            textAlign(lang),
          )}
        >
          <h2 className="text-sm font-semibold text-[color:var(--wc-color-text)]">
            {title}
          </h2>
        </header>
      )}
      {items.map((item) => {
        const isOpen = current === item.id;
        const panelId = `${uid}-${item.id}`;
        return (
          <div
            key={item.id}
            className="border-b border-[color:var(--wc-color-border)] last:border-0"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : item.id)}
              {...({ "aria-expanded": isOpen } as { "aria-expanded": boolean })}
              aria-controls={panelId}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-3 transition-colors hover:bg-[color:var(--wc-color-surface-muted)]",
                "focus:outline-none focus-visible:shadow-[var(--wc-focus-ring)]",
                rowDir(lang),
                textAlign(lang),
              )}
            >
              <span className="flex-1 text-sm font-medium text-[color:var(--wc-color-text)]">
                {item.question}
              </span>
              <ChevronRight
                size={14}
                className={cn(
                  "shrink-0 text-[color:var(--wc-color-text-muted)] transition-transform",
                  isOpen ? "rotate-90" : "",
                  lang === "ar" && !isOpen ? "rotate-180" : "",
                )}
                aria-hidden
              />
            </button>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                className={cn(
                  "px-4 pb-3 text-sm leading-relaxed text-[color:var(--wc-color-text-muted)]",
                  textAlign(lang),
                )}
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default FAQAccordion;
