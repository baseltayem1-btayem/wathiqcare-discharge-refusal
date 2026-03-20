/**
 * @wathiqcare/ui — Shared React component stubs
 *
 * Hospital-grade, mobile-first, Arabic RTL.
 * Full implementation lives in apps/web/src/components/design-system.
 * Import from there directly; this package is the future extraction point.
 */

// Re-export primitive types used across apps
export type { ButtonHTMLAttributes } from "react";

/** Arabic RTL direction helper */
export const RTL_DIR = "rtl" as const;
export const LTR_DIR = "ltr" as const;
