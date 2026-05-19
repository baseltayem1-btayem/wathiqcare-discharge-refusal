const createEnum = <T extends string = string>() =>
  new Proxy({} as Record<string, T>, {
    get: (_target, property) => String(property) as T,
  });

export const ConsentAlertLevel = createEnum();
export type ConsentAlertLevel = string;

export const ConsentCommitteeType = createEnum();
export type ConsentCommitteeType = string;

export const BackupJobStatus = createEnum();
export type BackupJobStatus = string;

export const BillingInterval = createEnum();
export type BillingInterval = string;

export const CaseStatus = createEnum();
export type CaseStatus = string;

export const CaseType = createEnum();
export type CaseType = string;

export const ConsentDocumentStatus = createEnum();
export type ConsentDocumentStatus = string;

export const ConsentEvidenceCopyType = createEnum();
export type ConsentEvidenceCopyType = string;

export const ConsentMethod = createEnum();
export type ConsentMethod = string;

export const ConsentReviewDecision = createEnum();
export type ConsentReviewDecision = string;

export const ConsentRiskClass = createEnum();
export type ConsentRiskClass = string;

export const ConsentRiskSeverity = createEnum();
export type ConsentRiskSeverity = string;

export const ConsentSectionKind = createEnum();
export type ConsentSectionKind = string;

export const ConsentSignatureRole = createEnum();
export type ConsentSignatureRole = string;

export const ConsentTemplateStatus = createEnum();
export type ConsentTemplateStatus = string;

export const DataClassification = createEnum();
export type DataClassification = string;

export const DocumentStatus = createEnum();
export type DocumentStatus = string;

export const DocumentType = createEnum();
export type DocumentType = string;

export const DsrRequestStatus = createEnum();
export type DsrRequestStatus = string;

export const DsrRequestType = createEnum();
export type DsrRequestType = string;

export const EscalationLevel = createEnum();
export type EscalationLevel = string;

export const FeatureFlagScope = createEnum();
export type FeatureFlagScope = string;

export const IncidentSeverity = createEnum();
export type IncidentSeverity = string;

export const IncidentStatus = createEnum();
export type IncidentStatus = string;

export const InvitationStatus = createEnum();
export type InvitationStatus = string;

export const InvoiceStatus = createEnum();
export type InvoiceStatus = string;

export const LegalReadinessStatus = createEnum();
export type LegalReadinessStatus = string;

export const MembershipRole = createEnum();
export type MembershipRole = string;

export const MembershipStatus = createEnum();
export type MembershipStatus = string;

export const NotificationChannel = createEnum();
export type NotificationChannel = string;

export const NotificationStatus = createEnum();
export type NotificationStatus = string;

export const OperationDepartment = createEnum();
export type OperationDepartment = string;

export const OperationPriority = createEnum();
export type OperationPriority = string;

export const PlanCode = createEnum();
export type PlanCode = string;

export const PromissoryNoteStatus = createEnum();
export type PromissoryNoteStatus = string;

export const RetentionActionStatus = createEnum();
export type RetentionActionStatus = string;

export const SlaState = createEnum();
export type SlaState = string;

export const SubscriberModuleAccessStatus = createEnum();
export type SubscriberModuleAccessStatus = string;

export const SubscriptionEventType = createEnum();
export type SubscriptionEventType = string;

export const SubscriptionStatus = createEnum();
export type SubscriptionStatus = string;

export const TenantRoleStatus = createEnum();
export type TenantRoleStatus = string;

export const UsageMetric = createEnum();
export type UsageMetric = string;

export const UserType = createEnum();
export type UserType = string;
