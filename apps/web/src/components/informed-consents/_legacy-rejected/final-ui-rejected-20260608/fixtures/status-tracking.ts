/**
 * MOCK DATA — Status Tracking records.
 *
 * Phase 40 controlled-port note:
 *   Originates from the OneDrive Vite Figma-Make export
 *   `WathiqCare-Figma-UX-UI/src/app/components/StatusTracking.tsx`.
 *
 *   Replacement plan when wiring to real APIs:
 *     - `consentRecords` → GET /api/modules/informed-consents/documents
 *       (already exists; produces real consent_documents rows plus their
 *       secure signing workflow events).
 */

import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Circle,
  Eye,
  FileText,
  Send,
  ShieldCheck,
} from "lucide-react";

export type TrackingEvent = {
  stage: string;
  label: string;
  time: string | null;
  done: boolean;
  icon: LucideIcon;
};

export type TrackingRecord = {
  id: string;
  mrn: string;
  name: string;
  nameAr: string;
  procedure: string;
  procedureAr: string;
  sent: string;
  status: string;
  events: TrackingEvent[];
};

export const consentRecords: TrackingRecord[] = [
  {
    id: "CNS-2024-0847-001",
    mrn: "MRN-2024-0847",
    name: "Mohammed Al-Rashidi",
    nameAr: "محمد الراشدي",
    procedure: "Laparoscopic Cholecystectomy",
    procedureAr: "استئصال المرارة بالمنظار",
    sent: "2026-05-28 10:45",
    status: "sent",
    events: [
      { stage: "draft", label: "Draft Created", time: "10:30", done: true, icon: FileText },
      { stage: "sent", label: "Link Sent", time: "10:45", done: true, icon: Send },
      { stage: "opened", label: "Patient Opened", time: "11:02", done: true, icon: Eye },
      { stage: "otp", label: "OTP Verified", time: "11:04", done: true, icon: ShieldCheck },
      { stage: "education", label: "Education Viewed", time: "11:09", done: true, icon: BookOpen },
      { stage: "decision", label: "Decision Recorded", time: null, done: false, icon: Circle },
      { stage: "signed", label: "Signed", time: null, done: false, icon: CheckCircle2 },
      { stage: "pdf", label: "PDF Generated", time: null, done: false, icon: FileText },
      { stage: "evidence", label: "Evidence Complete", time: null, done: false, icon: Archive },
    ],
  },
  {
    id: "CNS-2024-0771-001",
    mrn: "MRN-2024-0771",
    name: "Sara Al-Dosari",
    nameAr: "سارة الدوسري",
    procedure: "Appendectomy",
    procedureAr: "استئصال الزائدة الدودية",
    sent: "2026-05-28 07:20",
    status: "evidence",
    events: [
      { stage: "draft", label: "Draft Created", time: "07:10", done: true, icon: FileText },
      { stage: "sent", label: "Link Sent", time: "07:20", done: true, icon: Send },
      { stage: "opened", label: "Patient Opened", time: "07:22", done: true, icon: Eye },
      { stage: "otp", label: "OTP Verified", time: "07:24", done: true, icon: ShieldCheck },
      { stage: "education", label: "Education Viewed", time: "07:30", done: true, icon: BookOpen },
      { stage: "decision", label: "Decision Recorded", time: "07:31", done: true, icon: Circle },
      { stage: "signed", label: "Signed", time: "07:32", done: true, icon: CheckCircle2 },
      { stage: "pdf", label: "PDF Generated", time: "07:32", done: true, icon: FileText },
      { stage: "evidence", label: "Evidence Complete", time: "07:33", done: true, icon: Archive },
    ],
  },
];
