export type ProcedureEducationSectionTemplate = {
  sectionKey: "overview" | "benefits" | "risks" | "alternatives" | "recovery" | "doctor_advice";
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  sortOrder: number;
};

export type ProcedureEducationMediaPlaceholder = {
  assetType: "IMAGE" | "VIDEO";
  architectureType: "image" | "infographic" | "video";
  title: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  metadata: Record<string, unknown>;
};

export type ServierSmartAssetMapping = {
  mappingVersion: string;
  sourceSystem: "SERVIER_SMART";
  libraryRef: string;
  topicTags: string[];
  intendedAudience: "patient" | "caregiver" | "patient_and_caregiver";
  languageCoverage: ("ar" | "en")[];
  licenseTier: "enterprise";
  evidenceGrade: "A" | "B" | "C";
  reviewCycleDays: number;
  lastMetadataReviewBy: string;
};

export type ProcedureEducationEnterpriseItem = {
  procedureCode: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  sections: ProcedureEducationSectionTemplate[];
  mediaPlaceholders: ProcedureEducationMediaPlaceholder[];
  servierSmartMapping: ServierSmartAssetMapping;
};

type ProcedureProfile = {
  procedureCode: string;
  titleEn: string;
  titleAr: string;
  overviewFocusEn: string;
  overviewFocusAr: string;
  benefitFocusEn: string;
  benefitFocusAr: string;
  riskFocusEn: string;
  riskFocusAr: string;
  alternativesEn: string;
  alternativesAr: string;
  recoveryEn: string;
  recoveryAr: string;
  doctorAdviceEn: string;
  doctorAdviceAr: string;
  servierRef: string;
  topicTags: string[];
};

function buildSections(profile: ProcedureProfile): ProcedureEducationSectionTemplate[] {
  return [
    {
      sectionKey: "overview",
      titleEn: "Overview",
      titleAr: "نظرة عامة",
      bodyEn: `${profile.titleEn} is explained in clear patient language with what to expect before, during, and immediately after the procedure. ${profile.overviewFocusEn}`,
      bodyAr: `يتم شرح ${profile.titleAr} بلغة مبسطة للمريض مع توضيح ما يمكن توقعه قبل الإجراء وأثناءه وبعده مباشرة. ${profile.overviewFocusAr}`,
      sortOrder: 10,
    },
    {
      sectionKey: "benefits",
      titleEn: "Benefits",
      titleAr: "الفوائد",
      bodyEn: `The education card highlights expected clinical and quality-of-life gains. ${profile.benefitFocusEn}`,
      bodyAr: `تعرض البطاقة التعليمية الفوائد السريرية المتوقعة وتحسن جودة الحياة. ${profile.benefitFocusAr}`,
      sortOrder: 20,
    },
    {
      sectionKey: "risks",
      titleEn: "Risks",
      titleAr: "المخاطر",
      bodyEn: `Known risks and warning signs are listed with escalation guidance. ${profile.riskFocusEn}`,
      bodyAr: `يتم توثيق المخاطر المعروفة وعلامات التحذير مع إرشادات التصعيد. ${profile.riskFocusAr}`,
      sortOrder: 30,
    },
    {
      sectionKey: "alternatives",
      titleEn: "Alternatives",
      titleAr: "البدائل",
      bodyEn: `Patients are informed of conservative and procedural alternatives when medically appropriate. ${profile.alternativesEn}`,
      bodyAr: `يتم توعية المريض بالبدائل التحفظية والإجرائية عندما تكون مناسبة طبيًا. ${profile.alternativesAr}`,
      sortOrder: 40,
    },
    {
      sectionKey: "recovery",
      titleEn: "Recovery",
      titleAr: "التعافي",
      bodyEn: `Recovery milestones include symptom expectations, medication adherence, and follow-up checkpoints. ${profile.recoveryEn}`,
      bodyAr: `تشمل مراحل التعافي توقعات الأعراض والالتزام بالأدوية ونقاط المتابعة. ${profile.recoveryAr}`,
      sortOrder: 50,
    },
    {
      sectionKey: "doctor_advice",
      titleEn: "Doctor Advice",
      titleAr: "نصيحة الطبيب",
      bodyEn: `Final clinician guidance reinforces informed decision-making and safe home care. ${profile.doctorAdviceEn}`,
      bodyAr: `تؤكد توصيات الطبيب النهائية على اتخاذ قرار مستنير ورعاية منزلية آمنة. ${profile.doctorAdviceAr}`,
      sortOrder: 60,
    },
  ];
}

function buildMediaPlaceholders(profile: ProcedureProfile): ProcedureEducationMediaPlaceholder[] {
  const base = `https://cdn.wathiqcare.online/procedure-education/${profile.procedureCode}`;
  return [
    {
      assetType: "IMAGE",
      architectureType: "image",
      title: `${profile.titleEn} hero visual`,
      sourceUrl: `${base}/images/hero-placeholder.jpg`,
      thumbnailUrl: `${base}/images/hero-thumbnail.jpg`,
      metadata: {
        placeholder: true,
        renderTarget: "card_header",
        localization: "bilingual",
      },
    },
    {
      assetType: "IMAGE",
      architectureType: "infographic",
      title: `${profile.titleEn} patient infographic`,
      sourceUrl: `${base}/infographics/flow-placeholder.jpg`,
      thumbnailUrl: `${base}/infographics/flow-thumbnail.jpg`,
      metadata: {
        placeholder: true,
        renderTarget: "education_body",
        localization: "bilingual",
        infographicType: "journey_timeline",
      },
    },
    {
      assetType: "VIDEO",
      architectureType: "video",
      title: `${profile.titleEn} doctor explainer`,
      sourceUrl: `${base}/videos/explainer-placeholder.mp4`,
      thumbnailUrl: `${base}/videos/explainer-thumbnail.jpg`,
      durationSeconds: 180,
      metadata: {
        placeholder: true,
        renderTarget: "education_media",
        localization: "bilingual",
        transcriptRequired: true,
      },
    },
  ];
}

const PROCEDURE_PROFILES: ProcedureProfile[] = [
  {
    procedureCode: "appendectomy",
    titleEn: "Appendectomy",
    titleAr: "استئصال الزائدة الدودية",
    overviewFocusEn: "The content clarifies urgent symptoms, laparoscopic vs open approach, and anesthesia expectations.",
    overviewFocusAr: "يوضح المحتوى أعراض الطوارئ والفرق بين المنظار والجراحة المفتوحة وتوقعات التخدير.",
    benefitFocusEn: "Rapid infection control and pain relief are emphasized as primary outcomes.",
    benefitFocusAr: "يتم التأكيد على السيطرة السريعة على الالتهاب وتخفيف الألم كأهداف أساسية.",
    riskFocusEn: "Includes bleeding, infection, and bowel injury escalation points.",
    riskFocusAr: "يتضمن نقاط التصعيد المتعلقة بالنزيف والعدوى وإصابة الأمعاء.",
    alternativesEn: "Observation and antibiotics are mentioned only for selected clinical scenarios.",
    alternativesAr: "تُذكر المراقبة والمضادات الحيوية فقط في حالات سريرية مختارة.",
    recoveryEn: "Return-to-activity guidance is staged by pain control and wound healing.",
    recoveryAr: "يتم تنظيم العودة للنشاط وفق التحكم بالألم والتئام الجرح.",
    doctorAdviceEn: "Seek urgent care for persistent fever, vomiting, or increasing abdominal pain.",
    doctorAdviceAr: "اطلب رعاية عاجلة عند استمرار الحرارة أو القيء أو زيادة ألم البطن.",
    servierRef: "SERVIER-SMART-GI-APPEND-001",
    topicTags: ["general-surgery", "acute-abdomen", "laparoscopy"],
  },
  {
    procedureCode: "cholecystectomy",
    titleEn: "Cholecystectomy",
    titleAr: "استئصال المرارة",
    overviewFocusEn: "Covers gallstone disease context and planned day-surgery pathway.",
    overviewFocusAr: "يغطي سياق حصوات المرارة ومسار جراحة اليوم الواحد المخطط.",
    benefitFocusEn: "Focuses on reducing biliary colic and recurrent gallbladder inflammation.",
    benefitFocusAr: "يركز على تقليل المغص المراري والتهاب المرارة المتكرر.",
    riskFocusEn: "Highlights bile duct injury, infection, and anesthesia adverse effects.",
    riskFocusAr: "يسلط الضوء على إصابة القناة الصفراوية والعدوى وآثار التخدير.",
    alternativesEn: "Diet modification and symptom control are listed for temporary management.",
    alternativesAr: "يتم إدراج تعديل الغذاء وضبط الأعراض كإدارة مؤقتة.",
    recoveryEn: "Explains incision care and dietary progression during the first week.",
    recoveryAr: "يشرح العناية بالشق الجراحي وتدرج النظام الغذائي خلال الأسبوع الأول.",
    doctorAdviceEn: "Report jaundice, severe abdominal pain, or persistent nausea immediately.",
    doctorAdviceAr: "أبلغ فورًا عن اليرقان أو ألم بطني شديد أو غثيان مستمر.",
    servierRef: "SERVIER-SMART-GI-CHOLE-002",
    topicTags: ["general-surgery", "gallbladder", "post-op-diet"],
  },
  {
    procedureCode: "colonoscopy",
    titleEn: "Colonoscopy",
    titleAr: "تنظير القولون",
    overviewFocusEn: "Details bowel preparation quality and sedation workflow.",
    overviewFocusAr: "يوضح جودة تحضير الأمعاء وخطوات التهدئة أثناء الإجراء.",
    benefitFocusEn: "Emphasizes early detection of polyps and lower GI pathology.",
    benefitFocusAr: "يؤكد على الاكتشاف المبكر للزوائد والأمراض في الجهاز الهضمي السفلي.",
    riskFocusEn: "Addresses bleeding and perforation risk with post-procedure red flags.",
    riskFocusAr: "يتناول خطر النزيف والثقب مع علامات التحذير بعد الإجراء.",
    alternativesEn: "FIT, CT colonography, and flexible sigmoidoscopy are referenced when relevant.",
    alternativesAr: "تتم الإشارة إلى فحص FIT والتصوير المقطعي للقولون والتنظير السيني عند الحاجة.",
    recoveryEn: "Provides hydration and activity advice for same-day discharge.",
    recoveryAr: "يقدم إرشادات الترطيب والنشاط في يوم الخروج نفسه.",
    doctorAdviceEn: "Escalate immediately for heavy bleeding, severe pain, or fever.",
    doctorAdviceAr: "صعّد فورًا عند نزيف غزير أو ألم شديد أو ارتفاع الحرارة.",
    servierRef: "SERVIER-SMART-GI-COLON-003",
    topicTags: ["gastroenterology", "screening", "sedation"],
  },
  {
    procedureCode: "endoscopy",
    titleEn: "Endoscopy",
    titleAr: "تنظير الجهاز الهضمي العلوي",
    overviewFocusEn: "Explains fasting windows and throat anesthesia expectations.",
    overviewFocusAr: "يشرح فترات الصيام وتوقعات التخدير الموضعي للحلق.",
    benefitFocusEn: "Highlights diagnosis of reflux, ulcers, and upper GI bleeding causes.",
    benefitFocusAr: "يسلط الضوء على تشخيص الارتجاع والقرح وأسباب نزيف الجهاز الهضمي العلوي.",
    riskFocusEn: "Mentions aspiration, bleeding, and rare perforation risk.",
    riskFocusAr: "يذكر خطر الشفط والنزيف وخطر الثقب النادر.",
    alternativesEn: "Noninvasive tests are described with limitations compared to direct visualization.",
    alternativesAr: "يتم شرح الفحوصات غير التدخلية مع محدوديتها مقارنة بالرؤية المباشرة.",
    recoveryEn: "Advises short monitoring and delayed oral intake until swallowing is safe.",
    recoveryAr: "ينصح بمراقبة قصيرة وتأخير الأكل حتى تصبح البلع آمنًا.",
    doctorAdviceEn: "Contact the team for chest pain, breathing issues, or black stools.",
    doctorAdviceAr: "تواصل مع الفريق عند ألم صدري أو صعوبة تنفس أو براز أسود.",
    servierRef: "SERVIER-SMART-GI-ENDO-004",
    topicTags: ["gastroenterology", "upper-gi", "day-procedure"],
  },
  {
    procedureCode: "blood-transfusion",
    titleEn: "Blood Transfusion",
    titleAr: "نقل الدم",
    overviewFocusEn: "Clarifies component types, compatibility checks, and bedside monitoring.",
    overviewFocusAr: "يوضح أنواع مكونات الدم وفحوص التوافق والمراقبة بجانب السرير.",
    benefitFocusEn: "Describes hemodynamic stabilization and oxygen-carrying improvement.",
    benefitFocusAr: "يصف استقرار الدورة الدموية وتحسن نقل الأكسجين.",
    riskFocusEn: "Includes allergic reaction, febrile reaction, and volume overload warnings.",
    riskFocusAr: "يتضمن التحذير من الحساسية والتفاعل الحموي وزيادة السوائل.",
    alternativesEn: "Iron therapy, EPO, and blood conservation pathways are listed.",
    alternativesAr: "يتم إدراج علاج الحديد والإريثروبويتين ومسارات حفظ الدم.",
    recoveryEn: "Post-transfusion monitoring windows and delayed reaction checks are documented.",
    recoveryAr: "يتم توثيق فترات المراقبة بعد النقل وفحص التفاعلات المتأخرة.",
    doctorAdviceEn: "Escalate for rash, dyspnea, fever, flank pain, or dark urine.",
    doctorAdviceAr: "صعّد عند ظهور طفح أو ضيق تنفس أو حرارة أو ألم جانبي أو بول داكن.",
    servierRef: "SERVIER-SMART-HEMA-TRANS-005",
    topicTags: ["hematology", "transfusion", "patient-safety"],
  },
  {
    procedureCode: "cesarean-section",
    titleEn: "Cesarean Section",
    titleAr: "الولادة القيصرية",
    overviewFocusEn: "Outlines delivery-room flow, anesthesia plan, and neonatal handoff.",
    overviewFocusAr: "يوضح مسار غرفة الولادة وخطة التخدير وتسليم المولود للفريق.",
    benefitFocusEn: "Highlights maternal-fetal safety in indicated obstetric scenarios.",
    benefitFocusAr: "يسلط الضوء على سلامة الأم والجنين في الحالات التوليدية المحددة.",
    riskFocusEn: "Covers hemorrhage, infection, thrombosis, and future pregnancy implications.",
    riskFocusAr: "يغطي النزيف والعدوى والجلطات وتأثيرات الحمل المستقبلي.",
    alternativesEn: "Trial of labor and assisted vaginal delivery are discussed when suitable.",
    alternativesAr: "تتم مناقشة محاولة الولادة الطبيعية والولادة المساعدة عند الملاءمة.",
    recoveryEn: "Defines mobility goals, pain management, and wound-care timeline.",
    recoveryAr: "يحدد أهداف الحركة والسيطرة على الألم وجدول العناية بالجرح.",
    doctorAdviceEn: "Seek care for heavy bleeding, wound discharge, or severe headache.",
    doctorAdviceAr: "اطلبي الرعاية عند نزيف شديد أو إفرازات الجرح أو صداع شديد.",
    servierRef: "SERVIER-SMART-OBS-CSEC-006",
    topicTags: ["obstetrics", "maternal-care", "postpartum"],
  },
  {
    procedureCode: "cataract-surgery",
    titleEn: "Cataract Surgery",
    titleAr: "جراحة المياه البيضاء",
    overviewFocusEn: "Explains lens replacement process and same-day discharge.",
    overviewFocusAr: "يشرح عملية استبدال العدسة والخروج في نفس اليوم.",
    benefitFocusEn: "Focuses on improved vision quality and functional independence.",
    benefitFocusAr: "يركز على تحسن جودة الرؤية والاستقلالية الوظيفية.",
    riskFocusEn: "Includes infection, retinal detachment warning signs, and pressure spikes.",
    riskFocusAr: "يتضمن العدوى وعلامات انفصال الشبكية وارتفاع ضغط العين.",
    alternativesEn: "Glasses optimization and deferred surgery are discussed for mild symptoms.",
    alternativesAr: "تتم مناقشة تحسين النظارات وتأجيل الجراحة في الأعراض الخفيفة.",
    recoveryEn: "Gives eye-drop schedule, shield use, and activity restrictions.",
    recoveryAr: "يقدم جدول قطرات العين واستخدام واقي العين وقيود النشاط.",
    doctorAdviceEn: "Urgent review is required for sudden vision loss or severe eye pain.",
    doctorAdviceAr: "تتطلب المراجعة العاجلة فقدان مفاجئ للرؤية أو ألم عين شديد.",
    servierRef: "SERVIER-SMART-OPH-CATARACT-007",
    topicTags: ["ophthalmology", "vision", "day-surgery"],
  },
  {
    procedureCode: "mri-with-contrast",
    titleEn: "MRI With Contrast",
    titleAr: "الرنين المغناطيسي مع الصبغة",
    overviewFocusEn: "Describes contrast injection workflow and scanner safety screening.",
    overviewFocusAr: "يصف خطوات حقن الصبغة وفحص الأمان قبل دخول جهاز الرنين.",
    benefitFocusEn: "Highlights improved lesion characterization and diagnostic confidence.",
    benefitFocusAr: "يسلط الضوء على تحسين توصيف الآفات ودقة التشخيص.",
    riskFocusEn: "Mentions contrast reactions and renal-risk screening requirements.",
    riskFocusAr: "يذكر تفاعلات الصبغة ومتطلبات فحص خطورة الكلى.",
    alternativesEn: "Non-contrast MRI, ultrasound, or CT pathways are explained by indication.",
    alternativesAr: "يتم شرح مسارات الرنين دون صبغة أو السونار أو الأشعة المقطعية حسب المؤشر.",
    recoveryEn: "Encourages hydration and delayed reaction awareness for 24 hours.",
    recoveryAr: "يشجع على الترطيب ومراقبة التفاعلات المتأخرة لمدة 24 ساعة.",
    doctorAdviceEn: "Report swelling, breathing changes, or rash after leaving radiology.",
    doctorAdviceAr: "أبلغ عن تورم أو تغير التنفس أو طفح بعد مغادرة قسم الأشعة.",
    servierRef: "SERVIER-SMART-RAD-MRI-008",
    topicTags: ["radiology", "contrast", "diagnostics"],
  },
  {
    procedureCode: "ct-with-contrast",
    titleEn: "CT With Contrast",
    titleAr: "الأشعة المقطعية مع الصبغة",
    overviewFocusEn: "Explains rapid imaging pathway and oral/IV contrast considerations.",
    overviewFocusAr: "يوضح مسار التصوير السريع واعتبارات الصبغة الفموية والوريدية.",
    benefitFocusEn: "Supports urgent diagnosis of vascular and abdominal emergencies.",
    benefitFocusAr: "يدعم التشخيص العاجل للحالات الوعائية والبطنية الطارئة.",
    riskFocusEn: "Lists contrast allergy, nephropathy risk, and extravasation signs.",
    riskFocusAr: "يسرد حساسية الصبغة وخطر اعتلال الكلى وعلامات تسرب الصبغة.",
    alternativesEn: "Non-contrast CT and ultrasound alternatives are documented per indication.",
    alternativesAr: "يتم توثيق بدائل الأشعة المقطعية دون صبغة والسونار حسب الحالة.",
    recoveryEn: "Hydration and follow-up labs are advised for high-risk patients.",
    recoveryAr: "يُنصح بالترطيب ومتابعة التحاليل للمرضى ذوي الخطورة العالية.",
    doctorAdviceEn: "Contact care team for delayed rash, vomiting, or urine output decline.",
    doctorAdviceAr: "تواصل مع الفريق عند طفح متأخر أو قيء أو انخفاض إخراج البول.",
    servierRef: "SERVIER-SMART-RAD-CT-009",
    topicTags: ["radiology", "contrast", "emergency-imaging"],
  },
  {
    procedureCode: "general-surgery",
    titleEn: "General Surgery",
    titleAr: "الجراحة العامة",
    overviewFocusEn: "Provides a cross-procedure framework for informed preparation and consent discussions.",
    overviewFocusAr: "يوفر إطارًا عامًا عبر الإجراءات للتحضير المستنير ومناقشات الموافقة.",
    benefitFocusEn: "Summarizes expected functional improvement and symptom reduction.",
    benefitFocusAr: "يلخص التحسن الوظيفي المتوقع وتقليل الأعراض.",
    riskFocusEn: "Standard surgical risks are mapped with escalation instructions.",
    riskFocusAr: "يتم ربط المخاطر الجراحية القياسية بإرشادات التصعيد.",
    alternativesEn: "Medical management and watchful waiting are documented when applicable.",
    alternativesAr: "يتم توثيق العلاج الدوائي والمراقبة عند الانطباق.",
    recoveryEn: "Includes wound care, mobilization, nutrition, and follow-up adherence guidance.",
    recoveryAr: "يشمل العناية بالجرح والحركة والتغذية والالتزام بالمتابعة.",
    doctorAdviceEn: "Escalate promptly for fever, bleeding, uncontrolled pain, or new weakness.",
    doctorAdviceAr: "صعّد بسرعة عند ارتفاع الحرارة أو النزيف أو ألم غير مسيطر عليه أو ضعف جديد.",
    servierRef: "SERVIER-SMART-GENSURG-010",
    topicTags: ["general-surgery", "perioperative", "patient-education"],
  },
];

export const PROCEDURE_EDUCATION_ENTERPRISE_LIBRARY: ProcedureEducationEnterpriseItem[] = PROCEDURE_PROFILES.map((profile) => ({
  procedureCode: profile.procedureCode,
  titleEn: profile.titleEn,
  titleAr: profile.titleAr,
  summaryEn: `Enterprise education module for ${profile.titleEn} with structured AR/EN sections and media guidance.`,
  summaryAr: `وحدة تعليمية مؤسسية لإجراء ${profile.titleAr} تتضمن أقسامًا منظمة بالعربية والإنجليزية وإرشادات الوسائط.`,
  sections: buildSections(profile),
  mediaPlaceholders: buildMediaPlaceholders(profile),
  servierSmartMapping: {
    mappingVersion: "1.0.0",
    sourceSystem: "SERVIER_SMART",
    libraryRef: profile.servierRef,
    topicTags: profile.topicTags,
    intendedAudience: "patient_and_caregiver",
    languageCoverage: ["ar", "en"],
    licenseTier: "enterprise",
    evidenceGrade: "B",
    reviewCycleDays: 180,
    lastMetadataReviewBy: "clinical-content-governance",
  },
}));

export type ProcedureEducationSeedItem = {
  procedureCode: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
};

export const PROCEDURE_EDUCATION_SAMPLE_LIBRARY: ProcedureEducationSeedItem[] =
  PROCEDURE_EDUCATION_ENTERPRISE_LIBRARY.map((item) => ({
    procedureCode: item.procedureCode,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    summaryEn: item.summaryEn,
    summaryAr: item.summaryAr,
  }));
