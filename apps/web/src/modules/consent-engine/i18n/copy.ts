import type { DynamicConsentAlternativeItem, DynamicConsentSection } from "@/modules/consent-engine/engine/types";

export const DYNAMIC_CONSENT_COPY = {
  intro: {
    ar: "هذا النموذج التجريبي يعرض كيف يمكن لمحرك موافقات ديناميكي أن يبني محتوى سريري وقانوني متدرج دون تعديل المسار الإنتاجي الحالي.",
    en: "This experimental model shows how a dynamic consent engine can compose layered clinical and legal wording without altering the current production flow.",
  },
  acknowledgment: {
    ar: "أقر بأن الطبيب شرح لي التشخيص والإجراء المقترح والمنافع والمخاطر والبدائل بلغة مفهومة، وأتيح لي وقت كافٍ لطرح الأسئلة.",
    en: "I acknowledge that the physician explained the diagnosis, proposed procedure, benefits, risks, and alternatives in understandable language, and I was given sufficient time to ask questions.",
  },
  refusal: {
    ar: "إن رفض أو تأخير الإجراء الموصى به قد يؤدي إلى تدهور الحالة أو مضاعفات يمكن تفاديها سريريًا.",
    en: "Refusal or delay of the recommended intervention may result in deterioration or clinically avoidable complications.",
  },
};

export const DEFAULT_DYNAMIC_ALTERNATIVES: DynamicConsentAlternativeItem[] = [
  {
    id: "alt-conservative",
    textAr: "المتابعة التحفظية مع العلاج الدوائي والمراقبة السريرية حسب تقييم الطبيب.",
    textEn: "Conservative management with medication and clinical monitoring as assessed by the physician.",
  },
  {
    id: "alt-defer",
    textAr: "تأجيل الإجراء مؤقتًا مع إعادة التقييم عند تغير الأعراض أو نتائج الفحوصات.",
    textEn: "Temporary deferral with reassessment if symptoms or investigation results change.",
  },
];

export function createDefaultLegalStatements(): DynamicConsentSection[] {
  return [
    {
      id: "legal-acknowledgment",
      key: "legal_acknowledgment",
      kind: "acknowledgment",
      titleAr: "إقرار المريض",
      titleEn: "Patient Acknowledgment",
      bodyAr: DYNAMIC_CONSENT_COPY.acknowledgment.ar,
      bodyEn: DYNAMIC_CONSENT_COPY.acknowledgment.en,
      required: true,
      layer: 3,
      order: 900,
    },
    {
      id: "legal-refusal",
      key: "refusal_notice",
      kind: "refusal",
      titleAr: "مخاطر الرفض أو التأخير",
      titleEn: "Risks of Refusal or Delay",
      bodyAr: DYNAMIC_CONSENT_COPY.refusal.ar,
      bodyEn: DYNAMIC_CONSENT_COPY.refusal.en,
      required: true,
      layer: 3,
      order: 910,
    },
  ];
}