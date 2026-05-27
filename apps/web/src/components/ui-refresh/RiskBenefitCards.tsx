/**
 * RiskBenefitCards
 * ------------------------------------------------------------
 * Side-by-side (stacks on mobile) benefits and risks summary.
 * Each list item is supplied by the caller; nothing about the
 * medical content is hardcoded here.
 *
 * Mirrors Figma EducationScreen benefits/risks cards
 * (App.tsx ~L500–L545).
 */
"use client";

import { AlertCircle, AlertTriangle, Check, CheckCircle } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, rowDir } from "./_utils";
import { EducationCard } from "./EducationCard";

export interface RiskBenefitItem {
  id: string;
  text: string;
}

export interface RiskBenefitCardsProps {
  lang?: Lang;
  benefitsTitle: string;
  risksTitle: string;
  benefits: ReadonlyArray<RiskBenefitItem>;
  risks: ReadonlyArray<RiskBenefitItem>;
  className?: string;
}

export function RiskBenefitCards({
  lang = "en",
  benefitsTitle,
  risksTitle,
  benefits,
  risks,
  className,
}: RiskBenefitCardsProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      <EducationCard
        lang={lang}
        title={benefitsTitle}
        tone="success"
        icon={<Check size={13} className="text-emerald-600" />}
      >
        <ul className="flex list-none flex-col gap-2 p-0">
          {benefits.map((item) => (
            <li
              key={item.id}
              className={cn("flex items-start gap-2", rowDir(lang))}
            >
              <CheckCircle
                size={14}
                className="mt-0.5 shrink-0 text-emerald-500"
                aria-hidden
              />
              <span className="text-[color:var(--wc-color-text)]">
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      </EducationCard>

      <EducationCard
        lang={lang}
        title={risksTitle}
        tone="warning"
        icon={<AlertTriangle size={13} className="text-amber-600" />}
      >
        <ul className="flex list-none flex-col gap-2 p-0">
          {risks.map((item) => (
            <li
              key={item.id}
              className={cn("flex items-start gap-2", rowDir(lang))}
            >
              <AlertCircle
                size={14}
                className="mt-0.5 shrink-0 text-amber-500"
                aria-hidden
              />
              <span className="text-[color:var(--wc-color-text)]">
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      </EducationCard>
    </div>
  );
}

export default RiskBenefitCards;
