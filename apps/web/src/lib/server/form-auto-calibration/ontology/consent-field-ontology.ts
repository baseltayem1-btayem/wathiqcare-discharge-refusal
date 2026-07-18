/**
 * Canonical consent field ontology.
 *
 * This is the single source of truth for semantic keys used across all
 * approved consent forms. Every ontology field defines its data type,
 * language, signer role, sensitivity, requiredness policy, supported
 * widgets, expected label aliases, printable behaviour, family absence
 * policy, and whether an AI mapping requires human confirmation.
 */

export type ConsentFieldDataType =
  | "string"
  | "multiline_text"
  | "boolean"
  | "date"
  | "time"
  | "datetime"
  | "signature_image"
  | "select_one"
  | "select_many";

export type ConsentFieldLanguage =
  | "EN"
  | "AR"
  | "BILINGUAL"
  | "NONE";

export type ConsentFieldRole =
  | "PATIENT"
  | "PHYSICIAN"
  | "GUARDIAN"
  | "WITNESS"
  | "INTERPRETER"
  | "SYSTEM"
  | "READ_ONLY";

export type ConsentFieldSensitivity =
  | "PHI_NAME"
  | "PHI_IDENTIFIER"
  | "PHI_DEMOGRAPHIC"
  | "CLINICAL_CONTENT"
  | "SIGNATURE"
  | "OPERATIONAL"
  | "NONE";

export type ConsentFieldRequiredness =
  | "ALWAYS"
  | "FAMILY_DEPENDENT"
  | "CONDITIONAL"
  | "NEVER";

export type ConsentWidgetType =
  | "TEXT"
  | "MULTILINE_TEXT"
  | "CHECKBOX"
  | "RADIO"
  | "DATE"
  | "TIME"
  | "SIGNATURE"
  | "LABEL";

export type ConsentPrintBehaviour =
  | "RENDER_OVERLAY"
  | "RENDER_CHECKMARK"
  | "RENDER_SIGNATURE"
  | "RENDER_DATE"
  | "RENDER_TIME"
  | "HIDDEN";

export type ConsentOntologyField = {
  /** Canonical dot-notation key (e.g. patient.name). */
  key: string;
  /** Human-readable English label. */
  labelEn: string;
  /** Human-readable Arabic label. */
  labelAr: string;
  dataType: ConsentFieldDataType;
  language: ConsentFieldLanguage;
  role: ConsentFieldRole;
  sensitivity: ConsentFieldSensitivity;
  requiredness: ConsentFieldRequiredness;
  /** Widget types this field may be rendered as. */
  supportedWidgets: ConsentWidgetType[];
  /** English label aliases that may appear on forms. */
  aliasesEn: string[];
  /** Arabic label aliases that may appear on forms. */
  aliasesAr: string[];
  printable: ConsentPrintBehaviour;
  /** True if the field may legitimately be absent from a given form family. */
  mayBeAbsent: boolean;
  /** True if an AI-proposed mapping for this field must be human-confirmed. */
  aiMappingRequiresConfirmation: boolean;
  /** Optional applicability rule reference (matches AcroForm manifest convention). */
  applicabilityRule?: string;
};

function field(def: Omit<ConsentOntologyField, "key"> & { key: string }): ConsentOntologyField {
  return def;
}

function bilingualTextField(args: {
  key: string;
  labelEn: string;
  labelAr: string;
  role: ConsentFieldRole;
  sensitivity: ConsentFieldSensitivity;
  aliasesEn: string[];
  aliasesAr: string[];
  requiredness?: ConsentFieldRequiredness;
  mayBeAbsent?: boolean;
  aiMappingRequiresConfirmation?: boolean;
  applicabilityRule?: string;
}): ConsentOntologyField {
  return field({
    ...args,
    dataType: "multiline_text",
    language: "BILINGUAL",
    supportedWidgets: ["MULTILINE_TEXT"],
    printable: "RENDER_OVERLAY",
    requiredness: args.requiredness ?? "FAMILY_DEPENDENT",
    mayBeAbsent: args.mayBeAbsent ?? true,
    aiMappingRequiresConfirmation: args.aiMappingRequiresConfirmation ?? true,
  });
}

function systemTextField(args: {
  key: string;
  labelEn: string;
  labelAr: string;
  sensitivity: ConsentFieldSensitivity;
  aliasesEn: string[];
  aliasesAr: string[];
  dataType?: ConsentFieldDataType;
  language?: ConsentFieldLanguage;
  requiredness?: ConsentFieldRequiredness;
  mayBeAbsent?: boolean;
  aiMappingRequiresConfirmation?: boolean;
  supportedWidgets?: ConsentWidgetType[];
  printable?: ConsentPrintBehaviour;
}): ConsentOntologyField {
  return field({
    ...args,
    role: "SYSTEM",
    dataType: args.dataType ?? "string",
    language: args.language ?? "BILINGUAL",
    supportedWidgets: args.supportedWidgets ?? ["TEXT"],
    printable: args.printable ?? "RENDER_OVERLAY",
    requiredness: args.requiredness ?? "ALWAYS",
    mayBeAbsent: args.mayBeAbsent ?? false,
    aiMappingRequiresConfirmation: args.aiMappingRequiresConfirmation ?? false,
  });
}

function signatureField(args: {
  key: string;
  labelEn: string;
  labelAr: string;
  role: ConsentFieldRole;
  aliasesEn: string[];
  aliasesAr: string[];
  requiredness?: ConsentFieldRequiredness;
  mayBeAbsent?: boolean;
  aiMappingRequiresConfirmation?: boolean;
}): ConsentOntologyField {
  return field({
    ...args,
    dataType: "signature_image",
    language: "BILINGUAL",
    sensitivity: "SIGNATURE",
    supportedWidgets: ["SIGNATURE"],
    printable: "RENDER_SIGNATURE",
    requiredness: args.requiredness ?? "ALWAYS",
    mayBeAbsent: args.mayBeAbsent ?? false,
    aiMappingRequiresConfirmation: args.aiMappingRequiresConfirmation ?? true,
  });
}

function dateTimeField(args: {
  key: string;
  labelEn: string;
  labelAr: string;
  role: ConsentFieldRole;
  sensitivity: ConsentFieldSensitivity;
  dataType: "date" | "time" | "datetime";
  aliasesEn: string[];
  aliasesAr: string[];
  requiredness?: ConsentFieldRequiredness;
  mayBeAbsent?: boolean;
  aiMappingRequiresConfirmation?: boolean;
}): ConsentOntologyField {
  return field({
    ...args,
    language: "BILINGUAL",
    supportedWidgets: args.dataType === "time" ? ["TIME"] : ["DATE"],
    printable: args.dataType === "time" ? "RENDER_TIME" : "RENDER_DATE",
    requiredness: args.requiredness ?? "ALWAYS",
    mayBeAbsent: args.mayBeAbsent ?? false,
    aiMappingRequiresConfirmation: args.aiMappingRequiresConfirmation ?? false,
  });
}

function booleanField(args: {
  key: string;
  labelEn: string;
  labelAr: string;
  role: ConsentFieldRole;
  aliasesEn: string[];
  aliasesAr: string[];
  requiredness?: ConsentFieldRequiredness;
  mayBeAbsent?: boolean;
  aiMappingRequiresConfirmation?: boolean;
}): ConsentOntologyField {
  return field({
    ...args,
    dataType: "boolean",
    language: "BILINGUAL",
    sensitivity: "OPERATIONAL",
    supportedWidgets: ["CHECKBOX", "RADIO"],
    printable: "RENDER_CHECKMARK",
    requiredness: args.requiredness ?? "FAMILY_DEPENDENT",
    mayBeAbsent: args.mayBeAbsent ?? true,
    aiMappingRequiresConfirmation: args.aiMappingRequiresConfirmation ?? true,
  });
}

// -----------------------------------------------------------------------------
// Ontology registry
// -----------------------------------------------------------------------------

export const CONSENT_FIELD_ONTOLOGY: readonly ConsentOntologyField[] = [
  // Patient demographics
  systemTextField({
    key: "patient.name",
    labelEn: "Patient Name",
    labelAr: "اسم المريض",
    sensitivity: "PHI_NAME",
    aliasesEn: ["patient name", "name of patient", "patient's name"],
    aliasesAr: ["اسم المريض", "اسم المريضة"],
  }),
  systemTextField({
    key: "patient.mrn",
    labelEn: "Medical Record Number",
    labelAr: "رقم الملف الطبي",
    sensitivity: "PHI_IDENTIFIER",
    aliasesEn: ["mrn", "medical record number", "file number", "hospital number"],
    aliasesAr: ["رقم الملف الطبي", "رقم المريض", "رقم الحساب"],
    dataType: "string",
  }),
  systemTextField({
    key: "patient.date_of_birth",
    labelEn: "Date of Birth",
    labelAr: "تاريخ الميلاد",
    sensitivity: "PHI_DEMOGRAPHIC",
    aliasesEn: ["date of birth", "dob", "birth date"],
    aliasesAr: ["تاريخ الميلاد", "تاريخ الميلاد"],
    dataType: "date",
    supportedWidgets: ["DATE"],
    printable: "RENDER_DATE",
  }),
  systemTextField({
    key: "patient.gender",
    labelEn: "Gender",
    labelAr: "الجنس",
    sensitivity: "PHI_DEMOGRAPHIC",
    aliasesEn: ["gender", "sex"],
    aliasesAr: ["الجنس", "النوع"],
  }),
  systemTextField({
    key: "patient.national_id",
    labelEn: "National ID / Iqama",
    labelAr: "رقم الهوية / الإقامة",
    sensitivity: "PHI_IDENTIFIER",
    aliasesEn: ["national id", "iqama", "id number", "nationality number"],
    aliasesAr: ["رقم الهوية", "رقم الإقامة", "رقم الهوية الوطنية"],
  }),

  // Procedure / clinical content
  bilingualTextField({
    key: "procedure.condition.en",
    labelEn: "Condition in patient's own words (English)",
    labelAr: "الحالة المرضية بكلمات المريض (إنجليزي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: ["condition", "you have the following condition", "diagnosis"],
    aliasesAr: ["الحالة المرضية", "تشخيص"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.condition.ar",
    labelEn: "Condition in patient's own words (Arabic)",
    labelAr: "الحالة المرضية بكلمات المريض (عربي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: [],
    aliasesAr: ["الحالة المرضية", "التشخيص"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.name_site_side.en",
    labelEn: "Proposed procedure, including site and side (English)",
    labelAr: "الإجراء المقترح مع الموضع والجهة (إنجليزي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: [
      "procedure",
      "the following will be performed",
      "include site and/or side",
      "name of procedure",
      "procedure site",
    ],
    aliasesAr: ["الإجراء الطبي", "الإجراء المقترح", "الموضع والجهة"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.name_site_side.ar",
    labelEn: "Proposed procedure, including site and side (Arabic)",
    labelAr: "الإجراء المقترح مع الموضع والجهة (عربي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: [],
    aliasesAr: ["الإجراء الطبي التالي", "الإجراء المقترح", "الموضع والجهة"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.significant_risks.en",
    labelEn: "Significant risks and procedure options (English)",
    labelAr: "المخاطر الهامة وخيارات الإجراء (إنجليزي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: ["significant risks", "risks and options", "procedure options", "material risks"],
    aliasesAr: ["المخاطر الهامة", "المخاطر والخيارات"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.significant_risks.ar",
    labelEn: "Significant risks and procedure options (Arabic)",
    labelAr: "المخاطر الهامة وخيارات الإجراء (عربي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: [],
    aliasesAr: ["المخاطر الهامة", "المخاطر والخيارات"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.risks_continuation.en",
    labelEn: "Significant risks/options continuation (English)",
    labelAr: "تكملة المخاطر الهامة وخيارات الإجراء (إنجليزي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: ["continuation", "additional risks", "continued"],
    aliasesAr: ["تكملة", "استكمال"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.risks_continuation.ar",
    labelEn: "Significant risks/options continuation (Arabic)",
    labelAr: "تكملة المخاطر الهامة وخيارات الإجراء (عربي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: [],
    aliasesAr: ["تكملة", "استكمال"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.no_treatment_risks.en",
    labelEn: "Risks of not having the procedure (English)",
    labelAr: "مخاطر عدم الخضوع للإجراء (إنجليزي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: ["risks of not having", "no treatment risks", "risks of refusal"],
    aliasesAr: ["مخاطر عدم الخضوع", "مخاطر عدم الإجراء"],
    applicabilityRule: "always",
  }),
  bilingualTextField({
    key: "procedure.no_treatment_risks.ar",
    labelEn: "Risks of not having the procedure (Arabic)",
    labelAr: "مخاطر عدم الخضوع للإجراء (عربي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: [],
    aliasesAr: ["مخاطر عدم الخضوع", "مخاطر عدم الإجراء"],
    applicabilityRule: "always",
  }),

  // Anesthesia
  booleanField({
    key: "anesthesia.applicable",
    labelEn: "Anesthesia applicable",
    labelAr: "التخدير مطبق",
    role: "PHYSICIAN",
    aliasesEn: ["anaesthetic", "anesthesia", "sedation"],
    aliasesAr: ["التخدير", "التخدير النصفي", "البنج"],
    mayBeAbsent: true,
  }),
  bilingualTextField({
    key: "anesthesia.type.en",
    labelEn: "Type of anaesthetic discussed (English)",
    labelAr: "نوع التخدير الذي تمت مناقشته (إنجليزي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: ["type of anaesthetic", "anaesthetic type", "anesthesia discussed"],
    aliasesAr: ["نوع التخدير", "التحدث عن التخدير"],
    mayBeAbsent: true,
  }),
  bilingualTextField({
    key: "anesthesia.type.ar",
    labelEn: "Type of anaesthetic discussed (Arabic)",
    labelAr: "نوع التخدير الذي تمت مناقشته (عربي)",
    role: "PHYSICIAN",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: [],
    aliasesAr: ["نوع التخدير", "التحدث عن التخدير"],
    mayBeAbsent: true,
  }),

  // Interpreter
  booleanField({
    key: "interpreter.required",
    labelEn: "Interpreter required",
    labelAr: "هل تحتاج مترجم؟",
    role: "INTERPRETER",
    aliasesEn: ["interpreter required", "interpreter needed"],
    aliasesAr: ["مترجم مطلوب", "بحاجة لمترجم"],
    mayBeAbsent: true,
  }),
  booleanField({
    key: "interpreter.present",
    labelEn: "Interpreter present",
    labelAr: "المترجم حاضر",
    role: "INTERPRETER",
    aliasesEn: ["interpreter present", "interpreter available"],
    aliasesAr: ["المترجم حاضر", "المترجم متوفر"],
    mayBeAbsent: true,
  }),

  // Physician
  bilingualTextField({
    key: "physician.name.en",
    labelEn: "Treating physician name (English)",
    labelAr: "اسم الطبيب المعالج (إنجليزي)",
    role: "PHYSICIAN",
    sensitivity: "OPERATIONAL",
    aliasesEn: ["physician name", "doctor name", "treating physician", "doctor delegate"],
    aliasesAr: ["اسم الطبيب", "الطبيب المعالج", "مندوب الطبيب"],
  }),
  bilingualTextField({
    key: "physician.name.ar",
    labelEn: "Treating physician name (Arabic)",
    labelAr: "اسم الطبيب المعالج (عربي)",
    role: "PHYSICIAN",
    sensitivity: "OPERATIONAL",
    aliasesEn: [],
    aliasesAr: ["اسم الطبيب", "الطبيب المعالج", "مندوب الطبيب"],
  }),
  bilingualTextField({
    key: "physician.designation.en",
    labelEn: "Physician designation (English)",
    labelAr: "مسمى الطبيب الوظيفي (إنجليزي)",
    role: "PHYSICIAN",
    sensitivity: "OPERATIONAL",
    aliasesEn: ["designation", "title", "specialty"],
    aliasesAr: ["المسمى الوظيفي", "التخصص"],
    mayBeAbsent: true,
  }),
  bilingualTextField({
    key: "physician.designation.ar",
    labelEn: "Physician designation (Arabic)",
    labelAr: "مسمى الطبيب الوظيفي (عربي)",
    role: "PHYSICIAN",
    sensitivity: "OPERATIONAL",
    aliasesEn: [],
    aliasesAr: ["المسمى الوظيفي", "التخصص"],
    mayBeAbsent: true,
  }),
  signatureField({
    key: "physician.signature",
    labelEn: "Physician signature",
    labelAr: "توقيع الطبيب",
    role: "PHYSICIAN",
    aliasesEn: ["physician signature", "doctor signature", "signature of physician"],
    aliasesAr: ["توقيع الطبيب", "توقيع الطبيب المعالج"],
  }),
  dateTimeField({
    key: "physician.date",
    labelEn: "Physician date",
    labelAr: "تاريخ الطبيب",
    role: "PHYSICIAN",
    sensitivity: "OPERATIONAL",
    dataType: "date",
    aliasesEn: ["date", "physician date", "doctor date"],
    aliasesAr: ["تاريخ", "تاريخ الطبيب"],
  }),
  dateTimeField({
    key: "physician.time",
    labelEn: "Physician time",
    labelAr: "وقت الطبيب",
    role: "PHYSICIAN",
    sensitivity: "OPERATIONAL",
    dataType: "time",
    aliasesEn: ["time", "physician time", "doctor time"],
    aliasesAr: ["وقت", "وقت الطبيب"],
    mayBeAbsent: true,
  }),

  // Patient signature
  signatureField({
    key: "patient.signature",
    labelEn: "Patient signature",
    labelAr: "توقيع المريض",
    role: "PATIENT",
    aliasesEn: ["patient signature", "signature of patient", "patient/guardian signature"],
    aliasesAr: ["توقيع المريض", "توقيع المريضة", "توقيع المريض/الولي"],
  }),
  dateTimeField({
    key: "patient.date",
    labelEn: "Patient date",
    labelAr: "تاريخ المريض",
    role: "PATIENT",
    sensitivity: "OPERATIONAL",
    dataType: "date",
    aliasesEn: ["patient date", "date of consent"],
    aliasesAr: ["تاريخ المريض", "تاريخ الإقرار"],
  }),
  dateTimeField({
    key: "patient.time",
    labelEn: "Patient time",
    labelAr: "وقت المريض",
    role: "PATIENT",
    sensitivity: "OPERATIONAL",
    dataType: "time",
    aliasesEn: ["patient time", "time of consent"],
    aliasesAr: ["وقت المريض", "وقت الإقرار"],
    mayBeAbsent: true,
  }),

  // Guardian / substitute decision maker
  systemTextField({
    key: "guardian.name",
    labelEn: "Guardian / substitute decision maker name",
    labelAr: "اسم ولي الأمر / م اتخاذ القرار البديل",
    sensitivity: "PHI_NAME",
    aliasesEn: ["guardian name", "substitute decision maker", "parent/guardian"],
    aliasesAr: ["اسم ولي الأمر", "م اتخاذ القرار", "ولي الأمر"],
    mayBeAbsent: true,
  }),
  systemTextField({
    key: "guardian.relationship",
    labelEn: "Guardian relationship",
    labelAr: "علاقة ولي الأمر",
    sensitivity: "OPERATIONAL",
    aliasesEn: ["relationship", "relation to patient"],
    aliasesAr: ["علاقة", "صلة القرابة"],
    mayBeAbsent: true,
  }),
  systemTextField({
    key: "guardian.identity",
    labelEn: "Guardian identity / ID",
    labelAr: "هوية ولي الأمر",
    sensitivity: "PHI_IDENTIFIER",
    aliasesEn: ["guardian id", "guardian identity", "id number"],
    aliasesAr: ["هوية ولي الأمر", "رقم هوية ولي الأمر"],
    mayBeAbsent: true,
  }),
  signatureField({
    key: "guardian.signature",
    labelEn: "Guardian signature",
    labelAr: "توقيع ولي الأمر",
    role: "GUARDIAN",
    aliasesEn: ["guardian signature", "parent signature", "substitute signature"],
    aliasesAr: ["توقيع ولي الأمر", "توقيع الأب", "توقيع الأم"],
    mayBeAbsent: true,
  }),
  dateTimeField({
    key: "guardian.date",
    labelEn: "Guardian date",
    labelAr: "تاريخ ولي الأمر",
    role: "GUARDIAN",
    sensitivity: "OPERATIONAL",
    dataType: "date",
    aliasesEn: ["guardian date"],
    aliasesAr: ["تاريخ ولي الأمر"],
    mayBeAbsent: true,
  }),
  dateTimeField({
    key: "guardian.time",
    labelEn: "Guardian time",
    labelAr: "وقت ولي الأمر",
    role: "GUARDIAN",
    sensitivity: "OPERATIONAL",
    dataType: "time",
    aliasesEn: ["guardian time"],
    aliasesAr: ["وقت ولي الأمر"],
    mayBeAbsent: true,
  }),

  // Witnesses
  ...[1, 2].flatMap((index): ConsentOntologyField[] => [
    systemTextField({
      key: `witness.${index}.name`,
      labelEn: `Witness ${index} name`,
      labelAr: `اسم الشاهد ${index}`,
      sensitivity: "PHI_NAME",
      aliasesEn: [`witness ${index} name`, `witness${index} name`, `name of witness ${index}`],
      aliasesAr: [`اسم الشاهد ${index}`, `الشاهد ${index}`],
      mayBeAbsent: true,
    }),
    signatureField({
      key: `witness.${index}.signature`,
      labelEn: `Witness ${index} signature`,
      labelAr: `توقيع الشاهد ${index}`,
      role: "WITNESS",
      aliasesEn: [`witness ${index} signature`, `witness${index} signature`],
      aliasesAr: [`توقيع الشاهد ${index}`, `توقيع الشاهد`],
      mayBeAbsent: true,
    }),
    dateTimeField({
      key: `witness.${index}.date`,
      labelEn: `Witness ${index} date`,
      labelAr: `تاريخ الشاهد ${index}`,
      role: "WITNESS",
      sensitivity: "OPERATIONAL",
      dataType: "date",
      aliasesEn: [`witness ${index} date`],
      aliasesAr: [`تاريخ الشاهد ${index}`],
      mayBeAbsent: true,
    }),
    dateTimeField({
      key: `witness.${index}.time`,
      labelEn: `Witness ${index} time`,
      labelAr: `وقت الشاهد ${index}`,
      role: "WITNESS",
      sensitivity: "OPERATIONAL",
      dataType: "time",
      aliasesEn: [`witness ${index} time`],
      aliasesAr: [`وقت الشاهد ${index}`],
      mayBeAbsent: true,
    }),
  ]),

  // Refusal
  bilingualTextField({
    key: "refusal.reason",
    labelEn: "Reason for refusal",
    labelAr: "سبب الرفض",
    role: "PATIENT",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: ["reason for refusal", "refusal reason", "why refusing"],
    aliasesAr: ["سبب الرفض", "أسباب الرفض"],
    mayBeAbsent: true,
  }),
  bilingualTextField({
    key: "refusal.acknowledgement",
    labelEn: "Refusal acknowledgement",
    labelAr: "إقرار الرفض",
    role: "PATIENT",
    sensitivity: "CLINICAL_CONTENT",
    aliasesEn: ["acknowledgement", "i understand the risks of refusal"],
    aliasesAr: ["إقرار", "أدرك مخاطر الرفض"],
    mayBeAbsent: true,
  }),
  signatureField({
    key: "refusal.signature",
    labelEn: "Refusal signature",
    labelAr: "توقيع الرفض",
    role: "PATIENT",
    aliasesEn: ["refusal signature", "signature of refusal"],
    aliasesAr: ["توقيع الرفض"],
    mayBeAbsent: true,
  }),
];

// -----------------------------------------------------------------------------
// Lookups
// -----------------------------------------------------------------------------

const ONTOLOGY_BY_KEY = new Map(CONSENT_FIELD_ONTOLOGY.map((f) => [f.key, f]));

export function getOntologyField(key: string): ConsentOntologyField | undefined {
  return ONTOLOGY_BY_KEY.get(key);
}

export function getAllOntologyKeys(): string[] {
  return CONSENT_FIELD_ONTOLOGY.map((f) => f.key);
}

export function getOntologyFieldsByRole(role: ConsentFieldRole): ConsentOntologyField[] {
  return CONSENT_FIELD_ONTOLOGY.filter((f) => f.role === role);
}

export function getOntologyFieldsByFamilyPresence(
  mayBeAbsent: boolean,
): ConsentOntologyField[] {
  return CONSENT_FIELD_ONTOLOGY.filter((f) => f.mayBeAbsent === mayBeAbsent);
}
