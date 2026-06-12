import { Prisma } from "@prisma/client";
import { ConsentSectionKind, ConsentTemplateStatus } from "@/lib/server/prisma-enums";
import crypto from "node:crypto";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
  SAUDI_ENTERPRISE_TEMPLATES,
  buildSaudiTemplateBodyAr,
  buildSaudiTemplateBodyEn,
  buildSaudiTemplateSections,
  type SaudiEnterpriseTemplateSeed,
} from "@/lib/server/informed-consents-saudi-template-library";

const prisma = () => getPrisma();

export type RuntimeConsentTemplate = {
  id: string;
  templateVersionId: string;
  titleAr: string;
  titleEn: string;
  consentType: string;
  specialty: string;
  department: string | null;
  version: string;
  status: ConsentTemplateStatus;
  language: "bilingual";
  summaryAr: string | null;
  summaryEn: string | null;
  previewAr: string;
  previewEn: string;
};

type RuntimeTemplateFilter = {
  consentType?: string;
  specialty?: string;
  department?: string;
};

type DefaultTemplateSeed = SaudiEnterpriseTemplateSeed;

type ConsentCatalogCapability = {
  capable: boolean;
  reason: string;
  queryableTables: string[];
  missingTables: string[];
  icuTemplateId?: string;
  currentVersionId?: string;
};

const REQUIRED_CONSENT_CATALOG_TABLES = [
  "consent_categories",
  "consent_templates",
  "consent_template_versions",
  "consent_template_sections",
  "consent_template_localizations",
] as const;

const ICU_CRITICAL_CARE_TEMPLATE_CODE = "ICU_CRITICAL_CARE_CONSENT";

const FIXED_LEGAL_TITLE_AR = "الموافقة المستنيرة الطبية";
const FIXED_LEGAL_TITLE_EN = "Medical Informed Consent";

const FIXED_MAIN_AR = "\u0623\u0642\u0631 \u0623\u0646\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0623\u062f\u0646\u0627\u0647 \u0628\u0623\u0646 \u0627\u0644\u0637\u0628\u064a\u0628 \u0627\u0644\u0645\u0639\u0627\u0644\u062c \u0648\u0641\u0631\u064a\u0642 \u0627\u0644\u0631\u0639\u0627\u064a\u0629 \u0627\u0644\u0635\u062d\u064a\u0629 \u0642\u062f \u0642\u0627\u0645\u0648\u0627 \u0628\u0634\u0631\u062d \u062d\u0627\u0644\u062a\u064a \u0627\u0644\u0635\u062d\u064a\u0629 \u0648\u0637\u0628\u064a\u0639\u0629 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0637\u0628\u064a / \u0627\u0644\u062c\u0631\u0627\u062d\u064a / \u0627\u0644\u062a\u0634\u062e\u064a\u0635\u064a / \u0627\u0644\u0639\u0644\u0627\u062c\u064a \u0627\u0644\u0645\u0642\u062a\u0631\u062d \u0644\u064a \u0628\u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062d\u0629 \u0648\u0645\u0641\u0647\u0648\u0645\u0629\u060c \u0628\u0645\u0627 \u0641\u064a \u0630\u0644\u0643 \u0627\u0644\u063a\u0631\u0636 \u0645\u0646 \u0627\u0644\u0625\u062c\u0631\u0627\u0621\u060c \u0648\u0627\u0644\u0641\u0648\u0627\u0626\u062f \u0627\u0644\u0645\u062a\u0648\u0642\u0639\u0629\u060c \u0648\u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u0648\u0627\u0644\u0645\u0636\u0627\u0639\u0641\u0627\u062a \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0629\u060c \u0648\u0627\u0644\u0628\u062f\u0627\u0626\u0644 \u0627\u0644\u0639\u0644\u0627\u062c\u064a\u0629 \u0627\u0644\u0645\u0645\u0643\u0646\u0629\u060c \u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0623\u0648 \u0627\u0644\u0645\u0636\u0627\u0639\u0641\u0627\u062a \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0629 \u0641\u064a \u062d\u0627\u0644 \u0631\u0641\u0636 \u0627\u0644\u0639\u0644\u0627\u062c \u0623\u0648 \u0639\u062f\u0645 \u0625\u062c\u0631\u0627\u0626\u0647.\n\n\u0643\u0645\u0627 \u0623\u0642\u0631 \u0628\u0623\u0646\u0647 \u0623\u062a\u064a\u062d\u062a \u0644\u064a \u0627\u0644\u0641\u0631\u0635\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0644\u0637\u0631\u062d \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u062a\u0639\u0644\u0642\u0629 \u0628\u062d\u0627\u0644\u062a\u064a \u0627\u0644\u0635\u062d\u064a\u0629 \u0648\u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0645\u0642\u062a\u0631\u062d\u060c \u0648\u0642\u062f \u062a\u0645\u062a \u0627\u0644\u0625\u062c\u0627\u0628\u0629 \u0639\u0644\u0649 \u062c\u0645\u064a\u0639 \u0627\u0633\u062a\u0641\u0633\u0627\u0631\u0627\u062a\u064a \u0628\u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062d\u0629 \u0648\u0645\u0641\u0647\u0648\u0645\u0629 \u0648\u0645\u0631\u0636\u064a\u0629 \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0644\u064a.\n\n\u0648\u0623\u0641\u0647\u0645 \u0623\u0646 \u0645\u0645\u0627\u0631\u0633\u0629 \u0627\u0644\u0637\u0628 \u0648\u0627\u0644\u062c\u0631\u0627\u062d\u0629 \u0644\u0627 \u062a\u062e\u0644\u0648 \u0645\u0646 \u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u0648\u0627\u0644\u0645\u0636\u0627\u0639\u0641\u0627\u062a \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0629\u060c \u0648\u0623\u0646\u0647 \u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u0642\u062f\u064a\u0645 \u0623\u0648 \u0636\u0645\u0627\u0646 \u0646\u062a\u0627\u0626\u062c \u0645\u062d\u062f\u062f\u0629 \u0628\u0634\u0643\u0644 \u0645\u0637\u0644\u0642\u060c \u0631\u063a\u0645 \u0627\u062a\u062e\u0627\u0630 \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0639\u0627\u064a\u064a\u0631 \u0627\u0644\u0645\u0647\u0646\u064a\u0629 \u0648\u0627\u0644\u0637\u0628\u064a\u0629 \u0627\u0644\u0645\u062a\u0639\u0627\u0631\u0641 \u0639\u0644\u064a\u0647\u0627.\n\n\u0648\u0623\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0648\u0645\u0639\u0627\u0644\u062c\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062a\u064a \u0627\u0644\u0635\u062d\u064a\u0629 \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0628\u0627\u0644\u0642\u062f\u0631 \u0627\u0644\u0644\u0627\u0632\u0645 \u0644\u0623\u063a\u0631\u0627\u0636 \u0627\u0644\u0639\u0644\u0627\u062c \u0648\u0627\u0644\u0631\u0639\u0627\u064a\u0629 \u0627\u0644\u0635\u062d\u064a\u0629 \u0648\u0627\u0644\u062a\u0648\u062b\u064a\u0642 \u0627\u0644\u0637\u0628\u064a \u0648\u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0628\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0648\u0627\u0644\u0644\u0648\u0627\u0626\u062d \u0627\u0644\u0635\u062d\u064a\u0629 \u0627\u0644\u0645\u0639\u0645\u0648\u0644 \u0628\u0647\u0627\u060c \u0648\u0641\u0642\u064b\u0627 \u0644\u0646\u0638\u0627\u0645 \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0630\u0627\u062a \u0627\u0644\u0639\u0644\u0627\u0642\u0629 \u0641\u064a \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629.\n\n\u0643\u0645\u0627 \u0623\u0642\u0631 \u0628\u0623\u0646 \u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u062a\u0645\u062b\u0644 \u0645\u0648\u0627\u0641\u0642\u0629 \u0645\u0633\u062a\u0646\u064a\u0631\u0629 \u0648\u0635\u0627\u062f\u0631\u0629 \u0628\u0625\u0631\u0627\u062f\u062a\u064a \u0627\u0644\u062d\u0631\u0629 \u062f\u0648\u0646 \u0623\u064a \u0625\u0643\u0631\u0627\u0647 \u0623\u0648 \u0636\u063a\u0637.";

const FIXED_MAIN_EN = `I, the undersigned, hereby acknowledge that the treating physician and healthcare team have explained to me, in a clear and understandable manner, my medical condition and the nature of the proposed medical, surgical, diagnostic, or therapeutic procedure, including the purpose of the procedure, expected benefits, potential risks and complications, available treatment alternatives, and the possible consequences or complications that may arise from refusing or delaying treatment.

I further acknowledge that I have been given full opportunity to ask questions and discuss concerns regarding my condition and the proposed procedure, and that all my questions have been answered clearly and satisfactorily.

I understand that the practice of medicine and surgery involves inherent risks and potential complications, and that no absolute guarantee or assurance has been made regarding specific outcomes, despite adherence to recognized medical and professional standards.

I further understand that certain risks or complications may be common, uncommon, serious, or life-threatening depending on the nature of the procedure and my medical condition.

I also authorize the medical team to perform any additional or emergency procedures deemed medically necessary during or after the procedure in order to preserve my health and safety in accordance with accepted medical standards.

I acknowledge that the available anesthesia options â€” where applicable â€” together with their potential risks and complications have been explained to me.

I consent to the use and processing of my personal health information to the extent necessary for treatment, healthcare operations, medical documentation, and compliance with applicable healthcare laws and regulations, in accordance with the Personal Data Protection Law (PDPL) and related regulations of the Kingdom of Saudi Arabia.

I further acknowledge that this informed consent is given voluntarily and without coercion or undue pressure.`;

const PATIENT_ACK_AR = "إقرار المريض / ولي الأمر: أقر بأنني قرأت وفهمت مضمون هذه الموافقة، وأن المعلومات المتعلقة بحالتي الصحية والإجراء المقترح قد تم شرحها لي بلغة واضحة ومفهومة، وأنني وافقت على الإجراء بعد اطلاعي على الفوائد والمخاطر والمضاعفات والبدائل ومخاطر الرفض.";
const PATIENT_ACK_EN = "Patient / Guardian Acknowledgment: I acknowledge that I have read and understood the contents of this consent form, and that the information regarding my medical condition and the proposed procedure has been explained to me in clear and understandable language. I consent to the procedure after being informed of the benefits, risks, complications, alternatives, and risks of refusal.";

const PHYSICIAN_CERT_AR = "إقرار الطبيب: أقر أنا الطبيب / الممارس الصحي الموقع أدناه بأنني قمت بشرح الحالة الطبية للمريض وطبيعة الإجراء المقترح والفوائد والمخاطر والمضاعفات المحتملة والبدائل العلاجية ومخاطر رفض العلاج للمريض أو لممثله النظامي بصورة واضحة ومفهومة، وأجبت على كافة الاستفسارات المطروحة وفقًا للأصول المهنية والطبية المتعارف عليها.";
const PHYSICIAN_CERT_EN = "Physician Certification: I, the undersigned physician / healthcare practitioner, certify that I have explained to the patient or the patientâ€™s legal representative the medical condition, the nature of the proposed procedure, expected benefits, potential risks and complications, available treatment alternatives, and the risks of refusing treatment in a clear and understandable manner, and that I have answered all related questions in accordance with accepted medical and professional standards.";

const GUARDIAN_ACK_AR = "\u0625\u0642\u0631\u0627\u0631 \u0648\u0644\u064a \u0627\u0644\u0623\u0645\u0631 / \u0627\u0644\u0645\u0645\u062b\u0644 \u0627\u0644\u0646\u0638\u0627\u0645\u064a: \u0623\u0642\u0631 \u0623\u0646\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0623\u062f\u0646\u0627\u0647 \u0628\u0635\u0641\u062a\u064a \u0648\u0644\u064a\u064b\u0627 \u0634\u0631\u0639\u064a\u064b\u0627 / \u0645\u0645\u062b\u0644\u064b\u0627 \u0646\u0638\u0627\u0645\u064a\u064b\u0627 \u0644\u0644\u0645\u0631\u064a\u0636 \u0628\u0623\u0646\u0646\u064a \u0645\u062e\u0648\u0644 \u0646\u0638\u0627\u0645\u064b\u0627 \u0628\u0625\u0639\u0637\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0646\u064a\u0627\u0628\u0629 \u0639\u0646\u0647\u060c \u0648\u0623\u0646\u0647 \u062a\u0645 \u0634\u0631\u062d \u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0628\u064a\u0629 \u0648\u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0645\u0642\u062a\u0631\u062d \u0648\u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u0648\u0627\u0644\u0628\u062f\u0627\u0626\u0644 \u0627\u0644\u0639\u0644\u0627\u062c\u064a\u0629 \u0644\u064a \u0628\u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062d\u0629 \u0648\u0645\u0641\u0647\u0648\u0645\u0629.";

const GUARDIAN_ACK_EN = "Legal Guardian / Substitute Decision Maker Acknowledgment: I, the undersigned, acting as the patientâ€™s legal guardian / authorized substitute decision maker, acknowledge that I am legally authorized to provide this consent on behalf of the patient, and that the medical condition, proposed procedure, risks, and treatment alternatives have been clearly explained to me.";

const INTERPRETER_ACK_AR = "\u0625\u0642\u0631\u0627\u0631 \u0627\u0644\u0645\u062a\u0631\u062c\u0645: \u0623\u0642\u0631 \u0628\u0623\u0646 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u0639\u0644\u0642\u0629 \u0628\u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0635\u062d\u064a\u0629 \u0648\u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0645\u0642\u062a\u0631\u062d \u0642\u062f \u062a\u0645 \u0634\u0631\u062d\u0647\u0627 \u0644\u0644\u0645\u0631\u064a\u0636 / \u0648\u0644\u064a \u0627\u0644\u0623\u0645\u0631 \u0628\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u062a\u064a \u064a\u0641\u0647\u0645\u0647\u0627\u060c \u0648\u0623\u0646\u0646\u064a \u0642\u0645\u062a \u0628\u0627\u0644\u062a\u0631\u062c\u0645\u0629 \u0628\u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062d\u0629 \u0648\u0645\u0641\u0647\u0648\u0645\u0629.";

const INTERPRETER_ACK_EN = "Interpreter Acknowledgment: I acknowledge that the information regarding the patientâ€™s medical condition and proposed procedure has been explained to the patient / guardian in a language they understand, and that I have provided interpretation clearly and appropriately.";

const NO_GUARANTEE_AR = "\u0639\u062f\u0645 \u0636\u0645\u0627\u0646 \u0627\u0644\u0646\u062a\u0627\u0626\u062c: \u0623\u0641\u0647\u0645 \u0648\u0623\u0642\u0631 \u0628\u0623\u0646\u0647 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0636\u0645\u0627\u0646 \u0623\u0648 \u0627\u0644\u062a\u0639\u0647\u062f \u0628\u0646\u062a\u0627\u0626\u062c \u0645\u062d\u062f\u062f\u0629 \u0644\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0637\u0628\u064a \u0623\u0648 \u0627\u0644\u062c\u0631\u0627\u062d\u064a \u0623\u0648 \u0627\u0644\u0639\u0644\u0627\u062c\u064a\u060c \u0648\u0623\u0646 \u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0644\u0644\u0639\u0644\u0627\u062c \u062a\u062e\u062a\u0644\u0641 \u0645\u0646 \u0634\u062e\u0635 \u0644\u0622\u062e\u0631 \u0628\u062d\u0633\u0628 \u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0635\u062d\u064a\u0629 \u0648\u0627\u0644\u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u0637\u0628\u064a\u0629 \u0627\u0644\u0645\u062e\u062a\u0644\u0641\u0629.";

const NO_GUARANTEE_EN = "No Guarantee of Outcome: I understand and acknowledge that no specific result or outcome can be guaranteed for the medical, surgical, or therapeutic procedure, and that treatment outcomes may vary depending on individual medical conditions and related factors.";

const ELECTRONIC_SIGNATURE_AR = "\u0627\u0644\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a: \u064a\u0639\u062f \u0627\u0644\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0623\u0648 \u0627\u0644\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0645\u0631\u0633\u0644 \u0639\u0628\u0631 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0627\u0644\u0622\u0645\u0646 \u0645\u0639\u062a\u0645\u062f\u064b\u0627 \u0648\u0645\u0644\u0632\u0645\u064b\u0627 \u0646\u0638\u0627\u0645\u064b\u0627\u060c \u0648\u064a\u062a\u0631\u062a\u0628 \u0639\u0644\u064a\u0647 \u0630\u0627\u062a \u0627\u0644\u0623\u062b\u0631 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0644\u0644\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u062e\u0637\u064a\u060c \u0648\u0630\u0644\u0643 \u0648\u0641\u0642\u064b\u0627 \u0644\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0645\u0639\u0645\u0648\u0644 \u0628\u0647\u0627 \u0641\u064a \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629.";

const ELECTRONIC_SIGNATURE_EN = "Electronic Signature: Electronic signatures or signatures executed through a secure electronic link shall be considered legally valid and binding and shall have the same legal effect as handwritten signatures in accordance with the applicable laws and regulations of the Kingdom of Saudi Arabia.";

const PDPL_AR = "أوافق على استخدام ومعالجة معلوماتي الصحية الشخصية بالقدر اللازم لأغراض العلاج والرعاية الصحية والتوثيق الطبي والالتزام بالأنظمة واللوائح الصحية المعمول بها، ووفقًا لنظام حماية البيانات الشخصية والأنظمة ذات العلاقة في المملكة العربية السعودية.";
const PDPL_EN = "I consent to the use and processing of my personal health information to the extent necessary for treatment, healthcare operations, medical documentation, and compliance with applicable healthcare laws and regulations, in accordance with the Personal Data Protection Law (PDPL) and related regulations of the Kingdom of Saudi Arabia.";

const LEGACY_DEFAULT_TEMPLATES: Array<Record<string, unknown>> = [
  {
    categoryCode: "GENERAL_CONSENT",
    categoryNameAr: "Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¹Ø§Ù…Ø©",
    categoryNameEn: "General Consent",
    templateCode: "GENERAL_TREATMENT_CONSENT",
    consentType: "GENERAL_CONSENT",
    specialty: "GENERAL_MEDICINE",
    department: "GENERAL_MEDICINE",
    titleAr: "Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¹Ø§Ù…Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø¹Ù„Ø§Ø¬",
    titleEn: "General Treatment Consent",
    summaryAr: "Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ø§Ø¬ÙŠØ© Ø¹Ø§Ù…Ø© Ø«Ù†Ø§Ø¦ÙŠØ© Ø§Ù„Ù„ØºØ© Ù…Ø¹ ÙÙ‚Ø±Ø§Øª Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© Ø«Ø§Ø¨ØªØ©.",
    summaryEn: "Bilingual general treatment consent with fixed legal wording.",
  },
  {
    categoryCode: "SURGICAL_CONSENT",
    categoryNameAr: "Ù…ÙˆØ§ÙÙ‚Ø© Ø¬Ø±Ø§Ø­ÙŠØ©",
    categoryNameEn: "Surgical Consent",
    templateCode: "GENERAL_SURGICAL_CONSENT",
    consentType: "SURGICAL_CONSENT",
    specialty: "SURGERY",
    department: "GENERAL_SURGERY",
    titleAr: "Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¬Ø±Ø§Ø­ÙŠØ© Ø§Ù„Ø¹Ø§Ù…Ø©",
    titleEn: "General Surgical Consent",
    summaryAr: "Ù…ÙˆØ§ÙÙ‚Ø© Ø¬Ø±Ø§Ø­ÙŠØ© Ù„Ù„Ù…Ù…Ø§Ø±Ø³Ø§Øª Ø§Ù„Ø¬Ø±Ø§Ø­ÙŠØ© Ø§Ù„Ø±ÙˆØªÙŠÙ†ÙŠØ© ÙˆØ¹Ø§Ù„ÙŠØ© Ø§Ù„Ù…Ø®Ø§Ø·Ø±.",
    summaryEn: "Surgical consent for routine and high-risk surgery workflows.",
  },
  {
    categoryCode: "ANESTHESIA_CONSENT",
    categoryNameAr: "Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„ØªØ®Ø¯ÙŠØ±",
    categoryNameEn: "Anesthesia Consent",
    templateCode: "ANESTHESIA_CONSENT",
    consentType: "ANESTHESIA_CONSENT",
    specialty: "ANESTHESIA",
    department: "ANESTHESIA",
    titleAr: "Ù†Ù…ÙˆØ°Ø¬ Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„ØªØ®Ø¯ÙŠØ±",
    titleEn: "Anesthesia Consent",
    summaryAr: "Ù…ÙˆØ§ÙÙ‚Ø© ØªØ®Ø¯ÙŠØ± ØªØ´Ù…Ù„ Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø´Ø§Ø¦Ø¹Ø© ÙˆØ§Ù„Ù†Ø§Ø¯Ø±Ø© ÙˆØ®ÙŠØ§Ø±Ø§Øª Ø§Ù„ØªØ®Ø¯ÙŠØ±.",
    summaryEn: "Anesthesia consent covering common/rare risks and anesthesia options.",
  },
  {
    categoryCode: "BLOOD_TRANSFUSION_CONSENT",
    categoryNameAr: "Ù…ÙˆØ§ÙÙ‚Ø© Ù†Ù‚Ù„ Ø§Ù„Ø¯Ù…",
    categoryNameEn: "Blood Transfusion Consent",
    templateCode: "BLOOD_TRANSFUSION_CONSENT",
    consentType: "BLOOD_TRANSFUSION_CONSENT",
    specialty: "GENERAL_MEDICINE",
    department: "HEMATOLOGY",
    titleAr: "Ù†Ù…ÙˆØ°Ø¬ Ù…ÙˆØ§ÙÙ‚Ø© Ù†Ù‚Ù„ Ø§Ù„Ø¯Ù…",
    titleEn: "Blood Transfusion Consent",
    summaryAr: "Ù…ÙˆØ§ÙÙ‚Ø© Ù†Ù‚Ù„ Ø§Ù„Ø¯Ù… Ù…Ø¹ Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø©.",
    summaryEn: "Blood transfusion consent with alternatives and potential complications.",
  },
  {
    categoryCode: "REFUSAL_OF_TREATMENT",
    categoryNameAr: "Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ / Ø¯Ø§Ù…Ø§",
    categoryNameEn: "DAMA / Refusal",
    templateCode: "DAMA_REFUSAL_OF_TREATMENT",
    consentType: "REFUSAL_OF_TREATMENT",
    specialty: "GENERAL_MEDICINE",
    department: "EMERGENCY",
    titleAr: "Ù†Ù…ÙˆØ°Ø¬ Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ (DAMA)",
    titleEn: "DAMA / Refusal of Treatment",
    summaryAr: "Ø¥Ù‚Ø±Ø§Ø± Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ Ù…Ø¹ ØªÙˆØ«ÙŠÙ‚ Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø±ÙØ¶ ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„.",
    summaryEn: "Refusal of treatment acknowledgment with refusal risks and alternatives.",
  },
];

const FIXED_DEFAULT_TEMPLATES: DefaultTemplateSeed[] = SAUDI_ENTERPRISE_TEMPLATES;

function requireTenantId(auth: AuthContext): string {
  const tenantId = (auth.tenant_id || "").trim();
  if (!tenantId) {
    throw new ApiError(400, "Missing tenant context");
  }
  return tenantId;
}

function normalizeFilter(value: string | null | undefined): string {
  return (value || "").trim();
}

function readPrismaCode(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code?: unknown }).code || "");
  }

  return "";
}

function isSchemaQueryFailure(error: unknown): boolean {
  const prismaCode = readPrismaCode(error);
  return prismaCode === "P2021" || prismaCode === "P2022";
}

export async function isConsentCatalogCapable(
  tenantId: string,
): Promise<ConsentCatalogCapability> {
  const normalizedTenantId = tenantId.trim();

  if (!normalizedTenantId) {
    return {
      capable: false,
      reason: "Missing tenant context for informed-consent catalog capability check.",
      queryableTables: [],
      missingTables: [...REQUIRED_CONSENT_CATALOG_TABLES],
    };
  }

  try {
    const tableRows = await prisma().$queryRawUnsafe<
      Array<{ table_name: string; row_count: number }>
    >(
      `
        SELECT 'consent_categories' AS table_name, COUNT(*)::int AS row_count FROM consent_categories
        UNION ALL
        SELECT 'consent_templates' AS table_name, COUNT(*)::int AS row_count FROM consent_templates
        UNION ALL
        SELECT 'consent_template_versions' AS table_name, COUNT(*)::int AS row_count FROM consent_template_versions
        UNION ALL
        SELECT 'consent_template_sections' AS table_name, COUNT(*)::int AS row_count FROM consent_template_sections
        UNION ALL
        SELECT 'consent_template_localizations' AS table_name, COUNT(*)::int AS row_count FROM consent_template_localizations
      `,
    );

    const queryableTables = tableRows.map((row) => row.table_name);
    const missingTables = REQUIRED_CONSENT_CATALOG_TABLES.filter(
      (tableName) => !queryableTables.includes(tableName),
    );

    if (missingTables.length > 0) {
      return {
        capable: false,
        reason: `Required informed-consent catalog tables are unavailable: ${missingTables.join(", ")}.`,
        queryableTables,
        missingTables: [...missingTables],
      };
    }

    const icuTemplates = await prisma().$queryRawUnsafe<
      Array<{
        id: string;
        tenant_id: string;
        current_version_id: string | null;
        version_status: string | null;
      }>
    >(
      `
        SELECT
          t.id,
          t.tenant_id,
          t.current_version_id,
          v.status::text AS version_status
        FROM consent_templates t
        LEFT JOIN consent_template_versions v
          ON v.id = t.current_version_id
        WHERE t.template_code = $1
          AND t.status IN ('ACTIVE', 'APPROVED')
          AND (t.tenant_id = $2 OR t.is_system_template = TRUE)
        ORDER BY CASE WHEN t.tenant_id = $2 THEN 0 ELSE 1 END, t.updated_at DESC
        LIMIT 1
      `,
      ICU_CRITICAL_CARE_TEMPLATE_CODE,
      normalizedTenantId,
    );

    const icuTemplate = icuTemplates[0];

    if (!icuTemplate) {
      return {
        capable: false,
        reason:
          "The informed-consent catalog is queryable, but ACTIVE ICU_CRITICAL_CARE_CONSENT is missing for this tenant or as an available system template.",
        queryableTables,
        missingTables: [],
      };
    }

    if (!icuTemplate.current_version_id) {
      return {
        capable: false,
        reason:
          "ACTIVE ICU_CRITICAL_CARE_CONSENT exists, but current_version_id is not populated.",
        queryableTables,
        missingTables: [],
        icuTemplateId: icuTemplate.id,
      };
    }

    if (
      icuTemplate.version_status !== ConsentTemplateStatus.ACTIVE &&
      icuTemplate.version_status !== ConsentTemplateStatus.APPROVED
    ) {
      return {
        capable: false,
        reason:
          "ACTIVE ICU_CRITICAL_CARE_CONSENT exists, but its current version is not ACTIVE or APPROVED.",
        queryableTables,
        missingTables: [],
        icuTemplateId: icuTemplate.id,
        currentVersionId: icuTemplate.current_version_id,
      };
    }

    return {
      capable: true,
      reason:
        "The informed-consent catalog is queryable and ICU_CRITICAL_CARE_CONSENT is active with a populated current version.",
      queryableTables,
      missingTables: [],
      icuTemplateId: icuTemplate.id,
      currentVersionId: icuTemplate.current_version_id,
    };
  } catch (error) {
    return {
      capable: false,
      reason: isSchemaQueryFailure(error)
        ? "One or more required informed-consent catalog tables could not be queried."
        : error instanceof Error
          ? error.message
          : "Consent catalog capability check failed.",
      queryableTables: [],
      missingTables: [...REQUIRED_CONSENT_CATALOG_TABLES],
    };
  }
}

function buildDefaultSections(): Array<{
  sectionKey: string;
  sectionKind: ConsentSectionKind;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  isRequired: boolean;
  isEditableByPhysician: boolean;
  sortOrder: number;
}> {
  return [
    {
      sectionKey: "fixed_patient_acknowledgment",
      sectionKind: ConsentSectionKind.FIXED_LEGAL,
      titleAr: "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø±ÙŠØ¶ / ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±",
      titleEn: "Patient / Guardian Acknowledgment",
      contentAr: PATIENT_ACK_AR,
      contentEn: PATIENT_ACK_EN,
      isRequired: true,
      isEditableByPhysician: false,
      sortOrder: 10,
    },
    {
      sectionKey: "dynamic_diagnosis",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„ØªØ´Ø®ÙŠØµ",
      titleEn: "Diagnosis",
      contentAr: "[ÙŠØ¯Ø®Ù„ Ø§Ù„Ø·Ø¨ÙŠØ¨ Ø§Ù„ØªØ´Ø®ÙŠØµ Ø§Ù„Ø·Ø¨ÙŠ Ù‡Ù†Ø§]",
      contentEn: "[Physician enters diagnosis here]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 20,
    },
    {
      sectionKey: "dynamic_medical_condition",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨ÙŠØ©",
      titleEn: "Medical condition",
      contentAr: "[ÙˆØµÙ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ©]",
      contentEn: "[Describe current medical condition]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 30,
    },
    {
      sectionKey: "dynamic_proposed_procedure",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­",
      titleEn: "Proposed procedure",
      contentAr: "[ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø·Ø¨ÙŠ/Ø§Ù„Ø¬Ø±Ø§Ø­ÙŠ Ø§Ù„Ù…Ù‚ØªØ±Ø­]",
      contentEn: "[Details of proposed medical/surgical procedure]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 40,
    },
    {
      sectionKey: "dynamic_procedure_site_laterality",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ù…ÙˆØ¶Ø¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ / Ø§Ù„Ø¬Ù‡Ø©",
      titleEn: "Procedure site / laterality",
      contentAr: "[Ø­Ø¯Ø¯ Ù…ÙˆØ¶Ø¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ ÙˆØ§Ù„Ø¬Ù‡Ø© Ø§Ù„ÙŠÙ…Ù†Ù‰/Ø§Ù„ÙŠØ³Ø±Ù‰ Ø¥Ù† ÙˆØ¬Ø¯Øª]",
      contentEn: "[Specify procedure site and laterality if applicable]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 50,
    },
    {
      sectionKey: "dynamic_expected_benefits",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„ÙÙˆØ§Ø¦Ø¯ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø©",
      titleEn: "Expected benefits",
      contentAr: "[Ø§Ù„ÙÙˆØ§Ø¦Ø¯ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø©]",
      contentEn: "[Expected therapeutic benefits]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 60,
    },
    {
      sectionKey: "dynamic_common_risks",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©",
      titleEn: "Common risks",
      contentAr: "[Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©]",
      contentEn: "[Common risks]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 70,
    },
    {
      sectionKey: "dynamic_uncommon_risks",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„Ù…Ø®Ø§Ø·Ø± ØºÙŠØ± Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©",
      titleEn: "Uncommon risks",
      contentAr: "[Ø§Ù„Ù…Ø®Ø§Ø·Ø± ØºÙŠØ± Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©]",
      contentEn: "[Uncommon risks]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 80,
    },
    {
      sectionKey: "dynamic_serious_risks",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø¬Ø³ÙŠÙ…Ø©",
      titleEn: "Serious risks",
      contentAr: "[Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø¬Ø³ÙŠÙ…Ø© Ø£Ùˆ Ø§Ù„Ù…Ù‡Ø¯Ø¯Ø© Ù„Ù„Ø­ÙŠØ§Ø©]",
      contentEn: "[Serious or life-threatening risks]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 90,
    },
    {
      sectionKey: "dynamic_complications",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª",
      titleEn: "Complications",
      contentAr: "[Ø§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø©]",
      contentEn: "[Potential complications]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 100,
    },
    {
      sectionKey: "dynamic_treatment_alternatives",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ù„Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ©",
      titleEn: "Treatment alternatives",
      contentAr: "[Ø§Ù„Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© Ø§Ù„Ù…Ù…ÙƒÙ†Ø©]",
      contentEn: "[Available treatment alternatives]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 110,
    },
    {
      sectionKey: "dynamic_refusal_risks",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ù…Ø®Ø§Ø·Ø± Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ / Ø¹Ø¯Ù… Ø§Ù„Ø¹Ù„Ø§Ø¬",
      titleEn: "Risks of refusal / non-treatment",
      contentAr: "[Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø© ÙÙŠ Ø­Ø§Ù„ Ø§Ù„Ø±ÙØ¶ Ø£Ùˆ Ø§Ù„ØªØ£Ø®ÙŠØ±]",
      contentEn: "[Expected risks if treatment is refused or delayed]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 120,
    },
    {
      sectionKey: "dynamic_post_procedure_instructions",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "ØªØ¹Ù„ÙŠÙ…Ø§Øª Ù…Ø§ Ø¨Ø¹Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡",
      titleEn: "Post-procedure instructions",
      contentAr: "[ØªØ¹Ù„ÙŠÙ…Ø§Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø¨Ø¹Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡]",
      contentEn: "[Post-procedure follow-up instructions]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 130,
    },
    {
      sectionKey: "dynamic_physician_notes",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø·Ø¨ÙŠØ¨",
      titleEn: "Physician notes",
      contentAr: "[Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ© Ù…Ù† Ø§Ù„Ø·Ø¨ÙŠØ¨]",
      contentEn: "[Additional physician notes]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 140,
    },
    {
      sectionKey: "dynamic_special_precautions",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "Ø§Ø­ØªÙŠØ§Ø·Ø§Øª Ø®Ø§ØµØ©",
      titleEn: "Special precautions",
      contentAr: "[Ø§Ø­ØªÙŠØ§Ø·Ø§Øª Ø®Ø§ØµØ© Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„Ø­Ø§Ù„Ø©]",
      contentEn: "[Special case-specific precautions]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 150,
    },
    {
      sectionKey: "fixed_physician_certification",
      sectionKind: ConsentSectionKind.FIXED_LEGAL,
      titleAr: "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ø·Ø¨ÙŠØ¨",
      titleEn: "Physician Certification",
      contentAr: PHYSICIAN_CERT_AR,
      contentEn: PHYSICIAN_CERT_EN,
      isRequired: true,
      isEditableByPhysician: false,
      sortOrder: 160,
    },
    {
      sectionKey: "fixed_legal_guardian_ack",
      sectionKind: ConsentSectionKind.FIXED_LEGAL,
      titleAr: "Ø¥Ù‚Ø±Ø§Ø± ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± / Ø§Ù„Ù…Ù…Ø«Ù„ Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠ",
      titleEn: "Legal Guardian / Substitute Decision Maker Acknowledgment",
      contentAr: GUARDIAN_ACK_AR,
      contentEn: GUARDIAN_ACK_EN,
      isRequired: false,
      isEditableByPhysician: false,
      sortOrder: 170,
    },
    {
      sectionKey: "interpreter_acknowledgment",
      sectionKind: ConsentSectionKind.INTERPRETER,
      titleAr: "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ù…ØªØ±Ø¬Ù…",
      titleEn: "Interpreter Acknowledgment",
      contentAr: INTERPRETER_ACK_AR,
      contentEn: INTERPRETER_ACK_EN,
      isRequired: false,
      isEditableByPhysician: false,
      sortOrder: 180,
    },
    {
      sectionKey: "fixed_no_guarantee",
      sectionKind: ConsentSectionKind.FIXED_LEGAL,
      titleAr: "Ø¹Ø¯Ù… Ø¶Ù…Ø§Ù† Ø§Ù„Ù†ØªØ§Ø¦Ø¬",
      titleEn: "No Guarantee of Outcome",
      contentAr: NO_GUARANTEE_AR,
      contentEn: NO_GUARANTEE_EN,
      isRequired: true,
      isEditableByPhysician: false,
      sortOrder: 190,
    },
    {
      sectionKey: "fixed_electronic_signature",
      sectionKind: ConsentSectionKind.SIGNATURE,
      titleAr: "Ø§Ù„ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ",
      titleEn: "Electronic Signature",
      contentAr: ELECTRONIC_SIGNATURE_AR,
      contentEn: ELECTRONIC_SIGNATURE_EN,
      isRequired: true,
      isEditableByPhysician: false,
      sortOrder: 200,
    },
  ];
}

async function ensureDefaultTemplates(tenantId: string, actorUserId?: string): Promise<void> {
  const now = new Date();

  for (const seed of FIXED_DEFAULT_TEMPLATES) {
    const category = await prisma().consentCategory.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: seed.categoryCode,
        },
      },
      update: {
        nameAr: seed.categoryNameAr,
        nameEn: seed.categoryNameEn,
        isActive: true,
      },
      create: {
        tenantId,
        code: seed.categoryCode,
        nameAr: seed.categoryNameAr,
        nameEn: seed.categoryNameEn,
        isActive: true,
      },
    });

    const template = await prisma().consentTemplate.upsert({
      where: {
        tenantId_templateCode: {
          tenantId,
          templateCode: seed.templateCode,
        },
      },
      update: {
        categoryId: category.id,
        riskLevel: seed.riskLevel,
        requiresWitness: seed.requiresWitness,
        requiresGuardian: seed.requiresGuardian,
        requiresInterpreter: seed.requiresInterpreter,
        requiresSeparateConsent: seed.requiresSeparateConsent,
        consentType: seed.consentType,
        specialty: seed.specialty,
        department: seed.department,
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        summaryAr: seed.summaryAr,
        summaryEn: seed.summaryEn,
        isSystemTemplate: true,
      },
      create: {
        tenantId,
        categoryId: category.id,
        templateCode: seed.templateCode,
        riskLevel: seed.riskLevel,
        requiresWitness: seed.requiresWitness,
        requiresGuardian: seed.requiresGuardian,
        requiresInterpreter: seed.requiresInterpreter,
        requiresSeparateConsent: seed.requiresSeparateConsent,
        consentType: seed.consentType,
        specialty: seed.specialty,
        department: seed.department,
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        summaryAr: seed.summaryAr,
        summaryEn: seed.summaryEn,
        status: ConsentTemplateStatus.ACTIVE,
        isSystemTemplate: true,
      },
    });

    const latestVersion = await prisma().consentTemplateVersion.findFirst({
      where: { tenantId, templateId: template.id },
      orderBy: { versionNumber: "desc" },
    });

    const arBody = buildSaudiTemplateBodyAr(seed);
    const enBody = buildSaudiTemplateBodyEn(seed);
    const legalHash = crypto.createHash("sha256").update(`${seed.templateCode}:${arBody}:${enBody}`).digest("hex");

    const hasActiveVersion = await prisma().consentTemplateVersion.findFirst({
      where: {
        tenantId,
        templateId: template.id,
        status: { in: [ConsentTemplateStatus.ACTIVE, ConsentTemplateStatus.APPROVED] },
        legalHash,
      },
      orderBy: { versionNumber: "desc" },
    });

    if (hasActiveVersion) {
      await prisma().consentTemplate.update({
        where: { id: template.id },
        data: {
          status: ConsentTemplateStatus.ACTIVE,
          currentVersionId: hasActiveVersion.id,
        },
      });
      continue;
    }

    const versionNumber = (latestVersion?.versionNumber || 0) + 1;
    const sections = buildSaudiTemplateSections(seed);

    const version = await prisma().consentTemplateVersion.create({
      data: {
        tenantId,
        templateId: template.id,
        versionLabel: `v${versionNumber}.0-saudi-2019`,
        versionNumber,
        status: ConsentTemplateStatus.ACTIVE,
        legalTextAr: arBody,
        legalTextEn: enBody,
        pdplTextAr: PDPL_AR,
        pdplTextEn: PDPL_EN,
        witnessDeclAr: sections.find((s) => s.sectionKey === "19_witness_clause")?.contentAr || INTERPRETER_ACK_AR,
        witnessDeclEn: sections.find((s) => s.sectionKey === "19_witness_clause")?.contentEn || INTERPRETER_ACK_EN,
        physicianCertAr: PHYSICIAN_CERT_AR,
        physicianCertEn: PHYSICIAN_CERT_EN,
        aiWarningAr: "AI-assisted draft pending physician validation.",
        aiWarningEn: "AI-assisted draft pending physician validation.",
        legalHash,
        isImmutable: true,
        createdByUserId: actorUserId || null,
        approvedByUserId: actorUserId || null,
        approvedAt: now,
        effectiveFrom: now,
        metadata: {
          governance: {
            legalApprovalStatus: "APPROVED",
            medicalApprovalStatus: "APPROVED",
            immutableFixedWording: true,
            moduleKey: "informed-consents",
            saudiMedicalConsentGuide: "MOH 2019",
          },
          templateProfile: {
            riskLevel: seed.riskLevel,
            requiresWitness: seed.requiresWitness,
            requiresGuardian: seed.requiresGuardian,
            requiresInterpreter: seed.requiresInterpreter,
            requiresSeparateConsent: seed.requiresSeparateConsent,
          },
        } as JsonInputValue,
      },
    });

    await prisma().consentTemplateSection.createMany({
      data: sections.map((section) => ({
        tenantId,
        templateVersionId: version.id,
        sectionKey: section.sectionKey,
        sectionKind: section.sectionKind,
        titleAr: section.titleAr,
        titleEn: section.titleEn,
        contentAr: section.contentAr,
        contentEn: section.contentEn,
        isRequired: section.isRequired,
        isEditableByPhysician: section.isEditableByPhysician,
        sortOrder: section.sortOrder,
      })),
    });

    await prisma().consentTemplate.update({
      where: { id: template.id },
      data: {
        status: ConsentTemplateStatus.ACTIVE,
        currentVersionId: version.id,
      },
    });

    await prisma().consentTemplateLocalization.upsert({
      where: {
        templateVersionId_language: {
          templateVersionId: version.id,
          language: "AR",
        },
      },
      update: {
        direction: "RTL",
        title: seed.titleAr,
        fullBody: arBody,
        sectionsJson: sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionKind: s.sectionKind,
          title: s.titleAr,
          content: s.contentAr,
          isRequired: s.isRequired,
        })) as JsonInputValue,
      },
      create: {
        tenantId,
        templateVersionId: version.id,
        language: "AR",
        direction: "RTL",
        title: seed.titleAr,
        fullBody: arBody,
        sectionsJson: sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionKind: s.sectionKind,
          title: s.titleAr,
          content: s.contentAr,
          isRequired: s.isRequired,
        })) as JsonInputValue,
      },
    });

    await prisma().consentTemplateLocalization.upsert({
      where: {
        templateVersionId_language: {
          templateVersionId: version.id,
          language: "EN",
        },
      },
      update: {
        direction: "LTR",
        title: seed.titleEn,
        fullBody: enBody,
        sectionsJson: sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionKind: s.sectionKind,
          title: s.titleEn,
          content: s.contentEn,
          isRequired: s.isRequired,
        })) as JsonInputValue,
      },
      create: {
        tenantId,
        templateVersionId: version.id,
        language: "EN",
        direction: "LTR",
        title: seed.titleEn,
        fullBody: enBody,
        sectionsJson: sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionKind: s.sectionKind,
          title: s.titleEn,
          content: s.contentEn,
          isRequired: s.isRequired,
        })) as JsonInputValue,
      },
    });
  }
}

export async function listRuntimeConsentTemplates(
  auth: AuthContext,
  filter: RuntimeTemplateFilter,
): Promise<RuntimeConsentTemplate[]> {
  const tenantId = requireTenantId(auth);
  const consentType = normalizeFilter(filter.consentType).toUpperCase();
  const specialty = normalizeFilter(filter.specialty).toUpperCase();
  const department = normalizeFilter(filter.department).toUpperCase();

  try {
    await ensureDefaultTemplates(tenantId, auth.sub);
  } catch (error) {
    if (!isSchemaQueryFailure(error)) {
      throw error;
    }

    const capability = await isConsentCatalogCapable(tenantId);

    if (!capability.capable) {
      throw error;
    }
  }

  const templates = await prisma().consentTemplate.findMany({
    where: {
      tenantId,
      currentVersionId: { not: null },
      ...(consentType ? { consentType } : {}),
      ...(department ? { OR: [{ department }, { department: null }] } : {}),
      ...(specialty ? { OR: [{ specialty }, { specialty: "GENERAL_MEDICINE" }] } : {}),
      status: { in: [ConsentTemplateStatus.ACTIVE, ConsentTemplateStatus.APPROVED] },
    },
    include: {
      versions: {
        where: {
          status: { in: [ConsentTemplateStatus.ACTIVE, ConsentTemplateStatus.APPROVED] },
        },
        orderBy: [{ versionNumber: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ isSystemTemplate: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const mapped = templates
    .map((template) => {
      const version = template.versions[0];
      if (!version) return null;

      return {
        id: template.id,
        templateVersionId: version.id,
        titleAr: template.titleAr,
        titleEn: template.titleEn,
        consentType: template.consentType,
        specialty: template.specialty,
        department: template.department,
        version: version.versionLabel,
        status: version.status,
        language: "bilingual" as const,
        summaryAr: template.summaryAr,
        summaryEn: template.summaryEn,
        previewAr: version.legalTextAr,
        previewEn: version.legalTextEn,
      };
    })
    .filter((item): item is RuntimeConsentTemplate => item !== null);

  return mapped;
}
