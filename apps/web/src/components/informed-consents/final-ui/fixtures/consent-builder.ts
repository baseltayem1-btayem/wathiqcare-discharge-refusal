/**
 * MOCK DATA — Consent Builder seed validation state.
 *
 * Phase 40 controlled-port note:
 *   Originates from the OneDrive Vite Figma-Make export
 *   `WathiqCare-Figma-UX-UI/src/app/components/ConsentBuilder.tsx`.
 *   This is the initial completeness checklist shown to the physician.
 *
 *   Replacement plan when wiring to real APIs:
 *     - Server-side validation results from
 *       POST /api/modules/informed-consents/documents/{id}/validation
 *     - Per-template required-field manifest from the consent template catalog.
 */

import type { ValidationItem } from "../clinical/ClinicalTypes";

export const defaultValidation: ValidationItem[] = [
  { id: "v1", label: "Patient identity confirmed", labelAr: "تم تأكيد هوية المريض", severity: "critical", complete: true, section: "patient" },
  { id: "v2", label: "Encounter selected", labelAr: "تم اختيار الزيارة", severity: "critical", complete: true, section: "patient" },
  { id: "v3", label: "Procedure selected", labelAr: "تم اختيار الإجراء", severity: "critical", complete: true, section: "procedure" },
  { id: "v4", label: "Procedure description (EN)", labelAr: "وصف الإجراء (إنجليزي)", severity: "critical", complete: true, section: "procedure" },
  { id: "v5", label: "Procedure description (AR)", labelAr: "وصف الإجراء (عربي)", severity: "critical", complete: false, section: "procedure" },
  { id: "v6", label: "Anesthesia type selected", labelAr: "نوع التخدير محدد", severity: "critical", complete: false, section: "anesthesia" },
  { id: "v7", label: "Anesthesia risks disclosed", labelAr: "مخاطر التخدير مُفصَح عنها", severity: "critical", complete: false, section: "anesthesia" },
  { id: "v8", label: "Fasting instructions provided", labelAr: "تعليمات الصيام متوفرة", severity: "warning", complete: false, section: "anesthesia" },
  { id: "v9", label: "Patient-specific risks entered", labelAr: "مخاطر خاصة بالمريض مدخلة", severity: "critical", complete: false, section: "disclosures" },
  { id: "v10", label: "Alternatives discussed", labelAr: "البدائل مناقشة", severity: "critical", complete: false, section: "disclosures" },
  { id: "v11", label: "Refusal risks disclosed", labelAr: "مخاطر الرفض مُفصَح عنها", severity: "warning", complete: false, section: "disclosures" },
  { id: "v12", label: "Arabic disclosure text complete", labelAr: "نص الإفصاح بالعربية مكتمل", severity: "critical", complete: false, section: "disclosures" },
  { id: "v13", label: "Patient education package ready", labelAr: "حزمة تثقيف المريض جاهزة", severity: "warning", complete: false, section: "education" },
  { id: "v14", label: "Patient preview confirmed", labelAr: "معاينة المريض مؤكدة", severity: "warning", complete: false, section: "preview" },
  { id: "v15", label: "PDF readiness verified", labelAr: "جاهزية PDF مؤكدة", severity: "warning", complete: false, section: "validation" },
  { id: "v16", label: "Contact details confirmed", labelAr: "بيانات التواصل مؤكدة", severity: "critical", complete: false, section: "send" },
];
