/**
 * Legal-Grade Consent Design System — Color Tokens
 *
 * Conservative, print-safe, grayscale-friendly palette designed for
 * medico-legal documents. Avoids saturated/UI-like colors.
 */

export const CONSENT_COLORS = {
  // Surfaces
  pageBackground: "#f4f5f7",
  documentSurface: "#ffffff",
  documentBorder: "#d6dbe2",
  documentShadow: "0 1px 0 rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.06)",

  // Text
  textPrimary: "#0f172a",
  textSecondary: "#3b4658",
  textMuted: "#6b7589",
  textInverse: "#ffffff",

  // Rule lines
  ruleStrong: "#0f172a",
  ruleMedium: "#cbd2dc",
  ruleSoft: "#e6eaf0",

  // Brand (neutral medico-legal)
  brandPrimary: "#0b3d63", // deep clinical navy
  brandAccent: "#1f6f8b", // muted teal accent
  brandInk: "#0a1f33",

  // Severity palette (print + grayscale safe)
  severityLow: { bg: "#f4f7f5", border: "#cfd8d3", text: "#1f3a2e", label: "LOW" },
  severityModerate: { bg: "#f6f3ec", border: "#d8cdb4", text: "#5a4318", label: "MODERATE" },
  severityHigh: { bg: "#f5eee9", border: "#d8b9a8", text: "#6b2e16", label: "HIGH" },
  severityCritical: { bg: "#efe4e1", border: "#a86658", text: "#5c1a10", label: "CRITICAL" },

  // Audit / forensic footer
  auditBackground: "#f7f9fb",
  auditBorder: "#c9d2dd",
  auditMono: "#0f172a",
} as const;

export type ConsentColors = typeof CONSENT_COLORS;

export type ConsentSeverityKey =
  | "severityLow"
  | "severityModerate"
  | "severityHigh"
  | "severityCritical";

export function resolveSeverityToken(
  severity: string,
): ConsentSeverityKey {
  const normalized = (severity || "").toLowerCase();
  if (normalized === "critical") return "severityCritical";
  if (normalized === "high") return "severityHigh";
  if (normalized === "moderate" || normalized === "medium") return "severityModerate";
  return "severityLow";
}
