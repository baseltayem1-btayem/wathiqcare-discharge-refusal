/**
 * Legal-Grade Consent — Risk Visualization Module
 *
 * Renders consent risks with severity tier styling.
 * Pure, deterministic HTML generation.
 */

import type { DynamicConsentRiskItem } from "@/modules/consent-engine/engine/types";
import { CONSENT_COLORS, resolveSeverityToken } from "@/modules/consent-engine/design-system";
import { escapeHtml } from "@/modules/consent-engine/legal-grade/escape";

function severityClass(severity: string): string {
  const token = resolveSeverityToken(severity);
  if (token === "severityCritical") return "lg-sev-critical";
  if (token === "severityHigh") return "lg-sev-high";
  if (token === "severityModerate") return "lg-sev-moderate";
  return "lg-sev-low";
}

function severityLabel(severity: string): string {
  const token = resolveSeverityToken(severity);
  return CONSENT_COLORS[token].label;
}

export function renderRiskItem(
  risk: DynamicConsentRiskItem,
  options: { showEnglish: boolean; showArabic: boolean },
): string {
  const cls = severityClass(risk.severity);
  const label = severityLabel(risk.severity);
  const titleEn = options.showEnglish
    ? `<span class="lg-risk-title">${escapeHtml(risk.titleEn)}</span>`
    : "";
  const titleAr = options.showArabic
    ? `<span class="lg-risk-title-ar">${escapeHtml(risk.titleAr)}</span>`
    : "";
  const descEn = options.showEnglish
    ? `<p class="lg-risk-desc">${escapeHtml(risk.descriptionEn)}</p>`
    : "";
  const descAr = options.showArabic
    ? `<p class="lg-risk-desc-ar">${escapeHtml(risk.descriptionAr)}</p>`
    : "";
  return `
    <li class="lg-risk ${cls}">
      <div class="lg-risk-head">
        <div>${titleEn}${titleEn && titleAr ? " &middot; " : ""}${titleAr}</div>
        <span class="lg-risk-severity">${escapeHtml(label)}</span>
      </div>
      ${descEn}
      ${descAr}
    </li>
  `;
}

export function renderRiskList(
  risks: DynamicConsentRiskItem[],
  options: { showEnglish: boolean; showArabic: boolean },
): string {
  if (risks.length === 0) {
    return `<p class="lg-copy-en" style="color:var(--lg-color-text-muted)">No specialty-specific risks were attached to this preview.</p>`;
  }
  // Sort: critical first, then high, moderate, low (preserves catalog order within bucket).
  const weight: Record<string, number> = { critical: 0, high: 1, medium: 2, moderate: 2, low: 3 };
  const sorted = [...risks].sort(
    (a, b) =>
      (weight[a.severity?.toLowerCase()] ?? 4) -
      (weight[b.severity?.toLowerCase()] ?? 4),
  );
  return `<ul class="lg-risk-list">${sorted.map((r) => renderRiskItem(r, options)).join("\n")}</ul>`;
}
