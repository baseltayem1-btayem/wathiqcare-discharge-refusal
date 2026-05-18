import type { DynamicConsentRiskItem } from "@/modules/consent-engine/engine/types";

const RISK_LIBRARY: DynamicConsentRiskItem[] = [
  {
    id: "risk-bleeding",
    code: "BLEEDING",
    titleAr: "النزيف",
    titleEn: "Bleeding",
    descriptionAr: "قد يحدث نزيف أثناء الإجراء أو بعده وقد يحتاج إلى علاج إضافي أو نقل دم وفق التقييم السريري.",
    descriptionEn: "Bleeding may occur during or after the procedure and may require additional treatment or transfusion depending on clinical assessment.",
    severity: "high",
    specialtyTags: ["GENERAL_MEDICINE", "CARDIOLOGY", "SURGERY"],
    category: "procedural",
  },
  {
    id: "risk-infection",
    code: "INFECTION",
    titleAr: "العدوى",
    titleEn: "Infection",
    descriptionAr: "توجد احتمالية لحدوث عدوى موضعية أو جهازية رغم تطبيق معايير الوقاية والتعقيم.",
    descriptionEn: "There is a possibility of local or systemic infection despite prevention and sterilization standards.",
    severity: "medium",
    specialtyTags: ["GENERAL_MEDICINE", "CARDIOLOGY", "SURGERY"],
    category: "procedural",
  },
  {
    id: "risk-allergy",
    code: "ALLERGIC_REACTION",
    titleAr: "التحسس الدوائي أو التحسس من المواد المستخدمة",
    titleEn: "Drug or material allergic reaction",
    descriptionAr: "قد تظهر تفاعلات تحسسية للأدوية أو الصبغات أو المواد الطبية المستعملة أثناء الرعاية.",
    descriptionEn: "Allergic reactions may occur to medications, contrast media, or clinical materials used during care.",
    severity: "medium",
    specialtyTags: ["GENERAL_MEDICINE", "CARDIOLOGY", "RADIOLOGY"],
    category: "medication",
  },
  {
    id: "risk-arrhythmia",
    code: "ARRHYTHMIA",
    titleAr: "اضطراب نظم القلب",
    titleEn: "Cardiac arrhythmia",
    descriptionAr: "قد يحدث اضطراب مؤقت أو مستمر في نظم القلب أثناء إجراءات القلب التدخلية أو بعدها.",
    descriptionEn: "Temporary or persistent cardiac arrhythmia may occur during or after interventional cardiac procedures.",
    severity: "high",
    specialtyTags: ["CARDIOLOGY"],
    category: "cardiac",
  },
  {
    id: "risk-vessel-injury",
    code: "VESSEL_INJURY",
    titleAr: "إصابة وعائية",
    titleEn: "Vascular injury",
    descriptionAr: "قد تحدث إصابة أو انسداد أو تشنج في الوعاء الدموي أثناء القسطرة أو إدخال الأدوات العلاجية.",
    descriptionEn: "Vascular injury, occlusion, or spasm may occur during catheterization or device insertion.",
    severity: "critical",
    specialtyTags: ["CARDIOLOGY"],
    category: "cardiac",
  },
  {
    id: "risk-sedation",
    code: "SEDATION_COMPLICATION",
    titleAr: "مضاعفات التهدئة أو التخدير",
    titleEn: "Sedation or anesthesia complication",
    descriptionAr: "قد تحدث مضاعفات تنفسية أو دورانية مرتبطة بالتهدئة أو التخدير حسب الحالة الصحية وخطة الإجراء.",
    descriptionEn: "Respiratory or circulatory complications may occur from sedation or anesthesia depending on medical condition and procedural plan.",
    severity: "high",
    specialtyTags: ["GENERAL_MEDICINE", "CARDIOLOGY", "SURGERY"],
    category: "anesthesia",
  },
];

export function listDynamicConsentRisks(): DynamicConsentRiskItem[] {
  return RISK_LIBRARY.slice();
}

export function listDynamicConsentRisksForSpecialty(specialty: string, riskCodes: string[] = []): DynamicConsentRiskItem[] {
  const normalizedSpecialty = specialty.trim().toUpperCase() || "GENERAL_MEDICINE";
  const requestedCodes = new Set(riskCodes.map((item) => item.trim().toUpperCase()).filter(Boolean));

  return RISK_LIBRARY.filter((item) => {
    if (requestedCodes.size > 0) {
      return requestedCodes.has(item.code);
    }

    return item.specialtyTags.includes(normalizedSpecialty) || item.specialtyTags.includes("GENERAL_MEDICINE");
  });
}