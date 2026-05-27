/**
 * PatientHeroSection
 * ------------------------------------------------------------
 * Top-of-page hero block on the patient landing screen.
 *
 *   - Icon tile (calm navy)
 *   - Title
 *   - Lead paragraph
 *
 * Mirrors Figma LandingScreen header (App.tsx ~L420).
 * Pure presentational. Caller supplies all strings (no medical
 * copy is hardcoded so legal wording cannot drift here).
 */
"use client";

import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, textAlign } from "./_utils";

export interface PatientHeroSectionProps {
  lang?: Lang;
  title: string;
  description: string;
  /** Optional icon override. Defaults to <FileText/>. */
  icon?: ReactNode;
  className?: string;
}

export function PatientHeroSection({
  lang = "en",
  title,
  description,
  icon,
  className,
}: PatientHeroSectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-1",
        lang === "ar" ? "items-end" : "items-start",
        textAlign(lang),
        className,
      )}
    >
      <div
        className={cn(
          "mb-1 flex h-12 w-12 items-center justify-center rounded-[var(--wc-radius-lg)]",
          "bg-[color:var(--wc-color-primary)]",
        )}
        aria-hidden
      >
        {icon ?? (
          <FileText
            size={22}
            className="text-[color:var(--wc-color-primary-contrast)]"
          />
        )}
      </div>
      <h1 className="text-xl font-bold leading-tight text-[color:var(--wc-color-text)]">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-[color:var(--wc-color-text-muted)]">
        {description}
      </p>
    </section>
  );
}

export default PatientHeroSection;
