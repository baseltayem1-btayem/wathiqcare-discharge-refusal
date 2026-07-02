/**
 * Clinical overrides and inference helpers for the FigureLabs illustration registry.
 *
 * This module keeps the generator script focused on CSV I/O while centralizing
 * the clinical QA rules (specialty corrections, anatomy regions, Arabic names,
 * illustration type, and review notes).
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

export const DEFAULT_SPECIALTY: SpecialtyInfo = {
  nameEn: "General Surgery / Other",
  nameAr: "الجراحة العامة / أخرى",
  code: "GENERAL_SURGERY",
};

export const DEFAULT_DISCLAIMER_EN =
  "This illustration is for patient education only and does not replace the physician's explanation.";
export const DEFAULT_DISCLAIMER_AR =
  "هذه الصورة لأغراض التثقيف فقط ولا تُغني عن شرح الطبيب المعالج.";

// Approved Laparoscopic Cholecystectomy constants (must remain unchanged).
export const APPROVED_LAP_CHOLE = {
  keys: new Set(["laparoscopic-cholecystectomy", "cholecystectomy-laparoscopic"]),
  aliases: [
    "Laparoscopic Cholecystectomy",
    "Cholecystectomy Laparoscopic",
    "Lap Chole",
    "استئصال المرارة بالمنظار",
  ],
  anatomyRegion: "Gallbladder, liver, bile ducts, upper right abdomen",
  imageFileName: "laparoscopic_cholecystectomy_anatomy_procedure_education_v1_approved.png",
  imageReviewStatus: "approved",
  patientFacing: true,
  disclaimerEn: DEFAULT_DISCLAIMER_EN,
  disclaimerAr: DEFAULT_DISCLAIMER_AR,
  procedureNameAr: "استئصال المرارة بالمنظار",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function specialty(nameEn: string, nameAr: string, code: string): SpecialtyInfo {
  return { nameEn, nameAr, code };
}

const SPECIALTY_KEYWORDS: Array<{ keywords: string[]; specialty: SpecialtyInfo }> = [
  {
    keywords: [
      "cataract",
      "blepharoplasty",
      "chalazion",
      "corneal transplant",
      "vitrectomy",
      "pterygium",
      "ptosis",
      "eyelid",
      "entropion",
      "ectropion",
      "dacryocystorhinostomy",
      "dacrocystogram",
      "eylea",
      "lucentis",
      "ozurdex",
      "femto-lasik",
      "femto-intracorneal",
      "intravitreal",
      "punctoplasty",
      "probing and irrigation",
    ],
    specialty: specialty("Ophthalmology", "طب العيون", "OPHTHALMOLOGY"),
  },
  {
    keywords: [
      "stapedectomy",
      "tympanoplasty",
      "mastoidectomy",
      "myringotomy",
      "otoplasty",
      "microlaryngoscopy",
      "larynx",
      "vocal cord",
      "thyroplasty",
      "tracheostomy",
      "adenotonsillectomy",
      "tonsillectomy",
      "tonsil",
      "adenoid",
      "septoplasty",
      "turbinectomy",
      "rhinoplasty",
      "sino-nasal",
      "sinonasal",
      "uvulopalatopharyngoplasty",
      "palatoplasty",
      "parotidectomy",
      "neck dissection",
    ],
    specialty: specialty("Ear, Nose and Throat", "أنف وأذن وحنجرة", "ENT"),
  },
  {
    keywords: ["cardioversion", "echocardiogram", "ct cardiac", "cardiac"],
    specialty: specialty("Cardiology", "أمراض القلب", "CARDIOLOGY"),
  },
  {
    keywords: [
      "cerebral",
      "cranial surgery",
      "craniotomy",
      "intracranial",
      "aneurysm coiling",
      "flow diverter",
      "cerebral thrombectomy",
      "vasospasm",
      "brain",
      "spine surgery",
      "lumbar puncture",
      "intrathecal",
    ],
    specialty: specialty("Neurosurgery / Neuro-interventional Radiology", "جراحة الأعصاب / الأشعة التداخلية العصبية", "NEURO_INTERVENTIONAL"),
  },
  {
    keywords: [
      "aortic aneurysm",
      "arteriovenous fistula",
      "arteriovenous goretex",
      "av graft",
      "carotid endarterectomy",
      "carotid stenting",
      "femoropopliteal bypass",
      "ivc filter",
      "varicose veins",
      "varicocele",
      "vascular access",
    ],
    specialty: specialty("Vascular Surgery", "جراحة الأوعية الدموية", "VASCULAR_SURGERY"),
  },
  {
    keywords: [
      "arthroscopy",
      "arthroplasty",
      "arthrogram",
      "orthopedic",
      "knee",
      "shoulder",
      "hip",
      "joint",
      "ganglion",
      "bursa",
      "ligament",
    ],
    specialty: specialty("Orthopedics", "جراحة العظام", "ORTHOPEDICS"),
  },
  {
    keywords: [
      "caesarean",
      "amniocentesis",
      "chorionic villus",
      "hysteroscopy",
      "dilation",
      "curettage",
      "d & c",
      "cone biopsy",
      "lletz",
      "termination of pregnancy",
      "ectopic pregnancy",
      "ovarian cystectomy",
      "oophorectomy",
      "vaginal repair",
      "bartholin",
      "female sterilisation",
      "endometrial ablation",
      "uterine artery embolisation",
      "hysterosalpingogram",
      "intrauterine device",
      "midurethral tape",
      "tension free vaginal tape",
      "suction evacuation",
      "cautery to cervix",
    ],
    specialty: specialty("Obstetrics & Gynecology", "النساء والتوليد", "OBSTETRICS_GYNECOLOGY"),
  },
  {
    keywords: [
      "cystoscopy",
      "nephrectomy",
      "nephrostomy",
      "pcnl",
      "prostatectomy",
      "transurethral",
      "transerethal",
      "vasectomy",
      "circumcision",
      "hydrocele",
      "orchidectomy",
      "orchidopexy",
      "paraphimosis",
      "phimosis",
      "suprapubic catheter",
      "ureteroscopy",
      "ureteric stent",
      "bladder tumour",
      "cystotomy",
      "nephrolithotomy",
      "varicocele",
    ],
    specialty: specialty("Urology", "المسالك البولية", "UROLOGY"),
  },
  {
    keywords: [
      "colonoscopy",
      "upper gastrointestinal endoscopy",
      "ercp",
      "capsule endoscopy",
      "oesophagectomy",
      "oesophagoscopy",
      "gastrectomy",
      "gastrostomy",
      "gastrojejunostomy",
      "pyloromyotomy",
      "whipples",
      "transduodenal",
      "liver biopsy",
      "liver resection",
      "liver abscess",
      "hydatid cyst",
      "pancreatitis",
      "paracentesis",
      "cholecystectomy",
      "cholecystoduodenostomy",
      "cholangiogram",
      "biliary drain",
      "biliary stent",
      "swallow meal",
      "upper gi",
    ],
    specialty: specialty("Gastroenterology / Hepatobiliary Surgery", "أمراض الجهاز الهضمي / جراحة الكبد والمرارة", "GASTROENTEROLOGY"),
  },
  {
    keywords: [
      "ct",
      "computed tomography",
      "mri",
      "magnetic resonance",
      "angiogram",
      "embolisation",
      "biopsy under imaging",
      "aspiration drainage under imaging",
      "fistulogram",
      "dacrocystogram",
      "cystogram",
      "ivp",
      "intravenous pyelogram",
      "generic medical imaging",
      "iodinated contrast",
      "catheter check",
      "central vascular access",
      "port-a-cath",
      "plain cath",
    ],
    specialty: specialty("Radiology / Interventional Radiology", "الأشعة / الأشعة التداخلية", "RADIOLOGY"),
  },
  {
    keywords: [
      "anesthesia",
      "sedation",
      "pain procedures",
      "critical care",
      "home sleep study",
    ],
    specialty: specialty("Anesthesia / Pain / Critical Care", "التخدير / علاج الألم / العناية المركزة", "ANESTHESIA"),
  },
  {
    keywords: [
      "botulinium",
      "filler",
      "chemical peeling",
      "laser hair removal",
      "hydrafacial",
      "isotretinoin",
      "microneedling",
      "phototherapy",
      "q switched",
      "pico laser",
      "regenera activa",
      "skin lesion treatment",
      "chemabrasion",
      "dermabrasion",
      "vermilionectomy",
      "facelift",
      "cosmetic surgery",
      "skin graft",
      "excision of a skin lesion",
      "flap repair",
      "lipectomy",
      "liposuction",
      "apronectomy",
    ],
    specialty: specialty("Plastic / Dermatologic Surgery", "جراحة التجميل / الجلدية", "PLASTIC_DERMATOLOGY"),
  },
  {
    keywords: [
      "allergen immunotherapy",
      "allergy skin test",
      "drug challenge testing",
    ],
    specialty: specialty("Allergy & Immunology", "الحساسية والمناعة", "ALLERGY_IMMUNOLOGY"),
  },
  {
    keywords: [
      "blood and blood products",
      "blood transfusion",
    ],
    specialty: specialty("Transfusion Medicine", "طب نقل الدم", "TRANSFUSION_MEDICINE"),
  },
  {
    keywords: [
      "breast abscess",
      "breast biopsy",
      "breast microdochotomy",
      "breast wide local excision",
      "fibroadenoma",
      "mastectomy",
      "reduction mammoplasty",
      "subcutaneous mastectomy",
      "nonpalpable breast lump",
      "breast",
    ],
    specialty: specialty("Breast Surgery", "جراحة الثدي", "BREAST_SURGERY"),
  },
  {
    keywords: [
      "thyroidectomy",
      "parathyroid",
    ],
    specialty: specialty("Endocrine Surgery", "جراحة الغدد الصماء", "ENDOCRINE_SURGERY"),
  },
];

const IMAGING_GUIDED_KEYWORDS = [
  "under imaging",
  "ct-guided",
  "ultrasound-guided",
  "fluoroscopy",
  "angiogram",
  "embolisation",
  "catheter",
  "contrast injection",
  "biopsy under imaging",
  "aspiration drainage under imaging",
  "fistulogram",
  "sinogram",
  "cystogram",
  "ivp",
  "intravenous pyelogram",
  "generic medical imaging",
  "iodinated contrast",
];

function isImagingGuided(procedureNameEn: string): boolean {
  const lower = procedureNameEn.toLowerCase();
  return IMAGING_GUIDED_KEYWORDS.some((k) => lower.includes(k));
}

function correctRadiologyMisclassification(
  procedureNameEn: string,
  currentSpecialty: SpecialtyInfo,
): SpecialtyInfo {
  if (!currentSpecialty.nameEn.toLowerCase().includes("radiology")) return currentSpecialty;
  if (isImagingGuided(procedureNameEn)) return currentSpecialty;

  const lower = procedureNameEn.toLowerCase();

  if (
    lower.includes("abdominoperineal") ||
    lower.includes("rectum") ||
    lower.includes("anal") ||
    lower.includes("perineal") ||
    lower.includes("hemorrhoid") ||
    lower.includes("haemorrhoid") ||
    lower.includes("fistula in ano") ||
    lower.includes("fissure") ||
    lower.includes("appendic") ||
    lower.includes("colectomy") ||
    lower.includes("colostomy") ||
    lower.includes("bowel") ||
    lower.includes("intussusception") ||
    lower.includes("pilonidal")
  ) {
    return specialty("Colorectal Surgery / General Surgery", "جراحة القولون والمستقيم / الجراحة العامة", "COLORECTAL_SURGERY");
  }

  if (lower.includes("mastectomy") || lower.includes("breast")) {
    return specialty("Breast Surgery", "جراحة الثدي", "BREAST_SURGERY");
  }

  if (lower.includes("thyroidectomy") || lower.includes("parathyroid")) {
    return specialty("Endocrine Surgery", "جراحة الغدد الصماء", "ENDOCRINE_SURGERY");
  }

  if (lower.includes("hernia")) {
    return specialty("General Surgery / Other", "الجراحة العامة / أخرى", "GENERAL_SURGERY");
  }

  if (
    lower.includes("lipectomy") ||
    lower.includes("liposuction") ||
    lower.includes("apronectomy") ||
    lower.includes("abdominoplasty") ||
    lower.includes("skin graft") ||
    lower.includes("facelift") ||
    lower.includes("rhinoplasty") ||
    lower.includes("vermilionectomy") ||
    lower.includes("warts removal") ||
    lower.includes("skin lesion")
  ) {
    return specialty("Plastic / Dermatologic Surgery", "جراحة التجميل / الجلدية", "PLASTIC_DERMATOLOGY");
  }

  if (lower.includes("endometrial resection") || lower.includes("endometrial ablation")) {
    return specialty("Obstetrics & Gynecology", "النساء والتوليد", "OBSTETRICS_GYNECOLOGY");
  }

  // Fallback for any other surgical procedure misclassified as Radiology.
  return specialty("General Surgery / Other", "الجراحة العامة / أخرى", "GENERAL_SURGERY");
}

export function inferSpecialty(procedureNameEn: string, currentSpecialty: SpecialtyInfo): SpecialtyInfo {
  const lower = procedureNameEn.toLowerCase();
  for (const rule of SPECIALTY_KEYWORDS) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return correctRadiologyMisclassification(procedureNameEn, rule.specialty);
    }
  }
  return correctRadiologyMisclassification(procedureNameEn, currentSpecialty);
}

const ANATOMY_KEYWORDS: Array<{ keywords: string[]; anatomy: string }> = [
  // Vascular
  { keywords: ["abdominal aortic aneurysm"], anatomy: "Abdominal aorta and surrounding arteries" },
  { keywords: ["arteriovenous goretex", "goretex loop graft"], anatomy: "Forearm or upper-arm artery and vein with synthetic graft for dialysis access" },
  { keywords: ["arteriovenous fistula"], anatomy: "Forearm or upper-arm artery and vein connection for dialysis access" },
  { keywords: ["carotid endarterectomy"], anatomy: "Carotid artery in the neck" },
  { keywords: ["carotid stenting"], anatomy: "Carotid artery in the neck" },
  { keywords: ["femoropopliteal bypass"], anatomy: "Femoral and popliteal arteries in the thigh and knee region" },
  { keywords: ["ivc filter"], anatomy: "Inferior vena cava in the abdomen" },
  { keywords: ["varicose veins"], anatomy: "Superficial leg veins" },
  // Cardiac
  { keywords: ["cardioversion"], anatomy: "Chest, heart, and external defibrillator pads" },
  // Neuro
  { keywords: ["cerebral aneurysm coiling", "flow diverter"], anatomy: "Brain arteries and aneurysm" },
  { keywords: ["cerebral thrombectomy"], anatomy: "Brain arteries and clot retrieval path" },
  { keywords: ["cerebral vasospasm"], anatomy: "Brain arteries at the base of the skull" },
  { keywords: ["cranial surgery"], anatomy: "Skull and underlying brain" },
  { keywords: ["spine surgery"], anatomy: "Spinal column and spinal canal" },
  { keywords: ["lumbar puncture"], anatomy: "Lower spine and spinal canal" },
  // Ophthalmology
  { keywords: ["cataract surgery"], anatomy: "Eye, cornea, lens, and iris" },
  { keywords: ["corneal transplant"], anatomy: "Cornea and eye surface" },
  { keywords: ["vitrectomy"], anatomy: "Eye, vitreous cavity, and retina" },
  { keywords: ["pterygium"], anatomy: "Eye surface and conjunctiva" },
  { keywords: ["ptosis"], anatomy: "Upper eyelid and levator muscle" },
  { keywords: ["blepharoplasty", "eyelid surgery"], anatomy: "Upper and/or lower eyelids" },
  { keywords: ["entropion", "ectropion"], anatomy: "Eyelid margin and eye surface" },
  { keywords: ["chalazion"], anatomy: "Eyelid and meibomian gland" },
  { keywords: ["dacryocystorhinostomy", "dacrocystogram"], anatomy: "Lacrimal duct, tear sac, and nasal cavity" },
  { keywords: ["intravitreal", "eylea", "lucentis", "ozurdex"], anatomy: "Eye, vitreous cavity, and macula" },
  { keywords: ["femto-lasik", "femto-intracorneal"], anatomy: "Cornea and eye surface" },
  { keywords: ["punctoplasty"], anatomy: "Eyelid punctum and tear drainage" },
  // ENT
  { keywords: ["stapedectomy"], anatomy: "Middle ear, stapes bone, and oval window" },
  { keywords: ["tympanoplasty", "myringotomy"], anatomy: "Tympanic membrane and middle ear" },
  { keywords: ["mastoidectomy"], anatomy: "Mastoid bone and middle ear" },
  { keywords: ["otoplasty"], anatomy: "External ear and cartilage" },
  { keywords: ["microlaryngoscopy", "vocal cord injection", "thyroplasty"], anatomy: "Larynx and vocal cords" },
  { keywords: ["tracheostomy"], anatomy: "Neck, trachea, and stoma site" },
  { keywords: ["tonsillectomy", "adenotonsillectomy", "adenoid"], anatomy: "Oropharynx, tonsils, and adenoids" },
  { keywords: ["septoplasty", "turbinectomy", "rhinoplasty", "sino-nasal", "sinonasal"], anatomy: "Nasal septum, turbinates, and nasal cavity" },
  { keywords: ["uvulopalatopharyngoplasty", "palatoplasty"], anatomy: "Soft palate, uvula, and oropharynx" },
  { keywords: ["parotidectomy"], anatomy: "Parotid gland and facial nerve region" },
  { keywords: ["neck dissection"], anatomy: "Neck lymph nodes and vessels" },
  // Orthopedics
  { keywords: ["knee arthroscopy"], anatomy: "Knee joint" },
  { keywords: ["shoulder arthroscopy"], anatomy: "Shoulder joint" },
  { keywords: ["arthroplasty"], anatomy: "Affected joint and surrounding bones" },
  { keywords: ["arthrogram"], anatomy: "Affected joint and needle/contrast path" },
  { keywords: ["ganglion", "bursa"], anatomy: "Wrist/hand or other joint ganglion/bursa site" },
  // Obstetrics / Gynecology
  { keywords: ["caesarean section"], anatomy: "Uterus, lower abdominal wall, and fetus in utero" },
  { keywords: ["amniocentesis", "chorionic villus"], anatomy: "Uterus, placenta, and amniotic fluid" },
  { keywords: ["hysteroscopy", "d & c", "dilation", "curettage"], anatomy: "Uterus and cervical canal" },
  { keywords: ["cone biopsy", "lletz"], anatomy: "Cervix and transformation zone" },
  { keywords: ["termination of pregnancy"], anatomy: "Uterus and cervix" },
  { keywords: ["ectopic pregnancy"], anatomy: "Uterus and fallopian tube" },
  { keywords: ["ovarian cystectomy", "oophorectomy"], anatomy: "Ovary and adjacent pelvic structures" },
  { keywords: ["vaginal repair"], anatomy: "Vaginal wall and pelvic support" },
  { keywords: ["bartholin"], anatomy: "Bartholin gland region" },
  { keywords: ["female sterilisation"], anatomy: "Fallopian tubes" },
  { keywords: ["endometrial ablation"], anatomy: "Uterine lining" },
  { keywords: ["uterine artery embolisation"], anatomy: "Uterus and uterine arteries" },
  { keywords: ["hysterosalpingogram"], anatomy: "Uterus and fallopian tubes with contrast" },
  { keywords: ["intrauterine device"], anatomy: "Uterus and intrauterine device placement" },
  { keywords: ["midurethral tape", "tension free vaginal tape"], anatomy: "Urethra, bladder neck, and vaginal wall" },
  { keywords: ["suction evacuation"], anatomy: "Uterus and cervical canal" },
  { keywords: ["cautery to cervix"], anatomy: "Cervix" },
  // Urology
  { keywords: ["cystoscopy"], anatomy: "Bladder, urethra, and ureteric orifices" },
  { keywords: ["ureteroscopy"], anatomy: "Ureter and kidney" },
  { keywords: ["nephrectomy"], anatomy: "Kidney and surrounding retroperitoneum" },
  { keywords: ["nephrostomy"], anatomy: "Kidney and nephrostomy tube tract" },
  { keywords: ["pcnl"], anatomy: "Kidney and percutaneous access tract" },
  { keywords: ["prostatectomy", "transurethral", "transerethal"], anatomy: "Prostate, bladder neck, and urethra" },
  { keywords: ["vasectomy"], anatomy: "Vas deferens and scrotum" },
  { keywords: ["circumcision"], anatomy: "Penis and foreskin" },
  { keywords: ["hydrocele"], anatomy: "Scrotum and tunica vaginalis" },
  { keywords: ["orchidectomy", "orchidopexy"], anatomy: "Testis and scrotum / inguinal canal" },
  { keywords: ["paraphimosis"], anatomy: "Penis and foreskin" },
  { keywords: ["suprapubic catheter"], anatomy: "Bladder and suprapubic catheter insertion site" },
  { keywords: ["varicocele"], anatomy: "Testicular veins and scrotum" },
  // GI / Hepatobiliary
  { keywords: ["cholecystectomy"], anatomy: "Gallbladder, liver, bile ducts, upper right abdomen" },
  { keywords: ["appendicectomy"], anatomy: "Appendix and lower right abdomen" },
  { keywords: ["colonoscopy"], anatomy: "Large intestine and rectum" },
  { keywords: ["upper gastrointestinal endoscopy"], anatomy: "Esophagus, stomach, and duodenum" },
  { keywords: ["ercp"], anatomy: "Bile ducts, pancreatic duct, and duodenum" },
  { keywords: ["capsule endoscopy"], anatomy: "Small intestine with capsule endoscope" },
  { keywords: ["oesophagectomy"], anatomy: "Esophagus and stomach" },
  { keywords: ["oesophagoscopy", "rigid oesophagoscopy"], anatomy: "Esophagus" },
  { keywords: ["gastrectomy"], anatomy: "Stomach and surrounding organs" },
  { keywords: ["gastrostomy", "gastrojejunostomy"], anatomy: "Stomach and abdominal wall with feeding tube" },
  { keywords: ["pyloromyotomy"], anatomy: "Pylorus and stomach outlet" },
  { keywords: ["whipples"], anatomy: "Pancreas, duodenum, bile duct, and surrounding structures" },
  { keywords: ["transduodenal sphincteroplasty"], anatomy: "Duodenum and sphincter of Oddi" },
  { keywords: ["liver biopsy"], anatomy: "Liver" },
  { keywords: ["liver resection"], anatomy: "Liver and resection margin" },
  { keywords: ["liver abscess"], anatomy: "Liver abscess cavity" },
  { keywords: ["hydatid cyst"], anatomy: "Liver and hydatid cyst" },
  { keywords: ["pancreatitis"], anatomy: "Pancreas and surrounding tissues" },
  { keywords: ["paracentesis"], anatomy: "Abdominal cavity and ascitic fluid" },
  { keywords: ["cholangiogram", "biliary drain", "biliary stent"], anatomy: "Bile ducts and biliary tree" },
  { keywords: ["swallow meal"], anatomy: "Pharynx and esophagus during swallowing" },
  // General surgery / abdominal wall
  { keywords: ["hernia"], anatomy: "Abdominal wall and hernia sac at affected site" },
  { keywords: ["abdominoplasty"], anatomy: "Abdominal wall and skin" },
  { keywords: ["lipectomy", "apronectomy"], anatomy: "Abdominal wall and excess skin/fat" },
  { keywords: ["lipectomy - suction", "liposuction"], anatomy: "Subcutaneous fat layer" },
  { keywords: ["pilonidal sinus"], anatomy: "Sacrococcygeal region" },
  { keywords: ["skin graft"], anatomy: "Skin donor and recipient sites" },
  { keywords: ["excision of a skin lesion", "flap repair"], anatomy: "Skin lesion site and surrounding tissue" },
  { keywords: ["ingrown toenail"], anatomy: "Toenail and nail bed" },
  { keywords: ["burns"], anatomy: "Affected skin and superficial tissue layers" },
  { keywords: ["amputation"], anatomy: "Affected limb and amputation level" },
  { keywords: ["laparotomy"], anatomy: "Abdominal cavity and incision" },
  { keywords: ["laparoscopy"], anatomy: "Abdominal cavity with laparoscope and ports" },
  { keywords: ["laparostomy"], anatomy: "Open abdomen with temporary closure" },
  { keywords: ["abdominoperineal resection"], anatomy: "Rectum, anus, perineum, and lower pelvis" },
  { keywords: ["intussusception"], anatomy: "Intestine and intussuscepted bowel segment" },
  { keywords: ["fistula in ano", "ischiorectal", "perianal abscess"], anatomy: "Anal canal and perianal tissues" },
  { keywords: ["fistula faecal", "small bowel gastric fistula"], anatomy: "Bowel and connected organ at fistula site" },
  { keywords: ["haemorrhoid"], anatomy: "Anal canal and haemorrhoidal cushions" },
  { keywords: ["bariatric"], anatomy: "Stomach and bariatric surgical anatomy" },
  { keywords: ["thyroidectomy"], anatomy: "Thyroid gland and neck structures" },
  { keywords: ["parotidectomy"], anatomy: "Parotid gland and facial nerve region" },
  // Breast
  { keywords: ["mastectomy"], anatomy: "Breast and chest wall" },
  { keywords: ["breast abscess"], anatomy: "Breast abscess cavity" },
  { keywords: ["breast biopsy", "breast wide local excision"], anatomy: "Breast tissue and target lesion" },
  { keywords: ["breast microdochotomy"], anatomy: "Breast duct and nipple area" },
  { keywords: ["fibroadenoma"], anatomy: "Breast lump and surrounding tissue" },
  { keywords: ["reduction mammoplasty", "subcutaneous mastectomy"], anatomy: "Breast and chest wall" },
  { keywords: ["nonpalpable breast lump localisation"], anatomy: "Breast and localised wire/marker" },
  // Plastic / derm
  { keywords: ["facelift"], anatomy: "Face and superficial tissue planes" },
  { keywords: ["rhinoplasty"], anatomy: "Nose and nasal skeleton" },
  { keywords: ["vermilionectomy"], anatomy: "Vermilion border of the lip" },
  { keywords: ["warts"], anatomy: "Skin wart and surrounding skin" },
  { keywords: ["botulinium"], anatomy: "Facial muscles and injection sites" },
  { keywords: ["filler"], anatomy: "Facial soft tissue and injection planes" },
  // Allergy
  { keywords: ["allergy skin test"], anatomy: "Forearm or back skin with test sites" },
  { keywords: ["allergen immunotherapy"], anatomy: "Upper arm subcutaneous injection site" },
  { keywords: ["drug challenge testing"], anatomy: "Arm or oral drug administration path" },
  // Transfusion
  { keywords: ["blood and blood products", "blood transfusion"], anatomy: "Intravenous line, blood bag, and infusion pathway" },
  // Radiology / process
  { keywords: ["ct", "computed tomography"], anatomy: "Whole-body or region-specific CT scanner cross-section" },
  { keywords: ["mri", "magnetic resonance"], anatomy: "MRI scanner and target body region" },
  { keywords: ["angiogram"], anatomy: "Arterial tree and catheter access site" },
  { keywords: ["embolisation"], anatomy: "Target artery/vein and embolization material" },
  { keywords: ["biopsy under imaging"], anatomy: "Target lesion and biopsy needle path under imaging" },
  { keywords: ["aspiration drainage under imaging"], anatomy: "Fluid collection and drainage catheter" },
  { keywords: ["fistulogram", "sinogram"], anatomy: "Fistula/sinus tract and contrast outline" },
  { keywords: ["cystogram"], anatomy: "Bladder and contrast-filled urinary tract" },
  { keywords: ["ivp", "intravenous pyelogram"], anatomy: "Kidneys, ureters, and bladder with contrast" },
  { keywords: ["generic medical imaging"], anatomy: "Imaging equipment and relevant body region" },
  { keywords: ["iodinated contrast injection"], anatomy: "Intravenous line and contrast flow" },
  { keywords: ["catheter check"], anatomy: "Existing catheter and contrast injection path" },
  { keywords: ["central vascular access", "port-a-cath", "plain cath"], anatomy: "Central vein and catheter/port device" },
  // Anesthesia / critical care
  { keywords: ["anesthesia"], anatomy: "Airway, lungs, and anesthesia monitoring setup" },
  { keywords: ["pain procedures"], anatomy: "Target nerve or joint for pain intervention" },
  { keywords: ["critical care"], anatomy: "Critical care environment and monitoring devices" },
  { keywords: ["home sleep study"], anatomy: "Sleep monitoring sensors and breathing" },
  // Other specific
  { keywords: ["fine needle aspiration"], anatomy: "Target nodule/lesion and fine needle" },
  { keywords: ["abdominoperineal resection"], anatomy: "Rectum, anus, perineum, and lower pelvis" },
];

export function inferAnatomyRegion(procedureNameEn: string, specialtyNameEn: string): string {
  const lower = procedureNameEn.toLowerCase();

  // Approved exception
  if (APPROVED_LAP_CHOLE.keys.has(slugify(procedureNameEn)) || lower.includes("cholecystectomy")) {
    return APPROVED_LAP_CHOLE.anatomyRegion;
  }

  for (const rule of ANATOMY_KEYWORDS) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule.anatomy;
    }
  }

  // Fallback based on specialty
  if (specialtyNameEn.toLowerCase().includes("radiology")) {
    return "Relevant body region for imaging or interventional procedure";
  }
  if (specialtyNameEn.toLowerCase().includes("anesthesia")) {
    return "Airway and anesthesia monitoring setup";
  }
  if (specialtyNameEn.toLowerCase().includes("allergy")) {
    return "Skin or subcutaneous administration site";
  }
  if (specialtyNameEn.toLowerCase().includes("transfusion")) {
    return "Intravenous line and blood product infusion pathway";
  }

  return `Anatomy specific to ${procedureNameEn}`;
}

const PROCESS_KEYWORDS = [
  "anesthesia",
  "sedation",
  "imaging",
  "ct",
  "computed tomography",
  "mri",
  "magnetic resonance",
  "angiogram",
  "embolisation",
  "biopsy under imaging",
  "aspiration drainage under imaging",
  "fistulogram",
  "sinogram",
  "cystogram",
  "ivp",
  "intravenous pyelogram",
  "generic medical imaging",
  "iodinated contrast",
  "catheter check",
  "central vascular access",
  "port-a-cath",
  "plain cath",
  "pain procedures",
  "critical care",
  "home sleep study",
  "allergy skin test",
  "drug challenge testing",
  "blood and blood products",
  "blood transfusion",
  "consultation",
  "counseling",
  "consent for anesthesia",
  "fine needle aspiration",
];

export function inferIllustrationType(procedureNameEn: string): "anatomy_procedure_education" | "process_education" {
  const lower = procedureNameEn.toLowerCase();
  if (
    PROCESS_KEYWORDS.some((k) => {
      // Short tokens like "ct" must match as a whole word to avoid matching
      // surgical suffixes such as "ectomy", "mastoidectomy", etc.
      if (k.length <= 3) return new RegExp(`\\b${k}\\b`).test(lower);
      return lower.includes(k);
    })
  ) {
    return "process_education";
  }
  return "anatomy_procedure_education";
}

// Arabic translations for common procedures. Null means keep English + add note.
const ARABIC_NAMES: Record<string, string | null> = {
  "abdominal-aortic-aneurysm": "تمدد الأبهر البطني",
  "abdominoperineal-resection-of-rectum": "استئصال المستقيم البطني العجاني",
  "abdominoplasty": "تجميل البطن",
  "adenotonsillectomy": "استئصال اللوزتين والغدة الأدينية",
  "allergen-immunotherapy": "علاج المناعة بالمستضدات",
  "allergy-skin-test-consent-and-informed": "اختبار الحساسية الجلدي",
  "amniocentesis-chorionic-villus-sampling": "أخذ عينة السائل الأمنيوسي أو الزغابات المشيمية",
  "amputation": "بتر العضو",
  "anesthesia-patient-consent": "موافقة المريض على التخدير",
  "angiogram-and-plasty-stenting": "تصوير الأوعية الدموية ووضع الدعامة",
  "appendicectomy-open": "استئصال الزائدة الدودية بالجراحة المفتوحة",
  "arteriovenous-fistula": " fistula دموية شريانية وريدية",
  "arteriovenous-goretex-loop-graft": " graft جورتكس وريدي شرياني",
  "arthrogram": "تصوير المفصل بالحقن الظليل",
  "arthroplasty-consent": "موافقة استبدال المفصل",
  "bartholin-s-glands": "غدة بارثولين",
  "biopsy-under-imaging": "أخذ خزعة تحت التصوير الإشعاعي",
  "blepharoplasty": "تجميل الجفن",
  "blood-and-blood-products-transfusion": "نقل الدم ومشتقاته",
  "breast-abscess-haematoma": "خراج أو ورم دموي في الثدي",
  "breast-biopsy-aspiration": "خزعة أو شفط الثدي",
  "breast-microdochotomy": "جراحة قنوات الثدي الدقيقة",
  "breast-wide-local-excision": "استئصال محدود في الثدي",
  "burch-colposuspension": "تعليق عنق الرحم برباط كوبر",
  "burns": "الحروق",
  "caesarean-section": "الولادة القيصرية",
  "capsule-endoscopy": "تنظير الكبسولة",
  "cardioversion": "إعادة ضبط القلب بالصدمات الكهربائية",
  "carotid-endarterectomy": "استئصال بطانة الشريان السباتي",
  "carotid-stenting": "تركيب دعامة في الشريان السباتي",
  "cataract-surgery": "جراحة إعتام عدسة العين",
  "cautery-to-cervix": "كي عنق الرحم",
  "central-vascular-access-device-insertion": "إدخال جهاز وصول وريدي مركزي",
  "cerebral-angiogram-aneurysm-coiling-flow-diverter": "تصوير شرايين الدماغ مع لف التمدد أو جهاز تحويل التدفق",
  "cerebral-angiogram-cerebral-thrombectomy": "تصوير شرايين الدماغ مع استخراج الخثرة",
  "cerebral-vasospasm-treatment": "علاج تشنج شرايين الدماغ",
  "chalazion-curettage": "كحت الكلازيون",
  "chemabrasion-and-dermabrasion": "تقشير الجلد الكيميائي والميكانيكي",
  "cholangiogram-percutaneous-or-biliary-drainstent": "تصوير القنوات الصفراوية أو تصريف/دعامة صفراوية",
  "cholecystectomy-laparoscopic": "استئصال المرارة بالمنظار",
  "cholecystectomy-open": "استئصال المرارة بالجراحة المفتوحة",
  "circumcision-adult": "ختان البالغين",
  "circumcision-child-young-person": "ختان الأطفال",
  "colonoscopy": "تنظير القولون",
  "colposuspension": "تعليق عنق الرحم",
  "cone-biopsy": "خزعة مخروطية من عنق الرحم",
  "cystoscopy": "تنظير المثانة",
  "cystoscopy-and-removal-of-bladder-tumour": "تنظير المثانة وإزالة ورم المثانة",
  "cystoscopy-and-ureteroscopy-and-fragmentation-of-stone-lithocast": "تنظير المثانة والحالب وتفتيت الحصاة",
  "d-c-dilation-curettage": "كشط الرحم وتوسيع عنقه",
  "dacryocystorhinostomy": "ربط كيس الدمع بالأنف",
  "diagnostic-hysteroscopy-dilatation-curettage-d-c": "تنظير الرحم التشخيصي مع كشط الرحم",
  "drainage-of-a-pseudocyst": "تصريف كيسة زائفة",
  "drug-challenge-testing": "اختبار تحدي الدواء",
  "embolisation-of-blood-vessels-any-body-part": "انسداد الأوعية الدموية",
  "embolisation-uterine-artery-eua": "انسداد شريان الرحم",
  "endometrial-resection-ablation": "استئصال/تخثير بطانة الرحم",
  "ercp-gastroendoscopy": "تنظير القنوات الصفراوية والبنكرياسية",
  "excision-of-a-skin-lesion-or-subcutaneous-lump": "استئصال آفة جلدية أو كتلة تحت الجلد",
  "eyelid-entropion-or-ectropion-repair": "تصحيح انقلاب أو انعراج الجفن",
  "eyelid-surgery-blepharoplasty": "جراحة الجفن (تجميل الجفن)",
  "femoropopliteal-bypass": "جسر فخذي ركبي",
  "fine-needle-aspiration": "الشفط بالإبرة الدقيقة",
  "fistula-in-ano": "ناسور شرجي",
  "gastrectomy": "استئصال المعدة",
  "gastrostomy-insertion": "إدخال أنبوب تغذية معدي",
  "haemorrhoid-removal": "إزالة البواسير",
  "hernia-ingunal-repair-child-young-person": "ترتيب الفتق الإربي للأطفال",
  "hernia-laparoscopic-inguinal-hernia-repair": "ترتيب الفتق الإربي بالمنظار",
  "hernia-open-inguinal-hernia-repair": "ترتيب الفتق الإربي بالجراحة المفتوحة",
  "hernia-ventral-incision-umbilical": "ترتيب الفتق البطني/السري/الجراحي",
  "hydatid-cyst-of-the-liver": "كيسة مائية في الكبد",
  "hydrocele-repair-child-young-person": "علاج استسقاء الخصية للأطفال",
  "hysterosalpingogram-hsg": "تصوير الرحم وقنوات فالوب",
  "hysteroscopy-and-curettage": "تنظير الرحم مع الكشط",
  "informed-consent-for-corneal-transplant-surgery": "موافقة زرع القرنية",
  "ingrown-toenail-s-removal-of-nail-bed": "ظفر القدم النامي وإزالة سرير الظفر",
  "insertion-of-progesterone-releasing-intrauterine-device": "إدخال جهاز داخل الرحم ينتج البروجستيرون",
  "insertion-of-suburethral-and-midurethral-tape-for-stress-incontinence-and-cystoscopy": "إدخال شريحة تحت الإحليل مع تنظير المثانة",
  "intussusception": "انغلاف الأمعاء",
  "inverted-nipple-repair": "تصحيح الحلمة المقلوبة",
  "ivc-filter-insertion-removal": "إدخال أو إزالة فلتر الوريد الأجوف السفلي",
  "ivp-intravenous-pyelogram": "تصوير الحالب بالحقن الوريدي",
  "knee-arthroscopy-consent": "موافقة تنظير الركبة",
  "laparoscopy": "منظار البطن",
  "laparotomy": "فتح البطن",
  "large-loop-excision-of-transformation-zone-lletz-of-the-cervix": "استئصال حلقة كبيرة لمنطقة التحول عنق الرحم",
  "liver-biopsy": "خزعة الكبد",
  "liver-resection": "استئصال جزء من الكبد",
  "lumbar-puncture-for-intrathecal-chemotherapy": "بزل القطني لإعطاء العلاج الكيميائي داخل السائل النخاعي",
  "mastectomy": "استئصال الثدي",
  "mri-magnetic-resonance-imaging": "التصوير بالرنين المغناطيسي",
  "myringotomy": "شق الطبلة",
  "nephrectomy": "استئصال الكلى",
  "nonpalpable-breast-lump-localisation": "تموضع كتلة الثدي غير المحسوسة",
  "oesophagectomy": "استئصال المريء",
  "orchidectomy": "استئصال الخصية",
  "orchidopexy-repair-of-undescended-testicles-child-young-person": "تثبيت الخصية المعلقة للأطفال",
  "otoplasty-repair-of-prominent-ears": "تجميل الأذن البارزة",
  "ovarian-cystectomy-oophorectomy": "استئصال كيس المبيض أو المبيض",
  "paracentesis-abdominus": "بزل البطن",
  "paraphimosis-repair": "علاج الانكماش العكسي للقلفة",
  "parotidectomy": "استئصال الغدة النكافية",
  "percutaneous-endoscopic-gastrostomy-tube": "أنبوب تغذية معدي بالمنظار الجلدي",
  "percutaneous-nephrolithotomy-pcnl": "تفتيت حصى الكلى عبر الجلد",
  "pilonidal-sinus": "السinus الشعري العجاني",
  "port-a-cath-insertion": "إدخال بورت الكاث",
  "prostatectomy-radical": "استئصال البروستاتا الجذري",
  "ptosis": "تدلي الجفن",
  "puncture": "ثقب",
  "pyloromyotomy-child-young-person": "شق العضلة العاصرة للمعدة للأطفال",
  "reduction-mammoplasty": "تصغير الثدي",
  "reflux-operation-laparoscopic": "عملية الارتجاع بالمنظار",
  "reflux-operation-open": "عملية الارتجاع بالجراحة المفتوحة",
  "removal-of-ectopic-pregnancy-by-laparoscopy-laparotomy": "إزالة الحمل خارج الرحم بالمنظار أو فتح البطن",
  "removal-of-genital-warts": "إزالة ثآليل الأعضاء التناسلية",
  "rhinoplasty-surgery-consent": "موافقة جراحة تجميل الأنف",
  "septoplasty-and-turbinectomy": "تصحيح الحاجز الأنفي واستئصال الكونشا",
  "shoulder-arthroscopy": "تنظير الكتف",
  "skin-graft": "زرع الجلد",
  "spine-surgery": "جراحة العمود الفقري",
  "stapedectomy-informed-with-consent": "موافقة استئصال الركاب",
  "submucosal-diathemy-smd": "كي تحت المخاطية",
  "suction-evacuation-of-uterine-contents": "شفط محتويات الرحم",
  "supra-pubic-catheter-insertion": "إدخال قسطرة فوق العانة",
  "termination-of-pregnancy-1st-trimester": "إنهاء الحمل في الثلث الأول",
  "termination-of-pregnancy-2nd-trimester": "إنهاء الحمل في الثلث الثاني",
  "thoracentesis-pleural-tap": "بزل الصدر",
  "thyroidectomy": "استئصال الغدة الدرقية",
  "tracheostomy-informed-consent": "موافقة فتح القصبة الهوائية",
  "transduodenal-sphincteroplasty": "توسيع عاصرة أودي عبر الاثني عشر",
  "transerethal-prostatectomy": "استئصال البروستاتا عبر الإحليل",
  "transesophageal-echocardiogram": "تخطيط القلب عبر المريء",
  "upper-gastrointestinal-endoscopy": "تنظير الجهاز الهضمي العلوي",
  "upper-gastrointestinal-endoscopy-for-bleeding": "تنظير الجهاز الهضمي العلوي لنزيف",
  "uvulopalatopharyngoplasty": "تجميل الحنك واللهاة والبلعوم",
  "vaginal-repair-with-or-without-sacrospinous-colpopexy": "ترتيب المهبل مع أو بدون تعليق عظم العجز",
  "varicocele-open": "الدوالي الوريدية للخصية بالجراحة المفتوحة",
  "varicose-veins": "الدوالي الوريدية",
  "vasectomy": "قطع القنوات المنوية",
  "vermilionectomy": "استئصال الشفاه الحمراء",
  "vitrectomy-surgery": "جراحة السائل الزجاجي",
  "vocal-cord-injection-under-la": "حقن الحبال الصوتية تحت التخدير الموضعي",
  "warts": "الثآليل",
  "whipples-operation": "عملية ويبل",
  "wide-local-excision-sentinel-lymph-node-biopsy": "استئصال محدود مع خزعة العقدة اللمفاوية الحارسة",
};

export function getArabicName(canonicalKey: string, procedureNameEn: string): { name: string; note?: string } {
  const mapped = ARABIC_NAMES[canonicalKey];
  if (mapped) return { name: mapped };
  // If no direct mapping, keep English and flag for review.
  return { name: procedureNameEn, note: "Arabic translation requires clinical review." };
}

const ADDITIONAL_ALIASES: Record<string, string[]> = {
  "cholecystectomy-laparoscopic": APPROVED_LAP_CHOLE.aliases,
};

export function getAliases(canonicalKey: string, procedureNameEn: string, procedureNameAr: string): string[] {
  if (ADDITIONAL_ALIASES[canonicalKey]) return ADDITIONAL_ALIASES[canonicalKey];
  return [procedureNameEn, procedureNameAr];
}

export function buildFigureLabsPrompt(row: {
  procedureNameEn: string;
  procedureNameAr: string;
  specialty: string;
  anatomyRegion: string;
  illustrationType: string;
}): string {
  const typeInstruction =
    row.illustrationType === "process_education"
      ? "Focus on the care pathway, device, instrument, or procedural steps rather than detailed internal organ anatomy."
      : "Show the relevant human anatomy clearly and the basic concept of the procedure, including the instrument or treatment path when applicable.";

  return [
    `Create a patient-friendly, non-graphic, non-bloody medical illustration for informed consent education.`,
    ``,
    `Procedure (English): ${row.procedureNameEn}`,
    `Procedure (Arabic): ${row.procedureNameAr}`,
    `Specialty: ${row.specialty}`,
    `Anatomical region / focus: ${row.anatomyRegion}`,
    `Illustration type: ${row.illustrationType}`,
    ``,
    `Requirements:`,
    `- Clean, professional, hospital-grade patient education style`,
    `- ${typeInstruction}`,
    `- Use soft clinical colors on a white or very light background`,
    `- Label the main anatomical structures or steps clearly in English`,
    `- Leave adequate space for Arabic label overlays`,
    `- Include short callout labels for the procedural target or key step`,
    `- Do not include any patient-identifiable information, hospital logos, watermarks, or frightening imagery`,
    `- Landscape orientation, high resolution, suitable for informed consent display`,
    `- Include a blank area at the bottom for the informed consent disclaimer`,
  ].join("\n");
}
