/**
 * EducationCard
 * ------------------------------------------------------------
 * Generic icon + heading + body card used as the layout primitive
 * for the education screen ("What is", "Alternatives", …).
 *
 * Pure presentational. The icon tint follows the `tone` prop and
 * resolves through the scoped token layer.
 *
 * Mirrors Figma EducationScreen cards (App.tsx ~L490).
 */
"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, rowDir, textAlign } from "./_utils";

export type EducationCardTone =
  | "info"
  | "success"
  | "warning"
  | "neutral"
  | "accent";

const toneClasses: Record<EducationCardTone, { bg: string; fg: string }> = {
  info: { bg: "bg-blue-100", fg: "text-blue-600" },
  success: { bg: "bg-emerald-100", fg: "text-emerald-600" },
  warning: { bg: "bg-amber-100", fg: "text-amber-600" },
  neutral: { bg: "bg-slate-100", fg: "text-slate-600" },
  accent: { bg: "bg-purple-100", fg: "text-purple-600" },
};

export interface EducationCardProps {
  lang?: Lang;
  title: string;
  tone?: EducationCardTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function EducationCard({
  lang = "en",
  title,
  tone = "info",
  icon,
  children,
  className,
}: EducationCardProps) {
  const t = toneClasses[tone];
  return (
    <section
      className={cn(
        "flex flex-col gap-2 rounded-[var(--wc-radius-md)] border p-4 shadow-[var(--wc-shadow-sm)]",
        "border-[color:var(--wc-color-border)] bg-[color:var(--wc-color-surface)]",
        className,
      )}
    >
      <header className={cn("flex items-center gap-2", rowDir(lang))}>
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded",
            t.bg,
          )}
          aria-hidden
        >
          {icon ?? <Info size={13} className={t.fg} />}
        </div>
        <h2 className="text-sm font-semibold text-[color:var(--wc-color-text)]">
          {title}
        </h2>
      </header>
      <div
        className={cn(
          "text-sm leading-relaxed text-[color:var(--wc-color-text-muted)]",
          textAlign(lang),
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default EducationCard;
