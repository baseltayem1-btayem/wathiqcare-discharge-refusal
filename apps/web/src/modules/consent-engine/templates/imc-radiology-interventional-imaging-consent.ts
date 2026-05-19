import type { DynamicConsentTemplate } from "./types";

export const IMC_RADIOLOGY_INTERVENTIONAL_IMAGING_CONSENT: DynamicConsentTemplate =
{
  templateId: "IMC-RAD-IMG-CONSENT-001",

  templateCode:
    "IMC_RADIOLOGY_INTERVENTIONAL_IMAGING_CONSENT",

  version: "1.0.0",

  status: "draft_for_review",

  module: "informed-consents",

  category: "radiology",

  subcategory:
    "medical_imaging_interventional_radiology",

  riskLevel: "high",

  owner: {
    organization: "International Medical Center",
    shortName: "IMC",
    platform: "WathiqCare™",
  },

  title: {
    en: "IMC Radiology & Interventional Imaging Informed Consent",
    ar: "موافقة مستنيرة للتصوير الطبي والأشعة التداخلية",
  },

  subtitle: {
    en: "Enterprise Legal-Grade Version",
    ar: "نسخة مؤسسية قانونية متقدمة",
  },

  branding: {
    primaryBrand: "International Medical Center (IMC)",

    secondaryBrand:
      "WathiqCare™ Enterprise Healthcare Legal Platform",

    visualStyle: "luxury_enterprise_medico_legal",

    logoRequired: true,

    colors: {
      royalBlue: "#002B5C",
      luxuryGold: "#C9A13B",
      darkGray: "#2F2F2F",
      white: "#FFFFFF",
      lightBlue: "#4B9CD3",
    },
  },

  languages: ["en", "ar"],

  defaultLanguage: "bilingual",

  layout: {
    direction: "bilingual",
    rtlSupported: true,
    tabletOptimized: true,
    printSafe: true,
    pdfReady: true,
    signatureSafe: true,
    qrVerificationEnabled: true,
  },

  applicability: {
    departments: [
      "Radiology",
      "Interventional Radiology",
      "Medical Imaging",
    ],

    procedureTypes: [
      "Diagnostic Imaging",
      "Interventional Imaging",
      "Contrast Imaging",
      "Image-Guided Procedure",
    ],

    requiresPhysicianDisclosure: true,
    requiresContrastScreening: true,
    requiresSedationDisclosure: true,
  },

  evidence: {
    evidenceIdRequired: true,
    qrVerificationRequired: true,
    otpSupported: true,
    electronicSignatureSupported: true,
    auditHashRequired: true,
    templateVersionRequired: true,
    generatedTimestampRequired: true,

    verificationUrlPattern:
      "/verify/{evidenceId}",

    internalPreviewVerificationUrlPattern:
      "/internal/verify/{evidenceId}?engine=dynamic-preview",
  },

  sections: [
    {
      id: "patient_procedure_identification",

      order: 1,

      type: "data_capture",

      title: {
        en: "Patient & Procedure Identification",
        ar: "بيانات المريض والإجراء",
      },

      fields: [
        {
          id: "patientName",
          label: {
            en: "Patient Name",
            ar: "اسم المريض",
          },
          type: "text",
          source: "patient",
          required: true,
        },

        {
          id: "mrn",
          label: {
            en: "MRN",
            ar: "الرقم الطبي",
          },
          type: "text",
          source: "patient",
          required: true,
        },

        {
          id: "nationalId",
          label: {
            en: "National ID / Iqama",
            ar: "رقم الهوية / الإقامة",
          },
          type: "text",
          source: "patient",
          required: false,
        },

        {
          id: "encounterNumber",
          label: {
            en: "Encounter Number",
            ar: "رقم الزيارة",
          },
          type: "text",
          source: "encounter",
          required: true,
        },

        {
          id: "dateOfBirth",
          label: {
            en: "Date of Birth",
            ar: "تاريخ الميلاد",
          },
          type: "date",
          source: "patient",
          required: false,
        },

        {
          id: "gender",
          label: {
            en: "Gender",
            ar: "الجنس",
          },
          type: "text",
          source: "patient",
          required: false,
        },

        {
          id: "orderingPhysician",
          label: {
            en: "Ordering Physician",
            ar: "الطبيب المعالج",
          },
          type: "text",
          source: "clinical",
          required: true,
        },

        {
          id: "performingPhysician",
          label: {
            en: "Performing Physician",
            ar: "الطبيب القائم بالإجراء",
          },
          type: "text",
          source: "clinical",
          required: true,
        },

        {
          id: "procedureName",
          label: {
            en: "Procedure Name",
            ar: "اسم الإجراء",
          },
          type: "text",
          source: "clinical",
          required: true,
        },

        {
          id: "procedureSiteSide",
          label: {
            en: "Procedure Site / Side",
            ar: "موضع / جهة الإجراء",
          },
          type: "text",
          source: "clinical",
          required: true,
        },

        {
          id: "dateTime",
          label: {
            en: "Date & Time",
            ar: "التاريخ والوقت",
          },
          type: "datetime",
          source: "system",
          required: true,
        },

        {
          id: "interpreterRequired",
          label: {
            en: "Interpreter Required",
            ar: "هل يوجد مترجم",
          },
          type: "boolean",
          source: "workflow",
          required: true,
        },

        {
          id: "preferredLanguage",
          label: {
            en: "Preferred Language",
            ar: "اللغة المفضلة",
          },
          type: "select",
          options: [
            "Arabic",
            "English",
            "Bilingual",
          ],
          required: true,
        },
      ],
    },

    {
      id: "clinical_summary",

      order: 2,

      type: "narrative",

      title: {
        en: "Clinical Summary",
        ar: "الملخص الطبي",
      },

      content: {
        en:
          "Your treating physician has explained your medical condition, the purpose of the proposed radiology/interventional imaging procedure, expected benefits, potential limitations, available alternatives, and the possible risks and complications associated with the procedure.",

        ar:
          "قام الطبيب المعالج بشرح حالتك الطبية، والغرض من إجراء التصوير الطبي / الأشعة التداخلية المقترح، والفوائد المتوقعة، والقيود المحتملة، والبدائل العلاجية المتاحة، بالإضافة إلى المخاطر والمضاعفات المحتملة المرتبطة بالإجراء.",
      },
    },

    {
      id: "procedure_description",

      order: 3,

      type: "clinical_input",

      title: {
        en: "Procedure Description",
        ar: "وصف الإجراء",
      },

      fields: [
        {
          id: "procedure",
          label: {
            en: "Procedure",
            ar: "الإجراء",
          },
          type: "textarea",
          required: true,
        },

        {
          id: "clinicalIndication",
          label: {
            en: "Clinical Indication",
            ar: "السبب الطبي",
          },
          type: "textarea",
          required: true,
        },

        {
          id: "siteSide",
          label: {
            en: "Site & Side",
            ar: "موضع وجهة الإجراء",
          },
          type: "textarea",
          required: true,
        },
      ],
    },

    {
      id: "sedation_anesthesia_disclosure",

      order: 4,

      type: "risk_disclosure",

      title: {
        en: "Sedation / Anesthesia Disclosure",
        ar: "الإفصاح الخاص بالتخدير / التهدئة",
      },

      content: {
        en:
          "The proposed procedure may require local anesthesia, conscious sedation, or other medically appropriate anesthesia support depending on procedural and clinical requirements.",

        ar:
          "قد يتطلب الإجراء استخدام التخدير الموضعي أو التهدئة الواعية أو أي وسيلة تخدير أخرى مناسبة طبيًا بحسب متطلبات الحالة والإجراء.",
      },

      risks: [
        {
          id: "dizziness_fainting",
          severity: "moderate",
          label: {
            en: "Dizziness or fainting",
            ar: "الدوخة أو الإغماء",
          },
        },

        {
          id: "nausea_vomiting",
          severity: "low",
          label: {
            en: "Nausea or vomiting",
            ar: "الغثيان أو القيء",
          },
        },

        {
          id: "respiratory_complications",
          severity: "high",
          label: {
            en: "Respiratory complications",
            ar: "مضاعفات تنفسية",
          },
        },

        {
          id: "stroke",
          severity: "critical",
          label: {
            en: "Stroke",
            ar: "السكتة الدماغية",
          },
        },

        {
          id: "life_threatening",
          severity: "critical",
          label: {
            en: "Rare life-threatening complications",
            ar: "مضاعفات نادرة قد تهدد الحياة",
          },
        },
      ],
    },

    {
      id: "procedure_risk_matrix",

      order: 5,

      type: "risk_matrix",

      title: {
        en: "Procedure Risk Matrix",
        ar: "مصفوفة المخاطر والمضاعفات",
      },

      riskGroups: [
        {
          id: "common",

          title: {
            en: "Common Risks",
            ar: "المخاطر الشائعة",
          },

          items: [
            {
              en: "Minor pain or bruising",
              ar: "ألم بسيط أو كدمات",
            },

            {
              en: "Bleeding at puncture site",
              ar: "نزيف في موضع دخول الإبرة",
            },

            {
              en: "Temporary discomfort",
              ar: "انزعاج مؤقت",
            },
          ],
        },

        {
          id: "less_common",

          title: {
            en: "Less Common Risks",
            ar: "المخاطر الأقل شيوعًا",
          },

          items: [
            {
              en: "Infection",
              ar: "عدوى",
            },

            {
              en: "Vessel or organ injury",
              ar: "إصابة وعاء دموي أو عضو",
            },

            {
              en: "Contrast leakage",
              ar: "تسرب الصبغة خارج الوريد",
            },
          ],
        },

        {
          id: "rare",

          title: {
            en: "Rare Risks",
            ar: "المخاطر النادرة",
          },

          items: [
            {
              en: "Severe allergic reactions",
              ar: "تفاعلات تحسسية شديدة",
            },

            {
              en: "Cardiac arrest",
              ar: "توقف القلب",
            },

            {
              en: "Permanent disability",
              ar: "إعاقة دائمة",
            },

            {
              en: "Death, rarely",
              ar: "الوفاة في حالات نادرة",
            },
          ],
        },
      ],
    },

    {
      id: "radiation_disclosure",

      order: 6,

      type: "legal_medical_disclosure",

      title: {
        en: "Radiation Disclosure",
        ar: "الإفصاح المتعلق بالإشعاع",
      },

      content: {
        en:
          "This procedure may involve exposure to ionizing radiation (X-rays).",

        ar:
          "قد يتضمن هذا الإجراء التعرض للأشعة المؤينة (الأشعة السينية).",
      },
    },

    {
      id: "pdpl_digital_consent",

      order: 7,

      type: "privacy_digital_consent",

      title: {
        en: "PDPL & Digital Consent",
        ar: "حماية البيانات والموافقة الرقمية",
      },

      content: {
        en:
          "I acknowledge and consent to the lawful processing of my personal and health information in accordance with the Personal Data Protection Law (PDPL) and healthcare regulations in the Kingdom of Saudi Arabia.",

        ar:
          "أقر وأوافق على المعالجة النظامية لبياناتي الشخصية والصحية وفقًا لنظام حماية البيانات الشخصية (PDPL) والأنظمة الصحية المعمول بها في المملكة العربية السعودية.",
      },
    },

    {
      id: "electronic_signatures",

      order: 8,

      type: "signature_block",

      title: {
        en: "Electronic Signatures",
        ar: "التوقيعات الإلكترونية",
      },

      signers: [
        {
          role: "patient",
          label: {
            en: "Patient",
            ar: "المريض",
          },
          required: true,
          method: ["e_signature", "otp"],
        },

        {
          role: "physician",
          label: {
            en: "Physician",
            ar: "الطبيب",
          },
          required: true,
          method: ["e_signature"],
        },

        {
          role: "witness",
          label: {
            en: "Witness",
            ar: "الشاهد",
          },
          required: false,
          method: ["e_signature"],
        },
      ],
    },

    {
      id: "verification_audit_evidence",

      order: 9,

      type: "evidence_footer",

      title: {
        en: "Verification & Audit Evidence",
        ar: "التحقق والتوثيق الإلكتروني",
      },

      evidenceFields: [
        "evidenceId",
        "qrVerification",
        "auditHash",
        "templateVersion",
        "digitalTimestamp",
        "verificationReference",
      ],
    },
  ],

  footer: {
    en:
      "International Medical Center (IMC) — WathiqCare™ Enterprise Healthcare Legal Platform — Confidential Medico-Legal Document",

    ar:
      "المركز الطبي الدولي — منصة WathiqCare™ للرعاية الصحية القانونية — مستند طبي قانوني سري",
  },
};

export default IMC_RADIOLOGY_INTERVENTIONAL_IMAGING_CONSENT;