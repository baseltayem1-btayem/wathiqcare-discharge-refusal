// =====================================================================
// TEMPORARY COMPATIBILITY SHIM — DO NOT EXPAND.
// ---------------------------------------------------------------------
// Purpose: widens Prisma enums to `string` so existing string-typed
// values (e.g. role/status normalizers, JSON payloads from external
// systems) can be passed to Prisma without explicit casts during the
// current production stabilization window.
//
// Side-effect: this also widens *return* types from helpers that
// produce real enum members (e.g. `userTypeForUserRole`) to `string`,
// which then conflicts with Prisma's `update`/`create` argument types
// under strict TypeScript checking (`next build --webpack`).
//
// Current workaround: Vercel build runs via Turbopack (`next build`),
// which respects `next.config.js` -> `typescript.ignoreBuildErrors: true`.
// The shim therefore does not block deploys today.
//
// Scheduled cleanup: see `CLEANUP_TYPING_STRICT_MODE.md` (Phase 12).
// Remove this file in full and replace with proper enum imports +
// narrow casts at JSON/string boundaries.
// =====================================================================
import "@prisma/client";

declare module "@prisma/client" {
  export const BackupJobStatus: Record<string, string>;
  export type BackupJobStatus = string;

  export const BillingInterval: Record<string, string>;
  export type BillingInterval = string;

  export const CaseStatus: Record<string, string>;
  export type CaseStatus = string;

  export const CaseType: Record<string, string>;
  export type CaseType = string;

  export const ConsentMethod: Record<string, string>;
  export type ConsentMethod = string;

  export const ConsentSectionKind: Record<string, string>;
  export type ConsentSectionKind = string;

  export const ConsentTemplateStatus: Record<string, string>;
  export type ConsentTemplateStatus = string;

  export const DataClassification: Record<string, string>;
  export type DataClassification = string;

  export const DocumentStatus: Record<string, string>;
  export type DocumentStatus = string;

  export const DocumentType: Record<string, string>;
  export type DocumentType = string;

  export const DsrRequestStatus: Record<string, string>;
  export type DsrRequestStatus = string;

  export const DsrRequestType: Record<string, string>;
  export type DsrRequestType = string;

  export const FeatureFlagScope: Record<string, string>;
  export type FeatureFlagScope = string;

  export const IncidentSeverity: Record<string, string>;
  export type IncidentSeverity = string;

  export const IncidentStatus: Record<string, string>;
  export type IncidentStatus = string;

  export const InvitationStatus: Record<string, string>;
  export type InvitationStatus = string;

  export const InvoiceStatus: Record<string, string>;
  export type InvoiceStatus = string;

  export const LegalReadinessStatus: Record<string, string>;
  export type LegalReadinessStatus = string;

  export const MembershipRole: Record<string, string>;
  export type MembershipRole = string;

  export const MembershipStatus: Record<string, string>;
  export type MembershipStatus = string;

  export const OperationPriority: Record<string, string>;
  export type OperationPriority = string;

  export const PlanCode: Record<string, string>;
  export type PlanCode = string;

  export const PromissoryNoteStatus: Record<string, string>;
  export type PromissoryNoteStatus = string;

  export const RetentionActionStatus: Record<string, string>;
  export type RetentionActionStatus = string;

  export const SlaState: Record<string, string>;
  export type SlaState = string;

  export const SubscriberModuleAccessStatus: Record<string, string>;
  export type SubscriberModuleAccessStatus = string;

  export const SubscriptionStatus: Record<string, string>;
  export type SubscriptionStatus = string;

  export const TenantRoleStatus: Record<string, string>;
  export type TenantRoleStatus = string;

  export const UsageMetric: Record<string, string>;
  export type UsageMetric = string;

  export const UserType: Record<string, string>;
  export type UserType = string;
}