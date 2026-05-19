/**
 * Phase 12 — Enterprise UI primitives barrel.
 * Additive components. Do not re-export from this barrel into existing
 * production routes until Phase 12.5 wiring is approved.
 */
export { default as EnterpriseShell } from "./EnterpriseShell";
export type { EnterpriseShellProps } from "./EnterpriseShell";

export { default as EnterpriseSidebar } from "./EnterpriseSidebar";
export type {
  EnterpriseSidebarProps,
  EnterpriseSidebarSection,
  EnterpriseSidebarItem,
} from "./EnterpriseSidebar";

export { default as EnterpriseHeader } from "./EnterpriseHeader";
export type { EnterpriseHeaderProps } from "./EnterpriseHeader";

export { default as EnterpriseRibbon } from "./EnterpriseRibbon";
export type {
  EnterpriseRibbonProps,
  EnterpriseRibbonAction,
} from "./EnterpriseRibbon";

export { default as EnterpriseStatusPill } from "./EnterpriseStatusPill";
export type {
  EnterpriseStatusPillProps,
  EnterpriseStatus,
} from "./EnterpriseStatusPill";

export { default as EnterpriseSectionHeader } from "./EnterpriseSectionHeader";
export type { EnterpriseSectionHeaderProps } from "./EnterpriseSectionHeader";

export { default as EnterpriseCard } from "./EnterpriseCard";
export type { EnterpriseCardProps } from "./EnterpriseCard";
