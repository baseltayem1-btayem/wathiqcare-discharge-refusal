export type RefusalFormStatus = 
  | "pending" 
  | "signed" 
  | "escalated" 
  | "completed";

export type RefusalFormType = 
  | "discharge_refusal" 
  | "financial_responsibility" 
  | "home_healthcare";

export type RefusalForm = {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  patientIdNumber: string;
  medicalRecordNumber: string;
  formType: RefusalFormType;
  status: RefusalFormStatus;
  generatedAt: string;
  signedAt?: string | null;
  signerName?: string | null;
  witnessName?: string | null;
  attendingPhysician?: string | null;
  refusalReason?: string | null;
  documentUrl?: string | null;
};

export type SignatureData = {
  signerName: string;
  signerRelation: string;
  witnessName: string;
  witnessTitle: string;
  acknowledgedRisks: boolean;
  acknowledgedFinancial: boolean;
};
