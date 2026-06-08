export type Screen =
  | 'dashboard'
  | 'patient-search'
  | 'encounter-selection'
  | 'consent-builder'
  | 'status-tracking';

export type ConsentStep =
  | 'patient'
  | 'consentType'
  | 'procedure'
  | 'anesthesia'
  | 'disclosures'
  | 'education'
  | 'preview'
  | 'validation'
  | 'send';

export interface Patient {
  mrn: string;
  name: string;
  nameAr: string;
  dob: string;
  age: number;
  gender: string;
  nationality: string;
  phone: string;
  email: string;
  bloodType: string;
  allergies: string[];
}

export interface Encounter {
  id: string;
  date: string;
  type: string;
  department: string;
  physician: string;
  status: string;
}

export interface Procedure {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  category: string;
  complexity: 'low' | 'medium' | 'high';
  requiresAnesthesia: boolean;
  estimatedDuration: string;
}

export interface ValidationItem {
  id: string;
  label: string;
  labelAr: string;
  severity: 'critical' | 'warning' | 'ready';
  complete: boolean;
  section: ConsentStep;
}

