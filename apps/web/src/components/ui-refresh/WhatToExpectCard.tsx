/**
 * WhatToExpectCard
 * ------------------------------------------------------------
 * Patient-friendly "what to expect during/after the procedure"
 * card. Renders an ordered list of plain-language items.
 *
 * IMPORTANT: This component is a presentational shell only. It
 * deliberately exposes no medical-advice copy — every item is
 * supplied by the caller, which is responsible for sourcing the
 * text from the approved, hash-validated consent template.
 */
"use client";

import { ClipboardList } from "lucide-react";
import type { Lang } from "./_utils";
import { EducationCard } from "./EducationCard";
import { cn, rowDir } from "./_utils";

export interface WhatToExpectItem {
  /** Stable identifier (e.g. template item id). */
  id: string;
  /** Already-localised plain-language description. */
  text: string;
}

export interface WhatToExpectCardProps {
  lang?: Lang;
  title: string;
  items: ReadonlyArray<WhatToExpectItem>;
  className?: string;
}

export function WhatToExpectCard({
  lang = "en",
  title,
  items,
  className,
}: WhatToExpectCardProps) {
  return (
    <EducationCard
      lang={lang}
      title={title}
      tone="info"
      icon={<ClipboardList size={13} className="text-blue-600" />}
      className={className}
    >
      <ol className="flex list-none flex-col gap-2 p-0">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={cn("flex items-start gap-2", rowDir(lang))}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold",
                "bg-[color:var(--wc-color-surface-secondary)] text-[color:var(--wc-color-primary)]",
              )}
            >
              {index + 1}
            </span>
            <span className="text-[color:var(--wc-color-text)]">
              {item.text}
            </span>
          </li>
        ))}
      </ol>
    </EducationCard>
  );
}

export default WhatToExpectCard;
