import type { Prisma } from "@prisma/client";

export type SignatureMethod = "SMS_OTP" | "TABLET_SIGNATURE" | "NAFATH";

export type SignatureEvidence = {
  signature_record: string;
  verification_timestamp: string;
  verification_method: SignatureMethod;
  ip_address: string | null;
  device_info: string | null;
};

export type LegalEvidenceChain = {
  document_hash: string;
  audit_log: Array<{
    action: string;
    at: string;
    actor_user_id: string;
  }>;
  signature_evidence: SignatureEvidence;
};

export type DocumentTemplateKey =
  | "refusal_of_discharge"
  | "financial_liability_notice"
  | "home_care_agreement"
  | "medical_equipment_agreement"
  | "roi_authorization";

export type GenerateDocumentInput = {
  tenantId: string;
  caseId?: string;
  actorUserId: string;
  title: string;
  titleAr?: string;
  templateKey: DocumentTemplateKey;
  payload: Prisma.InputJsonValue;
  signatureMethod: SignatureMethod;
  signatureRecord: string;
  requestIp: string | null;
  deviceInfo: string | null;
};

export type SubscriptionGuard = {
  tenantId: string;
  plan: string;
  status: string;
  user_limit: number;
  case_limit: number;
  signature_quota: number;
};
