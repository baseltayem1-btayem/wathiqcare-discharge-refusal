// Core workflow types matching the production API contracts

export type WorkflowStep =
  | 'patient-search'
  | 'encounter-selection'
  | 'consent-selection'
  | 'anesthesia-decision'
  | 'draft-generation'
  | 'draft-review'
  | 'patient-notification'
  | 'audit-evidence';

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  nameAr?: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'Other';
  caseId?: string;
  caseReference?: string;
  contact?: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  encounterNumber: string;
  caseNumber: string;
  admissionDate: string;
  department: string;
  attendingPhysician: string;
  physicianLicense?: string;
  physicianSpecialty?: string;
  diagnosis: string;
  plannedProcedure: string;
  syncStatus: 'synced' | 'pending' | 'manual' | 'failed';
  source: 'TrakCare' | 'Manual';
}

export interface IMCLibraryItem {
  id: string;
  imcLibraryItemId: string;
  titleEn: string;
  titleAr: string;
  templateId: string;
  templateVersionId: string;
  templateType: string;
  language: 'en' | 'ar' | 'bilingual';
  status: 'active' | 'inactive' | 'draft';
  imcApproved: boolean;
  publicPath?: string;
  source: string;
  version: string;
  summary?: string;
  mappingAvailable: boolean;
}

export type AnesthesiaType =
  | 'none'
  | 'local'
  | 'regional'
  | 'general'
  | 'sedation';

export interface AnesthesiaDecision {
  type: AnesthesiaType;
  reviewRequired: boolean;
  typeLabel: string;
  typeLabelAr: string;
}

export interface DraftDocument {
  id: string;
  patientId: string;
  patientMrn: string;
  patientCaseId?: string;
  encounterId: string;
  encounterNumber: string;
  encounterCaseNumber: string;
  encounterAdmissionDate: string;
  encounterDepartment: string;
  encounterPhysician: string;
  encounterPhysicianLicense?: string;
  encounterPhysicianSpecialty?: string;
  encounterDiagnosis: string;
  encounterProcedure: string;
  encounterSyncStatus: string;
  encounterSource: string;
  templateId: string;
  templateVersionId: string;
  language: string;
  imcLibraryItemId: string;
  imcLibraryTitleEn: string;
  imcLibraryPublicPath?: string;
  imcLibrarySource: string;
  imcLibraryStatus: string;
  imcLibraryTemplateType: string;
  anesthesiaDecision: string;
  anesthesiaReviewRequired: boolean;
  anesthesiaTypeLabel: string;
  pdfGenerated: boolean;
  pdfUrl?: string;
  generatedAt?: string;
}

export interface AnesthesiaReviewStatus {
  required: boolean;
  requested: boolean;
  inProgress: boolean;
  approved: boolean;
  reviewer?: string;
  reviewedAt?: string;
}

export interface SecureSigningStatus {
  linkCreated: boolean;
  linkSent: boolean;
  deliveryStatus: 'not-sent' | 'sending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

export interface ReadinessChecklist {
  patientSelected: boolean;
  encounterSelected: boolean;
  consentSelected: boolean;
  templateMapped: boolean;
  anesthesiaDecisionComplete: boolean;
  anesthesiaReviewSatisfied: boolean;
  draftPdfGenerated: boolean;
  pdfReviewAvailable: boolean;
  readyForNotification: boolean;
  evidenceReady: boolean;
}

export type ButtonState = 'default' | 'loading' | 'disabled' | 'success' | 'error';

export type APILoadingState = 'idle' | 'loading' | 'success' | 'error';
