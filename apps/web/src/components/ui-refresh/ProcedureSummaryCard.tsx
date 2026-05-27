/**
 * ProcedureSummaryCard
 * ------------------------------------------------------------
 * Landing-screen summary card showing consent type, physician
 * and facility. Pure presentational; caller supplies localised
 * strings.
 *
 * Mirrors Figma LandingScreen consent-info card (App.tsx ~L432).
 */
"use client";

import { Building2, Stethoscope } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, rowDir, textAlign } from "./_utils";

export interface ProcedureSummaryCardProps {
  lang?: Lang;
  /** Localised "Consent Type" / "نوع الموافقة" label. */
  consentTypeLabel: string;
  /** Display name of the consent type (e.g. "Laparoscopic Cholecystectomy"). */
  consentTypeValue: string;
  /** Physician line (e.g. "Dr. Sara Al-Qahtani — General Surgery"). */
  physician?: string;
  /** Facility line (e.g. "King Fahd Specialist Hospital"). */
  facility?: string;
  className?: string;
}

export function ProcedureSummaryCard({
  lang = "en",
  consentTypeLabel,
  consentTypeValue,
  physician,
  facility,
  className,
}: ProcedureSummaryCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-[var(--wc-radius-md)] border bg-[color:var(--wc-color-surface)] p-4 shadow-[var(--wc-shadow-sm)]",
        "border-[color:var(--wc-color-border)]",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-1", textAlign(lang))}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--wc-color-text-muted)]">
          {consentTypeLabel}
        </p>
        <p className="text-sm font-semibold leading-snug text-[color:var(--wc-color-text)]">
          {consentTypeValue}
        </p>
      </div>

      {(physician || facility) && (
        <div className="h-px bg-[color:var(--wc-color-border)]" />
      )}

      {physician && (
        <div className={cn("flex items-center gap-2", rowDir(lang))}>
          <Stethoscope
            size={14}
            className="shrink-0 text-[color:var(--wc-color-text-muted)]"
            aria-hidden
          />
          <p className="text-xs text-[color:var(--wc-color-text-muted)]">
            {physician}
          </p>
        </div>
      )}

      {facility && (
        <div className={cn("flex items-center gap-2", rowDir(lang))}>
          <Building2
            size={14}
            className="shrink-0 text-[color:var(--wc-color-text-muted)]"
            aria-hidden
          />
          <p className="text-xs text-[color:var(--wc-color-text-muted)]">
            {facility}
          </p>
        </div>
      )}
    </article>
  );
}

export default ProcedureSummaryCard;
