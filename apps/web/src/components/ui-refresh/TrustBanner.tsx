/**
 * TrustBanner
 * ------------------------------------------------------------
 * "Secure encrypted link intended solely for you" pill used on
 * the patient landing screen. Mirrors the Figma SecureNoticeBadge
 * (design/figma/wathiqcare-v1.1/src/app/App.tsx ~L287).
 *
 * Pure visual. No links, no analytics, no PII.
 */
"use client";

import { Lock } from "lucide-react";
import type { Lang } from "./_utils";
import { cn, rowDir } from "./_utils";

export interface TrustBannerProps {
  lang?: Lang;
  /** Localised message — caller-owned, no hardcoded copy. */
  message: string;
  className?: string;
}

export function TrustBanner({ lang = "en", message, className }: TrustBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--wc-radius-md)] border px-3 py-2",
        "border-[color:var(--wc-color-border-strong)] bg-[color:var(--wc-color-surface-secondary)]",
        rowDir(lang),
        className,
      )}
      role="status"
    >
      <Lock
        size={13}
        className="shrink-0 text-[color:var(--wc-color-primary)]"
        aria-hidden
      />
      <span className="text-xs font-medium text-[color:var(--wc-color-primary)]">
        {message}
      </span>
    </div>
  );
}

export default TrustBanner;
