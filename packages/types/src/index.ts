// ─────────────────────────────────────────────────────────────────────
// @wathiqcare/types — Discharge Legal Workflow Engine
// All shared TypeScript types consumed by apps/web, packages/sdk, and
// any future integrator. Keep this file the single source of truth.
// ─────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────

export type WorkflowStatus =
    | "session_created"
    | "notification_sent"
    | "patient_opened_link"
    | "notice_viewed"
    | "form_sequence_started"
    | "home_care_reviewed"
    | "equipment_reviewed"
    | "refusal_reviewed"
    | "payment_pending"
    | "payment_completed"
    | "signature_started"
    | "signature_completed"
    | "pdf_generated"
    | "workflow_completed";

export type AccessStatus = "pending" | "opened" | "verified" | "expired" | "locked";

export type DocumentType =
    | "discharge_notice_acknowledgment"
    | "home_care_agreement"
    | "equipment_receipt_and_training_acknowledgment"
    | "refusal_of_discharge_and_financial_liability_acknowledgment";

export type DocumentStatus = "draft" | "pending_signature" | "signed" | "pdf_ready" | "archived";

export type SignerRole = "patient" | "guardian" | "representative";

export type NotificationChannel = "sms" | "email";
export type NotificationStatus = "queued" | "sent" | "delivered" | "failed";

export type PaymentStatus = "pending" | "checkout_created" | "completed" | "failed" | "refunded";
export type PaymentPurpose = "financial_liability" | "equipment_deposit";

export type AuditEventType =
    | "session_created"
    | "sms_queued"
    | "sms_sent"
    | "sms_failed"
    | "email_sent"
    | "token_accessed"
    | "token_access_denied"
    | "otp_verified"
    | "notice_viewed"
    | "form_viewed"
    | "form_acknowledged"
    | "payment_session_created"
    | "payment_completed"
    | "signature_started"
    | "signature_completed"
    | "pdf_generation_started"
    | "pdf_generated"
    | "workflow_completed";

export type ActorType = "patient" | "admin" | "system" | "emr";

export type SourceSystem = "emr" | "admin_manual" | "api";

// ── Core Domain Types ─────────────────────────────────────────────────

export interface WorkflowFlags {
    standard: boolean;
    homeCare: boolean;
    equipment: boolean;
    refusal: boolean;
}

export interface Patient {
    id: string;
    externalPatientId?: string;
    fullNameAr: string;
    fullNameEn?: string;
    mobile: string;
    email?: string;
    nationalId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Encounter {
    id: string;
    externalEncounterId?: string;
    patientId: string;
    mrn?: string;
    dischargeOrderIssuedAt?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface DischargeSession {
    id: string;
    patientId: string;
    encounterId: string;
    tokenExpiresAt: string;
    accessStatus: AccessStatus;
    workflowStatus: WorkflowStatus;
    routingFlags: WorkflowFlags;
    initiatedByUserId?: string;
    sourceSystem: SourceSystem;
    openedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
    // Relations (populated on detail views)
    patient?: Patient;
    encounter?: Encounter;
    documents?: DischargeDocument[];
    notifications?: Notification[];
    payments?: Payment[];
    auditLogs?: AuditLog[];
}

export interface DischargeDocument {
    id: string;
    sessionId: string;
    documentType: DocumentType;
    documentVersion: string;
    language: "ar" | "en";
    contentSnapshot?: Record<string, unknown>;
    renderedHtml?: string;
    pdfUrl?: string;
    pdfHashSha256?: string;
    status: DocumentStatus;
    signedAt?: string;
    createdAt: string;
    updatedAt: string;
    signature?: Signature;
}

export interface Signature {
    id: string;
    sessionId: string;
    documentId: string;
    signerName: string;
    signerRole: SignerRole;
    signatureStorageUrl?: string;
    signatureHash: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    signedAt: string;
    createdAt: string;
}

export interface AuditLog {
    id: string;
    sessionId: string;
    eventType: AuditEventType;
    eventTime: string;
    actorType: ActorType;
    actorId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface Notification {
    id: string;
    sessionId: string;
    channel: NotificationChannel;
    provider: string;
    recipient: string;
    templateKey: string;
    messageBody: string;
    providerMessageId?: string;
    deliveryStatus: NotificationStatus;
    sentAt?: string;
    deliveredAt?: string;
    failedAt?: string;
    failureReason?: string;
    createdAt: string;
}

export interface Payment {
    id: string;
    sessionId: string;
    paymentPurpose: PaymentPurpose;
    provider: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    providerReference?: string;
    checkoutUrl?: string;
    paidAt?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface EquipmentItem {
    id: string;
    sessionId: string;
    itemName: string;
    itemCode?: string;
    quantity: number;
    trainingRequired: boolean;
    returnRequired: boolean;
    depositRequired: boolean;
    depositAmount?: number;
    createdAt: string;
}

export interface HomeCarePlan {
    id: string;
    sessionId: string;
    providerName: string;
    serviceSummary: string;
    startDate?: string;
    notes?: string;
    createdAt: string;
}

export interface RefusalLiability {
    id: string;
    sessionId: string;
    estimatedCost?: number;
    liabilityTerms: string;
    requiresPayment: boolean;
    createdAt: string;
}

// ── API Request / Response DTOs ───────────────────────────────────────

export interface CreateSessionRequest {
    patientId: string;
    encounterId: string;
    phone: string;
    email?: string;
    flags: WorkflowFlags;
    paymentRequired?: boolean;
    paymentAmount?: number;
    equipmentItems?: Omit<EquipmentItem, "id" | "sessionId" | "createdAt">[];
    homeCarePlan?: Omit<HomeCarePlan, "id" | "sessionId" | "createdAt"> | null;
    liabilityTerms?: string | null;
}

export interface CreateSessionResponse {
    sessionId: string;
    secureUrl: string;
    tokenExpiresAt: string;
}

export interface PublicSessionPayload {
    sessionId: string;
    patientFullNameAr: string;
    encounterMrn?: string;
    workflowStatus: WorkflowStatus;
    accessStatus: AccessStatus;
    routingFlags: WorkflowFlags;
    workflowSteps: WorkflowStep[];
    currentStep: string;
    documents: DischargeDocument[];
    homeCarePlan?: HomeCarePlan;
    equipmentItems?: EquipmentItem[];
    refusalLiability?: RefusalLiability;
    payment?: Payment;
    tokenExpiresAt: string;
}

export interface WorkflowStep {
    key: string;
    labelAr: string;
    labelEn: string;
    status: "pending" | "current" | "completed" | "skipped";
    order: number;
}

export interface VerifyOtpRequest {
    otp: string;
}

export interface FormAcknowledgmentRequest {
    formType: DocumentType;
    acknowledged: boolean;
    metadata?: Record<string, unknown>;
}

export interface SignatureSubmissionRequest {
    signerName: string;
    signerRole: SignerRole;
    signatureDataUrl: string;
    consentAccepted: boolean;
}

export interface SignatureSubmissionResponse {
    signatureId: string;
    documentId: string;
    pdfGenerationQueued: boolean;
}

export interface CreatePaymentSessionRequest {
    method: "card" | "bank_transfer";
}

export interface CreatePaymentSessionResponse {
    paymentId: string;
    checkoutUrl: string;
    provider: string;
}

// ── Admin DTOs ────────────────────────────────────────────────────────

export interface AdminSessionsFilter {
    status?: WorkflowStatus;
    dateFrom?: string;
    dateTo?: string;
    patientName?: string;
    encounterId?: string;
    page?: number;
    limit?: number;
}

export interface AdminSessionsResponse {
    items: DischargeSession[];
    total: number;
    page: number;
    limit: number;
}

// ── Integration DTOs ──────────────────────────────────────────────────

export interface EmrDischargeOrderIssuedRequest {
    externalPatientId: string;
    externalEncounterId: string;
    patientFullNameAr: string;
    patientMobile: string;
    patientEmail?: string;
    mrn?: string;
    flags: WorkflowFlags;
    homeCarePlan?: Omit<HomeCarePlan, "id" | "sessionId" | "createdAt"> | null;
    equipmentItems?: Omit<EquipmentItem, "id" | "sessionId" | "createdAt">[];
    liabilityTerms?: string | null;
    paymentRequired?: boolean;
    paymentAmount?: number;
}
