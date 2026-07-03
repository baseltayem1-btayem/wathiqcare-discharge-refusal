/**
 * Batch 1 FigureLabs illustration data.
 *
 * Shared between the Clinical Knowledge Engine seed plan and the registry
 * generation scripts. This keeps the public image paths, Arabic names, and
 * approval status in one place.
 */

export interface SpecialtyInfo {
  nameEn: string;
  nameAr: string;
  code: string;
}

export interface ClinicalOverride {
  specialty?: SpecialtyInfo;
  anatomyRegion?: string;
  illustrationType?: "anatomy_procedure_education" | "process_education";
  aliases?: string[];
  procedureNameAr?: string;
  notes?: string;
}

export interface BatchIllustration extends ClinicalOverride {
  procedureNameEn: string;
  procedureImageUrl: string;
  imageReviewStatus: "approved" | "draft" | "pending_clinical_review" | "generated_by_chatgpt_draft";
  patientFacing: boolean;
  imageBaseUrl?: string;
  imageEnUrl?: string;
  imageArUrl?: string;
  labelsEn?: string[];
  labelsAr?: string[];
  languageDirection?: string;
  productionStatus?: string;
  integrationStatus?: string;
  arabicReviewStatus?: string;
}

function specialty(nameEn: string, nameAr: string, code: string): SpecialtyInfo {
  return { nameEn, nameAr, code };
}

export const BATCH_1_ILLUSTRATIONS: Record<string, BatchIllustration> = {
  "laparoscopic-cholecystectomy": {
    procedureNameEn: "Laparoscopic Cholecystectomy",
    specialty: specialty("General Surgery / Other", "الجراحة العامة / أخرى", "GENERAL_SURGERY"),
    anatomyRegion: "Gallbladder, liver, bile ducts, upper right abdomen",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "استئصال المرارة بالمنظار",
    aliases: [
      "Laparoscopic Cholecystectomy",
      "Cholecystectomy Laparoscopic",
      "Lap Chole",
      "استئصال المرارة بالمنظار",
    ],
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/general-surgery/laparoscopic-cholecystectomy/laparoscopic_cholecystectomy_anatomy_procedure_education_v1_approved.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Approved FigureLabs educational illustration.",
  },
  "appendicectomy-open": {
    procedureNameEn: "Appendicectomy - Open",
    specialty: specialty("General Surgery / Other", "الجراحة العامة / أخرى", "GENERAL_SURGERY"),
    anatomyRegion: "Appendix and lower right abdomen",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "استئصال الزائدة الدودية بالجراحة المفتوحة",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/general-surgery/appendicectomy-open/appendicectomy-open_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "caesarean-section": {
    procedureNameEn: "Caesarean Section",
    specialty: specialty("Obstetrics & Gynecology", "النساء والتوليد", "OBSTETRICS_GYNECOLOGY"),
    anatomyRegion: "Uterus, lower abdominal wall, and fetus in utero",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "الولادة القيصرية",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/obstetrics-gynecology/caesarean-section/caesarean-section_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "colonoscopy": {
    procedureNameEn: "Colonoscopy",
    specialty: specialty("Gastroenterology / Hepatobiliary Surgery", "أمراض الجهاز الهضمي / جراحة الكبد والمرارة", "GASTROENTEROLOGY"),
    anatomyRegion: "Large intestine and rectum",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "تنظير القولون",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/gastroenterology/colonoscopy/colonoscopy_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "upper-gastrointestinal-endoscopy": {
    procedureNameEn: "Upper Gastrointestinal Endoscopy",
    specialty: specialty("Gastroenterology / Hepatobiliary Surgery", "أمراض الجهاز الهضمي / جراحة الكبد والمرارة", "GASTROENTEROLOGY"),
    anatomyRegion: "Esophagus, stomach, and duodenum",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "تنظير الجهاز الهضمي العلوي",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/gastroenterology/upper-gastrointestinal-endoscopy/upper-gastrointestinal-endoscopy_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "angiogram-and-plasty-stenting": {
    procedureNameEn: "Angiogram and Plasty Stenting",
    specialty: specialty("Radiology / Interventional Radiology", "الأشعة / الأشعة التداخلية", "RADIOLOGY"),
    anatomyRegion: "Arterial tree and catheter access site",
    illustrationType: "process_education",
    procedureNameAr: "تصوير الأوعية الدموية ووضع الدعامة",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/radiology/angiogram-and-plasty-stenting/angiogram-and-plasty-stenting_process_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "central-vascular-access-device-insertion": {
    procedureNameEn: "Central Vascular Access Device Insertion",
    specialty: specialty("Vascular Surgery", "جراحة الأوعية الدموية", "VASCULAR_SURGERY"),
    anatomyRegion: "Central vein and catheter/port device",
    illustrationType: "process_education",
    procedureNameAr: "إدخال جهاز وصول وريدي مركزي",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/vascular-surgery/central-vascular-access-device-insertion/central-vascular-access-device-insertion_process_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "blood-and-blood-products-transfusion": {
    procedureNameEn: "Blood and Blood Products Transfusion",
    specialty: specialty("Transfusion Medicine / Blood Transfusion", "طب نقل الدم / نقل الدم", "TRANSFUSION_MEDICINE"),
    anatomyRegion: "Intravenous line, blood bag, and infusion pathway",
    illustrationType: "process_education",
    procedureNameAr: "نقل الدم ومشتقاته",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/transfusion-medicine/blood-and-blood-products-transfusion/blood-and-blood-products-transfusion_process_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "cystoscopy": {
    procedureNameEn: "Cystoscopy",
    specialty: specialty("Urology", "المسالك البولية", "UROLOGY"),
    anatomyRegion: "Bladder, urethra, and ureteric orifices",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "تنظير المثانة",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/urology/cystoscopy/cystoscopy_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "thoracentesis-pleural-tap": {
    procedureNameEn: "Thoracentesis (Pleural Tap)",
    specialty: specialty("Pulmonology / Interventional Radiology", "أمراض الرئة / الأشعة التداخلية", "PULMONOLOGY_INTERVENTIONAL"),
    anatomyRegion: "Pleural space, lung, and chest wall",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "بزل الصدر",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/pulmonology-interventional-radiology/thoracentesis-pleural-tap/thoracentesis-pleural-tap_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "tracheostomy-informed-consent": {
    procedureNameEn: "Tracheostomy Informed Consent",
    specialty: specialty("Ear, Nose and Throat", "أنف وأذن وحنجرة", "ENT"),
    anatomyRegion: "Neck, trachea, and stoma site",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "موافقة فتح القصبة الهوائية",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/ent/tracheostomy-informed-consent/tracheostomy-informed-consent_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "liver-biopsy": {
    procedureNameEn: "Liver Biopsy",
    specialty: specialty("Gastroenterology / Hepatobiliary Surgery", "أمراض الجهاز الهضمي / جراحة الكبد والمرارة", "GASTROENTEROLOGY"),
    anatomyRegion: "Liver",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "خزعة الكبد",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/gastroenterology/liver-biopsy/liver-biopsy_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "percutaneous-endoscopic-gastrostomy-tube": {
    procedureNameEn: "Percutaneous Endoscopic Gastrostomy Tube",
    specialty: specialty("Gastroenterology / Hepatobiliary Surgery", "أمراض الجهاز الهضمي / جراحة الكبد والمرارة", "GASTROENTEROLOGY"),
    anatomyRegion: "Stomach and abdominal wall with feeding tube",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "أنبوب تغذية معدي بالمنظار الجلدي",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/gastroenterology/percutaneous-endoscopic-gastrostomy-tube/percutaneous-endoscopic-gastrostomy-tube_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "thyroidectomy": {
    procedureNameEn: "Thyroidectomy",
    specialty: specialty("Endocrine Surgery", "جراحة الغدد الصماء", "ENDOCRINE_SURGERY"),
    anatomyRegion: "Thyroid gland and neck structures",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "استئصال الغدة الدرقية",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/endocrine-surgery/thyroidectomy/thyroidectomy_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "hernia-open-inguinal-hernia-repair": {
    procedureNameEn: "Hernia - Open Inguinal Hernia Repair",
    specialty: specialty("General Surgery / Other", "الجراحة العامة / أخرى", "GENERAL_SURGERY"),
    anatomyRegion: "Abdominal wall and groin region",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "ترتيب الفتق الإربي بالجراحة المفتوحة",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/general-surgery/hernia-open-inguinal-hernia-repair/hernia-open-inguinal-hernia-repair_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "hernia-laparoscopic-inguinal-hernia-repair": {
    procedureNameEn: "Hernia - Laparoscopic Inguinal Hernia Repair",
    specialty: specialty("General Surgery / Other", "الجراحة العامة / أخرى", "GENERAL_SURGERY"),
    anatomyRegion: "Abdominal wall and groin region with laparoscopic ports",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "ترتيب الفتق الإربي بالمنظار",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/general-surgery/hernia-laparoscopic-inguinal-hernia-repair/hernia-laparoscopic-inguinal-hernia-repair_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "cataract-surgery": {
    procedureNameEn: "Cataract Surgery",
    specialty: specialty("Ophthalmology", "طب العيون", "OPHTHALMOLOGY"),
    anatomyRegion: "Eye, cornea, lens, and iris",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "جراحة إعتام عدسة العين",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/ophthalmology/cataract-surgery/cataract-surgery_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "cerebral-angiogram-cerebral-thrombectomy": {
    procedureNameEn: "Cerebral Angiogram - Cerebral Thrombectomy",
    specialty: specialty("Neurosurgery / Neuro-interventional Radiology", "جراحة الأعصاب / الأشعة التداخلية العصبية", "NEURO_INTERVENTIONAL"),
    anatomyRegion: "Brain arteries and clot retrieval path",
    illustrationType: "process_education",
    procedureNameAr: "تصوير شرايين الدماغ مع استخراج الخثرة",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/neurosurgery-neuro-interventional-radiology/cerebral-angiogram-cerebral-thrombectomy/cerebral-angiogram-cerebral-thrombectomy_process_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
  "lumbar-puncture-guided": {
    procedureNameEn: "Lumbar Puncture (Guided)",
    specialty: specialty("Neurology / Radiology / Anesthesia", "الأعصاب / الأشعة / التخدير", "NEURO_RADIO_ANESTHESIA"),
    anatomyRegion: "Lower spine and spinal canal",
    illustrationType: "anatomy_procedure_education",
    procedureNameAr: "Lumbar Puncture (Guided)",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/neurology-radiology-anesthesia/lumbar-puncture-guided/lumbar-puncture-guided_anatomy_procedure_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; Arabic translation requires clinical review; authorization certificate pending.",
  },
  "anesthesia-patient-consent": {
    procedureNameEn: "Anesthesia - Patient Consent",
    specialty: specialty("Anesthesia / Pain / Critical Care", "التخدير / علاج الألم / العناية المركزة", "ANESTHESIA"),
    anatomyRegion: "Airway, lungs, and anesthesia monitoring setup",
    illustrationType: "process_education",
    procedureNameAr: "موافقة المريض على التخدير",
    procedureImageUrl:
      "apps/web/public/educational/clinical-illustrations/anesthesia/anesthesia-patient-consent/anesthesia-patient-consent_process_education_v1_draft.png",
    imageReviewStatus: "approved",
    patientFacing: true,
    notes: "Image integrated from FigureLabs separated package; authorization certificate pending.",
  },
};

// Apply bilingual / review tracking defaults to Batch 1 (already approved FigureLabs assets).
for (const b of Object.values(BATCH_1_ILLUSTRATIONS)) {
  b.imageBaseUrl = b.procedureImageUrl;
  b.imageEnUrl = b.procedureImageUrl;
  b.labelsEn = b.labelsEn ?? [];
  b.labelsAr = b.labelsAr ?? [];
  b.languageDirection = b.languageDirection ?? "both";
  b.productionStatus = b.productionStatus ?? "approved";
  b.integrationStatus = b.integrationStatus ?? "integrated";
  b.arabicReviewStatus = b.arabicReviewStatus ?? "approved";
}

// Batch 2 ChatGPT-generated draft illustrations (provisional, not patient-facing).
import _batch2Generated from "./figurelabs-batch-2-generated.json";

const batch2GeneratedRaw = _batch2Generated as Record<
  string,
  Omit<BatchIllustration, "specialty"> & {
    specialtyNameEn: string;
    specialtyNameAr: string;
    specialtyCode: string;
  }
>;

export const BATCH_2_GENERATED: Record<string, BatchIllustration> = {};
for (const [key, raw] of Object.entries(batch2GeneratedRaw)) {
  BATCH_2_GENERATED[key] = {
    ...raw,
    specialty: specialty(raw.specialtyNameEn, raw.specialtyNameAr, raw.specialtyCode),
  };
}

/**
 * Batch 2: next 20 normalized procedures from the master registry, selected
 * after excluding Batch 1. These are queued for FigureLabs generation.
 */
export const BATCH_2_KEYS: string[] = [
  "abdominal-aortic-aneurysm",
  "abdominoperineal-resection-of-rectum",
  "abdominoplasty",
  "adenotonsillectomy",
  "allergen-immunotherapy",
  "allergy-skin-test-consent-and-informed",
  "amniocentesis-chorionic-villus-sampling",
  "amputation",
  "angiogram-with-mechanical-thrombectomy-any-body-part",
  "arteriovenous-fistula",
  "arteriovenous-goretex-loop-graft",
  "arthrogram",
  "arthroplasty-consent",
  "aspiration-drainage-under-imaging",
  "bartholin-s-glands",
  "biopsy-under-imaging",
  "blepharoplasty",
  "blood-and-blood-products-transfusion-consent",
  "breast-abscess-haematoma",
  "breast-biopsy-aspiration",
];
