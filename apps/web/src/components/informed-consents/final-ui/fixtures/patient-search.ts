/**
 * MOCK DATA — Patient Search fixtures.
 *
 * Phase 40 controlled-port note:
 *   These records originate from the OneDrive Vite Figma-Make export
 *   `WathiqCare-Figma-UX-UI/src/app/components/PatientSearch.tsx`.
 *   They are NOT live data and MUST NOT appear in production.
 *
 *   Replacement plan when wiring the UI to real APIs:
 *     - `mockPatients`   → GET /api/modules/informed-consents/patients/search
 *     - `mockEncounters` → GET /api/modules/informed-consents/patients/{id}/encounters
 *
 *   Until that wiring lands, the visual UI imports from this module so the
 *   mock data can be swapped out from one location.
 */

import type { Encounter, Patient } from "../clinical/ClinicalTypes";

export const mockPatients: Patient[] = [
  {
    mrn: "MRN-2024-0847",
    name: "Mohammed Ibrahim Al-Rashidi",
    nameAr: "محمد إبراهيم الراشدي",
    dob: "1978-03-14",
    age: 46,
    gender: "Male",
    nationality: "Saudi",
    phone: "+966 50 234 5678",
    email: "m.alrashidi@email.com",
    bloodType: "A+",
    allergies: ["Penicillin", "NSAIDs"],
  },
];

export const mockEncounters: Encounter[] = [
  {
    id: "ENC-2024-1847",
    date: "2026-05-28",
    type: "Pre-Operative",
    department: "General Surgery",
    physician: "Dr. Khalid Al-Qahtani",
    status: "active",
  },
  {
    id: "ENC-2024-1721",
    date: "2026-05-15",
    type: "Outpatient",
    department: "General Surgery",
    physician: "Dr. Khalid Al-Qahtani",
    status: "closed",
  },
  {
    id: "ENC-2024-1603",
    date: "2026-04-22",
    type: "Emergency",
    department: "Emergency Medicine",
    physician: "Dr. Sara Al-Otibi",
    status: "closed",
  },
];
