import templatePack from "@/data/wathiqnote/production-template-pack.json";

export type WathiqNoteTemplateStatus =
  | "Draft"
  | "Legal Review"
  | "Finance Review"
  | "Insurance Review"
  | "DPO/IT Review"
  | "Approved"
  | "Published"
  | "Suspended"
  | "Archived";

export type WathiqNoteTemplate = {
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  ownerDepartment: string;
  requiredApprovals: string[];
  status: WathiqNoteTemplateStatus | string;
  purposeAr: string;
  allowedUseCases?: string[];
  prohibitedUseCases?: string[];
  requiredFields: string[];
  clauseAr: string;
  clauseEn: string;
  operationalRuleAr: string;
  /** Derived / optional metadata for the builder UI. */
  riskLevel?: "low" | "medium" | "high";
  signatoryType?: string;
  isPlaceholder?: boolean;
};

export const wathiqNoteProductionTemplates =
  templatePack as WathiqNoteTemplate[];

export const publishedWathiqNoteTemplates =
  wathiqNoteProductionTemplates.filter(
    (template) => template.status === "Published"
  );

export const draftWathiqNoteTemplates =
  wathiqNoteProductionTemplates.filter(
    (template) => template.status !== "Published"
  );

function deriveRiskLevel(template: WathiqNoteTemplate): WathiqNoteTemplate["riskLevel"] {
  if (template.category === "FINANCIAL_EXECUTION" || template.category === "LEGAL_FINANCIAL") {
    return "high";
  }
  if (template.category === "FINANCIAL" || template.category === "FINANCIAL_COLLECTION" || template.category === "INSURANCE") {
    return "medium";
  }
  return "low";
}

function deriveSignatoryType(template: WathiqNoteTemplate): string {
  const fields = template.requiredFields.join(" ");
  if (fields.includes("guarantor") || fields.includes("relationshipToPatient")) {
    return "Patient / Guardian / Guarantor";
  }
  if (fields.includes("debtor") && fields.includes("patientName")) {
    return "Debtor / Patient / Authorized Representative";
  }
  if (fields.includes("debtor")) {
    return "Debtor";
  }
  return "Signatory";
}

export const wathiqNoteProductionTemplatesEnriched = wathiqNoteProductionTemplates.map(
  (template) => ({
    ...template,
    riskLevel: deriveRiskLevel(template),
    signatoryType: deriveSignatoryType(template),
  })
);

export type WathiqNoteTemplateFamily = {
  key: string;
  labelAr: string;
  labelEn: string;
  categories: string[];
  templates: WathiqNoteTemplate[];
};

/**
 * User-facing template families. Real templates are drawn from the approved pack.
 * Missing families are represented by clearly marked placeholder drafts so the
 * builder UI can advertise them without inventing legally final text.
 */
export const WATHIQNOTE_TEMPLATE_FAMILIES: WathiqNoteTemplateFamily[] = [
  {
    key: "promissory_note",
    labelAr: "سند لأمر",
    labelEn: "Promissory Note",
    categories: ["FINANCIAL_EXECUTION"],
    templates: wathiqNoteProductionTemplatesEnriched.filter(
      (t) => t.category === "FINANCIAL_EXECUTION"
    ),
  },
  {
    key: "financial_undertaking",
    labelAr: "تعهد مالي",
    labelEn: "Financial Undertaking",
    categories: ["FINANCIAL", "FINANCIAL_COLLECTION"],
    templates: wathiqNoteProductionTemplatesEnriched.filter(
      (t) => t.category === "FINANCIAL" || t.category === "FINANCIAL_COLLECTION"
    ),
  },
  {
    key: "patient_financial_responsibility",
    labelAr: "إقرار مسؤولية مالية للمريض / العائلة",
    labelEn: "Patient / Family Financial Responsibility",
    categories: ["FINANCIAL_LEGAL", "LEGAL_FINANCIAL"],
    templates: wathiqNoteProductionTemplatesEnriched.filter(
      (t) => t.category === "FINANCIAL_LEGAL" || t.category === "LEGAL_FINANCIAL"
    ),
  },
  {
    key: "vendor_advance_payment",
    labelAr: "تعهد / سند دفعة مقدمة لمورد",
    labelEn: "Vendor / Advance Payment Undertaking",
    categories: ["VENDOR_ADVANCE"],
    templates: [
      {
        code: "WN-DRAFT-VENDOR-001",
        nameAr: "تعهد دفعة مقدمة لمورد (مسودة قيد المراجعة القانونية)",
        nameEn: "Vendor Advance Payment Undertaking (Draft — Pending Legal Review)",
        category: "VENDOR_ADVANCE",
        ownerDepartment: "Legal Affairs / Finance / Procurement",
        requiredApprovals: ["Legal Affairs", "Finance", "Procurement"],
        status: "Draft",
        purposeAr: "توثيق التزام جهة دفع الموجودات أو المستلزمات الطبية بتسديد دفعة مقدمة لمورد وفق شروط العقد.",
        requiredFields: [
          "vendorName",
          "vendorCommercialRegistration",
          "purchaseOrderReference",
          "contractReference",
          "advanceAmount",
          "deliveryDueDate",
          "responsibleDepartment",
          "signatureMethod",
        ],
        clauseAr: "[مسودة قيد المراجعة القانونية — لا يجوز استخدام هذا النص إلا بعد الاعتماد النهائي من الشؤون القانونية.]",
        clauseEn: "[Draft pending legal review — this wording may not be used until final legal approval is granted.]",
        operationalRuleAr: "لا يجوز إصدار تعهد دفعة مقدمة لمورد دون مراجعة العقد وشروط السداد والاعتماد القانوني.",
        isPlaceholder: true,
        riskLevel: "high",
        signatoryType: "Vendor / Authorized Payer Representative",
      },
    ],
  },
  {
    key: "insurance_approval_pending",
    labelAr: "إقرار تأمين / موافقة معلقة",
    labelEn: "Insurance / Approval-Pending Acknowledgment",
    categories: ["INSURANCE"],
    templates: wathiqNoteProductionTemplatesEnriched.filter(
      (t) => t.category === "INSURANCE"
    ),
  },
  {
    key: "emergency_coverage",
    labelAr: "إقرار مسؤولية مالية طارئة / تغطية",
    labelEn: "Emergency Coverage / Financial Responsibility",
    categories: ["EMERGENCY_COVERAGE"],
    templates: [
      {
        code: "WN-DRAFT-EMRG-001",
        nameAr: "إقرار مسؤولية مالية للحالات الطارئة (مسودة قيد المراجعة القانونية)",
        nameEn: "Emergency Financial Responsibility Acknowledgment (Draft — Pending Legal Review)",
        category: "EMERGENCY_COVERAGE",
        ownerDepartment: "Emergency Department / Legal Affairs / Finance",
        requiredApprovals: ["Emergency Department", "Legal Affairs", "Finance"],
        status: "Draft",
        purposeAr: "توثيق إقرار المريض أو المفوض بالمسؤولية المالية عن الخدمات الطارئة عند عدم إمكانية التحقق من التغطية التأمينية فوراً.",
        requiredFields: [
          "patientName",
          "patientNationalIdOrIqama",
          "emergencyServiceDescription",
          "estimatedAmount",
          "coverageVerificationStatus",
          "responsibleDepartment",
          "debtorName",
          "signatureMethod",
        ],
        clauseAr: "[مسودة قيد المراجعة القانونية — لا يجوز استخدام هذا النص إلا بعد الاعتماد النهائي من الشؤون القانونية.]",
        clauseEn: "[Draft pending legal review — this wording may not be used until final legal approval is granted.]",
        operationalRuleAr: "لا يجوز إصدار إقرار طوارئ دون توثيق سبب الطوارئ وحالة التغطية ومراجعة قانونية.",
        isPlaceholder: true,
        riskLevel: "high",
        signatoryType: "Patient / Guardian / Authorized Representative",
      },
    ],
  },
];

export function getWathiqNoteFamilyByKey(key: string) {
  return WATHIQNOTE_TEMPLATE_FAMILIES.find((family) => family.key === key);
}

export const allWathiqNoteTemplates: WathiqNoteTemplate[] = [
  ...wathiqNoteProductionTemplatesEnriched,
  ...WATHIQNOTE_TEMPLATE_FAMILIES.flatMap((family) => family.templates),
];

export function getWathiqNoteTemplateByCode(code: string) {
  return allWathiqNoteTemplates.find((template) => template.code === code);
}
