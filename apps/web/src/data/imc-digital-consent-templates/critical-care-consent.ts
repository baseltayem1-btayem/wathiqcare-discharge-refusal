export type ConsentLanguageBlock = {
  en: string;
  ar: string;
};

export type ConsentProcedure = {
  id: string;
  title: ConsentLanguageBlock;
  uses: ConsentLanguageBlock;
  risks: ConsentLanguageBlock;
  isDefaultSelected?: boolean;
  physicianCanRemove?: boolean;
  physicianCanAddNotes?: boolean;
};

export type ConsentDynamicField = {
  id: string;
  label: ConsentLanguageBlock;
  type: "text" | "textarea" | "select" | "boolean" | "date" | "time" | "multiselect";
  required?: boolean;
  options?: ConsentLanguageBlock[];
  visibleWhen?: {
    fieldId: string;
    equals: string | boolean;
  };
};

export type DigitalConsentTemplate = {
  id: string;
  formCode: string;
  version: string;
  status: "draft" | "under-review" | "approved";
  source: {
    sourceType: "approved-pdf";
    sourceTitle: string;
    sourceNote: string;
    sourcePdfUrl: string;
  };
  title: ConsentLanguageBlock;
  category: ConsentLanguageBlock;
  specialty: ConsentLanguageBlock;
  branding: {
    organization: ConsentLanguageBlock;
    headerLogo: "IMC";
    footerSecurity: "Secured by WathiqCare";
  };
  patientHeaderFields: string[];
  interpreterSection: {
    requiredFieldId: string;
    presentFieldId: string;
  };
  introduction: ConsentLanguageBlock[];
  procedures: ConsentProcedure[];
  dynamicFields: ConsentDynamicField[];
  refusalSection: {
    enabledFieldId: string;
    refusedProcedureFieldId: string;
    reasonFieldId: string;
    amaRequired: boolean;
    text: ConsentLanguageBlock;
  };
  acknowledgement: ConsentLanguageBlock[];
  signatures: ConsentDynamicField[];
  audit: {
    createdFor: string;
    createdPurpose: string;
    changePolicy: string;
  };
};

export const criticalCareConsentTemplate: DigitalConsentTemplate = {
  id: "imc-critical-care-consent",
  formCode: "IMC MR 1363",
  version: "Jan 2026",
  status: "approved",
  source: {
    sourceType: "approved-pdf",
    sourceTitle: "Critical Care Consent / موافقة الرعاية الحرجة",
    sourceNote:
      "The approved PDF remains the official source. This digital template is a structured operational version for WathiqCare issuance workflow.",
    sourcePdfUrl: "/approved-consent-forms/imc/critical-care-consent--master-consent--2-1.pdf",
  },
  title: {
    en: "Critical Care Consent",
    ar: "موافقة الرعاية الحرجة",
  },
  category: {
    en: "Informed Consent",
    ar: "الموافقات المستنيرة",
  },
  specialty: {
    en: "Critical Care / Intensive Care Unit",
    ar: "الرعاية الحرجة / وحدة العناية المركزة",
  },
  branding: {
    organization: {
      en: "International Medical Center",
      ar: "المركز الطبي الدولي",
    },
    headerLogo: "IMC",
    footerSecurity: "Secured by WathiqCare",
  },
  patientHeaderFields: [
    "patientName",
    "mrn",
    "dateOfBirth",
    "encounterNumber",
    "location",
    "attendingPhysician",
  ],
  interpreterSection: {
    requiredFieldId: "interpreterRequired",
    presentFieldId: "interpreterPresent",
  },
  introduction: [
    {
      en:
        "I confirm that the physician in the Intensive Care Unit has discussed the healthcare condition indicating the need for admission to ICU.",
      ar:
        "أؤكد أن طبيب وحدة العناية المركزة قد ناقش الحالة الصحية التي تستدعي الدخول إلى وحدة العناية المركزة.",
    },
    {
      en:
        "The physician explained the medical treatment involving the invasive procedures listed in this consent, including the benefits, alternatives, and risks of those procedures.",
      ar:
        "وقد شرح الطبيب العلاج الطبي الذي يتضمن الإجراءات التداخلية المذكورة في هذه الموافقة، بما في ذلك الفوائد والبدائل والمخاطر المرتبطة بتلك الإجراءات.",
    },
    {
      en:
        "I acknowledge that no guarantee has been made concerning the results of any treatment rendered.",
      ar:
        "وأقر بأنه لم يتم تقديم أي ضمان بشأن نتائج أي علاج أو إجراء يتم تقديمه.",
    },
    {
      en:
        "Less common procedures may become necessary, and if so, additional consent will be requested unless the situation is an emergency where there is no time to obtain permission.",
      ar:
        "قد تصبح بعض الإجراءات الأقل شيوعًا ضرورية، وفي هذه الحالة سيتم طلب موافقة إضافية، ما لم تكن الحالة طارئة ولا يوجد وقت كافٍ للحصول على الإذن.",
    },
  ],
  procedures: [
    {
      id: "central-venous-catheter",
      title: {
        en: "Insertion of a Central Venous Catheter",
        ar: "إدخال قسطرة وريدية مركزية",
      },
      uses: {
        en:
          "Fluid and medication administration, central venous pressure monitoring, parenteral feeding, and blood draw.",
        ar:
          "إعطاء السوائل والأدوية، مراقبة الضغط الوريدي المركزي، التغذية الوريدية، وسحب الدم.",
      },
      risks: {
        en:
          "Infection, bleeding, blood clotting, collapsed lung, pneumothorax, and heart arrhythmia.",
        ar:
          "العدوى، النزيف، تجلط الدم، انهيار الرئة، استرواح الصدر، واضطراب نظم القلب.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
    {
      id: "arterial-line",
      title: {
        en: "Insertion of an Arterial Line",
        ar: "إدخال قسطرة شريانية",
      },
      uses: {
        en:
          "Monitor blood pressure, blood oxygen level, and draw arterial blood gases.",
        ar:
          "مراقبة ضغط الدم، مستوى الأكسجين في الدم، وسحب غازات الدم الشرياني.",
      },
      risks: {
        en:
          "Infection, bleeding, and impaired circulation that may lead to damage of the involved limb.",
        ar:
          "العدوى، النزيف، وضعف الدورة الدموية الذي قد يؤدي إلى تلف الطرف المصاب.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
    {
      id: "hemodialysis-catheter",
      title: {
        en: "Insertion of Hemodialysis Catheter",
        ar: "إدخال قسطرة غسيل الكلى",
      },
      uses: {
        en:
          "Dialysis, plasmapheresis, blood exchange transfusion, blood purification, and ECCO2R.",
        ar:
          "غسيل الكلى، فصل البلازما، تبديل الدم، تنقية الدم، وإزالة ثاني أكسيد الكربون خارج الجسم.",
      },
      risks: {
        en:
          "Infection, bleeding, blood clot, collapsed lung, and heart arrhythmia.",
        ar:
          "العدوى، النزيف، تجلط الدم، انهيار الرئة، واضطراب نظم القلب.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
    {
      id: "breathing-tube",
      title: {
        en: "Insertion of a Breathing Tube",
        ar: "إدخال أنبوب تنفس",
      },
      uses: {
        en:
          "Assist with breathing, use mechanical ventilation, and protect the airway.",
        ar:
          "المساعدة في التنفس، استخدام التهوية الميكانيكية، وحماية مجرى الهواء.",
      },
      risks: {
        en:
          "Bleeding, broken teeth, aspiration, esophageal intubation, collapsed lung, infection, and death.",
        ar:
          "النزيف، كسر الأسنان، الشفط الرئوي، التنبيب المريئي، انهيار الرئة، العدوى، والوفاة.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
    {
      id: "pulmonary-artery-catheter",
      title: {
        en: "Insertion of a Pulmonary Artery Catheter",
        ar: "إدخال قسطرة في الشريان الرئوي",
      },
      uses: {
        en:
          "Monitor heart pressures and performance, and determine the need for fluids.",
        ar:
          "مراقبة ضغوط القلب وأدائه، وتحديد الحاجة إلى السوائل.",
      },
      risks: {
        en:
          "Infection, bleeding, blood clot, collapsed lung, and heart arrhythmia.",
        ar:
          "العدوى، النزيف، تجلط الدم، انهيار الرئة، واضطراب نظم القلب.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
    {
      id: "chest-tube-pleural-ascitic-tapping",
      title: {
        en: "Insertion of Chest Tube / Pleural Tapping / Ascitic Tapping",
        ar: "إدخال أنبوب الصدر / بزل السائل الجنبي / بزل الاستسقاء",
      },
      uses: {
        en:
          "Expand collapsed lungs and drain blood, fluid, or air from around the lungs.",
        ar:
          "توسيع الرئة المنهارة وتصريف الدم أو السوائل أو الهواء من حول الرئتين.",
      },
      risks: {
        en:
          "Bleeding, infection, skin breakdown, injury to abdominal organs, and injury to the lung.",
        ar:
          "النزيف، العدوى، تضرر الجلد، إصابة الأعضاء البطنية، وإصابة الرئة.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
    {
      id: "bronchoscopy",
      title: {
        en: "Bronchoscopy Diagnostic and Therapeutic",
        ar: "تنظير القصبات التشخيصي والعلاجي",
      },
      uses: {
        en:
          "Expand collapsed lungs, obtain bronchial and alveolar samples, remove foreign bodies, and control bleeding.",
        ar:
          "توسيع الرئة المنهارة، أخذ عينات من القصبات والحويصلات الهوائية، إزالة الأجسام الغريبة، والسيطرة على النزيف.",
      },
      risks: {
        en:
          "Sore throat, hoarseness, bleeding, infection, collapsed lung, or injury to the lung.",
        ar:
          "التهاب الحلق، بحة الصوت، النزيف، العدوى، انهيار الرئة، أو إصابة الرئة.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
    {
      id: "sedation",
      title: {
        en: "Use of Sedation",
        ar: "استخدام المهدئات / التخدير",
      },
      uses: {
        en:
          "For ICU patients on mechanical ventilator, patients requiring procedures, or for control of agitation.",
        ar:
          "لمرضى وحدة العناية المركزة على جهاز التنفس، أو المرضى الذين تتطلب حالتهم إجراءً طبيًا، أو للسيطرة على الهياج.",
      },
      risks: {
        en:
          "Hypotension, metabolic and lipid abnormalities, arrhythmias, and respiratory depression.",
        ar:
          "انخفاض ضغط الدم، اضطرابات الأيض والدهون، اضطرابات نظم القلب، وتثبيط التنفس.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
    {
      id: "medical-photographs-videography",
      title: {
        en: "Take and Use Medical Photographs and Videography",
        ar: "التقاط واستخدام الصور والفيديو الطبي",
      },
      uses: {
        en:
          "Document and monitor all kinds of wounds without including the patient’s face or anything that can identify the patient.",
        ar:
          "توثيق ومراقبة جميع أنواع الجروح دون إظهار وجه المريض أو أي علامة يمكن أن تكشف هويته.",
      },
      risks: {
        en:
          "Privacy safeguards must be maintained, and identifiable patient information must not be included.",
        ar:
          "يجب المحافظة على الخصوصية وعدم تضمين أي معلومات أو علامات يمكن أن تكشف هوية المريض.",
      },
      isDefaultSelected: true,
      physicianCanRemove: true,
      physicianCanAddNotes: true,
    },
  ],
  dynamicFields: [
    {
      id: "interpreterRequired",
      label: {
        en: "Is an interpreter service required?",
        ar: "هل يلزم توفير خدمة مترجم؟",
      },
      type: "boolean",
      required: true,
    },
    {
      id: "interpreterPresent",
      label: {
        en: "If yes, is an interpreter present?",
        ar: "إذا كانت الإجابة نعم، هل المترجم حاضر؟",
      },
      type: "boolean",
      visibleWhen: {
        fieldId: "interpreterRequired",
        equals: true,
      },
    },
    {
      id: "icuAdmissionReason",
      label: {
        en: "ICU admission reason / clinical indication",
        ar: "سبب الدخول إلى وحدة العناية المركزة / الداعي الطبي",
      },
      type: "textarea",
      required: true,
    },
    {
      id: "additionalProcedure",
      label: {
        en: "Additional procedure requested by physician",
        ar: "إجراء إضافي يطلبه الطبيب",
      },
      type: "textarea",
    },
    {
      id: "physicianAdditionalNotes",
      label: {
        en: "Physician additional notes",
        ar: "ملاحظات الطبيب الإضافية",
      },
      type: "textarea",
    },
    {
      id: "refusalEnabled",
      label: {
        en: "Is any procedure refused?",
        ar: "هل تم رفض أي إجراء؟",
      },
      type: "boolean",
      required: true,
    },
  ],
  refusalSection: {
    enabledFieldId: "refusalEnabled",
    refusedProcedureFieldId: "refusedProcedure",
    reasonFieldId: "refusalReason",
    amaRequired: true,
    text: {
      en:
        "In case of refusal of any of the previously mentioned procedures, after the physician explains the benefits and risks of refusal, the specific refused procedure and the reason for refusal should be documented. A separate Against Medical Advice (AMA) form should be signed and attached.",
      ar:
        "في حال رفض أي من الإجراءات المذكورة أعلاه، وبعد أن يشرح الطبيب فوائد الإجراء ومخاطر الرفض، يجب توثيق الإجراء المرفوض وسبب الرفض. كما يجب توقيع نموذج منفصل للرفض ضد النصيحة الطبية وإرفاقه.",
    },
  },
  acknowledgement: [
    {
      en:
        "I have had all items explained to me and I had the chance to have all my questions and/or queries answered by the ICU physician.",
      ar:
        "لقد تم شرح جميع البنود لي، وأتيحت لي الفرصة لطرح جميع أسئلتي واستفساراتي والإجابة عنها من قبل طبيب وحدة العناية المركزة.",
    },
    {
      en:
        "I agree with all the procedures once indicated. This consent form will remain valid until discharge from the hospital unless revoked by me or my responsible relative.",
      ar:
        "وأوافق على جميع الإجراءات عند الحاجة إليها. وتظل هذه الموافقة سارية حتى الخروج من المستشفى، ما لم يتم إلغاؤها من قبلي أو من قبل القريب المسؤول.",
    },
  ],
  signatures: [
    {
      id: "signerType",
      label: {
        en: "Signer type",
        ar: "صفة الموقّع",
      },
      type: "select",
      required: true,
      options: [
        { en: "Myself", ar: "المريض" },
        { en: "Legal Guardian", ar: "ولي الأمر" },
        { en: "Relative", ar: "أحد الأقرباء" },
      ],
    },
    {
      id: "relativeRelationship",
      label: {
        en: "Relationship",
        ar: "صلة القرابة",
      },
      type: "text",
      visibleWhen: {
        fieldId: "signerType",
        equals: "Relative",
      },
    },
    {
      id: "patientOrGuardianSignature",
      label: {
        en: "Patient / Guardian Signature",
        ar: "توقيع المريض / ولي الأمر",
      },
      type: "text",
      required: true,
    },
    {
      id: "physicianName",
      label: {
        en: "Physician Name",
        ar: "اسم الطبيب",
      },
      type: "text",
      required: true,
    },
    {
      id: "physicianSignature",
      label: {
        en: "Physician Signature",
        ar: "توقيع الطبيب",
      },
      type: "text",
      required: true,
    },
    {
      id: "witnessOne",
      label: {
        en: "Witness 1",
        ar: "الشاهد الأول",
      },
      type: "text",
    },
    {
      id: "witnessTwo",
      label: {
        en: "Witness 2",
        ar: "الشاهد الثاني",
      },
      type: "text",
    },
  ],
  audit: {
    createdFor: "WathiqCare IMC Approved Consent Library",
    createdPurpose:
      "Structured digital consent template for physician issuance journey and future bilingual PDF rendering.",
    changePolicy:
      "Approved source meaning must not be changed. Physicians may only add structured clinical notes, select/remove listed procedures where permitted, and document refusal reasons.",
  },
};

export default criticalCareConsentTemplate;
