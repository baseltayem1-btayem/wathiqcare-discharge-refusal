import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import type { Prisma } from "@prisma/client";
import puppeteer from "puppeteer";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ConsentRiskClass } from "@/lib/server/prisma-enums";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { normalizeArabicForPatientFacingText } from "@/lib/server/arabic-mojibake-guard";
import { resolveConsentSignaturePresentation } from "@/lib/signature/signature-display";

const prisma = () => getPrisma();

const IMC_LOGO_URL = "https://www.imc.med.sa/images/logo.jpg";
const PRODUCTION_VERIFY_BASE_URL = "https://wathiqcare.online";

const MOJIBAKE_MARKER_REGEX = /[\u00d8\u00d9\u00db\u00c3\u00c2\u00e2]|\?{4,}|Ã¯Â¿Â½|ï¿½/;

const NOT_PROVIDED = { ar: "ØºÙŠØ± Ù…Ø¯Ø®Ù„", en: "Not provided" };
const NOT_APPLICABLE = { ar: "ØºÙŠØ± Ù…Ù†Ø·Ø¨Ù‚", en: "Not applicable" };

const FINAL_TITLE = {
  ar: "Ù†Ù…ÙˆØ°Ø¬ Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ø³ØªÙ†ÙŠØ±Ø© Ù†Ù‡Ø§Ø¦ÙŠ",
  en: "Final Informed Consent Form",
};

const FINAL_SIGNING_STATEMENT = {
  ar: "ØªÙ… Ø§Ù„ØªÙˆÙ‚ÙŠØ¹ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠÙ‹Ø§ Ø¹Ø¨Ø± Ù†Ø¸Ø§Ù… ÙˆØ§Ø«Ù‚ ÙƒÙŠØ±",
  en: "Electronically Signed via Wathiq Care System",
};

const PDPL_CONSENT_AR_FALLBACK =
  "Ø£ÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ø§Ø³ØªØ®Ø¯Ø§Ù… ÙˆÙ…Ø¹Ø§Ù„Ø¬Ø© Ù…Ø¹Ù„ÙˆÙ…Ø§ØªÙŠ Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ø´Ø®ØµÙŠØ© Ø¨Ø§Ù„Ù‚Ø¯Ø± Ø§Ù„Ù„Ø§Ø²Ù… Ù„Ø£ØºØ±Ø§Ø¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ ÙˆØ§Ù„Ø±Ø¹Ø§ÙŠØ© Ø§Ù„ØµØ­ÙŠØ© ÙˆØ§Ù„ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø·Ø¨ÙŠ ÙˆØ§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ø§Ù„Ø£Ù†Ø¸Ù…Ø© ÙˆØ§Ù„Ù„ÙˆØ§Ø¦Ø­ Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ù…Ø¹Ù…ÙˆÙ„ Ø¨Ù‡Ø§ØŒ ÙˆÙˆÙÙ‚Ù‹Ø§ Ù„Ù†Ø¸Ø§Ù… Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ© ÙˆØ§Ù„Ø£Ù†Ø¸Ù…Ø© Ø°Ø§Øª Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© ÙÙŠ Ø§Ù„Ù…Ù…Ù„ÙƒØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©.";

const PDPL_CONSENT_EN_FALLBACK =
  "I consent to the use and processing of my personal health information as required for treatment, healthcare delivery, medical documentation, and compliance with applicable healthcare laws and regulations.";

const PDPL_PURPOSES_AR_FALLBACK =
  "ØªÙ‚ØªØµØ± Ù…Ø¹Ø§Ù„Ø¬Ø© Ù…Ø¹Ù„ÙˆÙ…Ø§ØªÙŠ Ø§Ù„ØµØ­ÙŠØ© Ø¹Ù„Ù‰ Ù…Ø§ ÙŠÙ„Ø²Ù… Ù„Ø£ØºØ±Ø§Ø¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ ÙˆØ§Ù„ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø·Ø¨ÙŠ ÙˆØ§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ØµØ­ÙŠØ© Ø°Ø§Øª Ø§Ù„ØµÙ„Ø©.";

const PDPL_PURPOSES_EN_FALLBACK =
  "My health information may be processed only for treatment, medical documentation, and related healthcare operations.";

const PDPL_COMPLIANCE_AR_FALLBACK =
  "ØªØªÙ… Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØµØ­ÙŠØ© ÙˆÙÙ‚Ù‹Ø§ Ù„Ù†Ø¸Ø§Ù… Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ© ÙˆØ§Ù„Ù„ÙˆØ§Ø¦Ø­ Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ù…Ø¹Ù…ÙˆÙ„ Ø¨Ù‡Ø§ ÙÙŠ Ø§Ù„Ù…Ù…Ù„ÙƒØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©.";

const PDPL_COMPLIANCE_EN_FALLBACK =
  "The processing of health information is governed by the Personal Data Protection Law and applicable Saudi healthcare regulations.";

const NO_GUARANTEE_AR_FALLBACK =
  "Ø£ÙÙ‡Ù… Ø£Ù†Ù‡ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¶Ù…Ø§Ù† Ù†ØªÙŠØ¬Ø© Ù…Ø­Ø¯Ø¯Ø© Ù„Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø£Ùˆ Ø§Ù„Ø¹Ù„Ø§Ø¬.";

const NO_GUARANTEE_EN_FALLBACK =
  "I understand that no specific outcome can be guaranteed for the procedure or treatment.";

const PHYSICIAN_CERT_AR_FALLBACK =
  "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ø·Ø¨ÙŠØ¨: Ø£Ù‚Ø± Ø£Ù†Ø§ Ø§Ù„Ø·Ø¨ÙŠØ¨ Ø£Ùˆ Ø§Ù„Ù…Ù…Ø§Ø±Ø³ Ø§Ù„ØµØ­ÙŠ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø£Ø¯Ù†Ø§Ù‡ Ø¨Ø£Ù†Ù†ÙŠ Ù‚Ù…Øª Ø¨Ø´Ø±Ø­ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨ÙŠØ© Ù„Ù„Ù…Ø±ÙŠØ¶ ÙˆØ·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­ ÙˆØ§Ù„ÙÙˆØ§Ø¦Ø¯ ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø© ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆÙ…Ø®Ø§Ø·Ø± Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ Ù„Ù„Ù…Ø±ÙŠØ¶ Ø£Ùˆ Ù„Ù…Ù…Ø«Ù„Ù‡ Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠ Ø¨ØµÙˆØ±Ø© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©ØŒ ÙˆØ£Ø¬Ø¨Øª Ø¹Ù„Ù‰ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø·Ø±ÙˆØ­Ø© ÙˆÙÙ‚Ù‹Ø§ Ù„Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…Ù‡Ù†ÙŠØ© ÙˆØ§Ù„Ø·Ø¨ÙŠØ© Ø§Ù„Ù…ØªØ¹Ø§Ø±Ù Ø¹Ù„ÙŠÙ‡Ø§.";

const PHYSICIAN_CERT_EN_FALLBACK =
  "Physician Certification: I, the undersigned physician or healthcare practitioner, certify that I have explained to the patient or the patientâ€™s legal representative the medical condition, the nature of the proposed procedure, expected benefits, potential risks and complications, available treatment alternatives, and the risks of refusing treatment in a clear and understandable manner, and that I have answered all related questions in accordance with accepted medical and professional standards.";

const PHYSICIAN_CERT_CONDITION_AR =
  "Ø£Ù‚Ø± Ø¨Ø£Ù†Ù†ÙŠ Ø´Ø±Ø­Øª Ù„Ù„Ù…Ø±ÙŠØ¶ Ø£Ùˆ Ù„Ù…Ù…Ø«Ù„Ù‡ Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨ÙŠØ© ÙˆØ·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­ Ø¨ØµÙˆØ±Ø© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©.";

const PHYSICIAN_CERT_CONDITION_EN =
  "I certify that I explained the medical condition and the nature of the proposed procedure in a clear and understandable manner.";

const PHYSICIAN_CERT_RISKS_AR =
  "Ø£Ù‚Ø± Ø¨Ø£Ù†Ù†ÙŠ Ø´Ø±Ø­Øª Ø§Ù„ÙÙˆØ§Ø¦Ø¯ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø© ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø© ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆÙ…Ø®Ø§Ø·Ø± Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬.";

const PHYSICIAN_CERT_RISKS_EN =
  "I certify that I explained the expected benefits, potential risks and complications, treatment alternatives, and the risks of refusing treatment.";

const PHYSICIAN_CERT_QUESTIONS_AR =
  "Ø£Ù‚Ø± Ø¨Ø£Ù†Ù†ÙŠ Ø£Ø¬Ø¨Øª Ø¹Ù„Ù‰ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø·Ø±ÙˆØ­Ø© ÙˆÙÙ‚Ù‹Ø§ Ù„Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…Ù‡Ù†ÙŠØ© ÙˆØ§Ù„Ø·Ø¨ÙŠØ© Ø§Ù„Ù…ØªØ¹Ø§Ø±Ù Ø¹Ù„ÙŠÙ‡Ø§.";

const PHYSICIAN_CERT_QUESTIONS_EN =
  "I certify that I answered all related questions in accordance with accepted medical and professional standards.";

const SYSTEM_VALIDITY_STATEMENT_AR =
  "Ø³Ø¬Ù„ Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ø³ØªÙ†ÙŠØ±Ø© Ù…ÙÙ†Ø´Ø£ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠÙ‹Ø§ Ù…Ù† Ø§Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ø·Ø¨ÙŠ Ø§Ù„Ø¯ÙˆÙ„ÙŠ Ø¹Ø¨Ø± Ù†Ø¸Ø§Ù… ÙˆØ§Ø«Ù‚ ÙƒÙŠØ± ÙˆÙŠØªÙ…ØªØ¹ Ø¨Ø­Ø¬ÙŠØ© Ù†Ø¸Ø§Ù…ÙŠØ©.";

const SYSTEM_VALIDITY_STATEMENT_EN =
  "International Medical Center electronically generated consent record via Wathiq Care System with full legal validity.";

const FINANCIAL_ACKNOWLEDGMENT_ROWS = [
  {
    labelAr: "Ø§Ù„Ø®Ø·Ø© Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ§Ù„ØªÙƒØ§Ù„ÙŠÙ Ø§Ù„ØªÙ‚Ø¯ÙŠØ±ÙŠØ©",
    labelEn: "Treatment plan and estimated costs",
    valueAr: "Ø£Ù‚Ø± Ø¨Ø£Ù†Ù†ÙŠ Ù‚Ø¯ Ø§Ø·Ù„Ø¹Øª Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø·Ø© Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ§Ù„ØªÙƒØ§Ù„ÙŠÙ Ø§Ù„ØªÙ‚Ø¯ÙŠØ±ÙŠØ© Ù„Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø·Ø¨ÙŠØ© ÙˆØ£ÙˆØ§ÙÙ‚ Ø¹Ù„ÙŠÙ‡Ø§.",
    valueEn:
      "I acknowledge that I have been informed of the treatment plan and estimated costs of medical services, and I accept them.",
  },
  {
    labelAr: "Ø§Ù„ØªÙƒØ§Ù„ÙŠÙ Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØ© ØºÙŠØ± Ø§Ù„Ù…ØºØ·Ø§Ø©",
    labelEn: "Additional uncovered costs",
    valueAr:
      "Ø£Ù‚Ø± ÙˆØ£Ù„ØªØ²Ù… Ø£Ù†Ø§ Ø£Ùˆ ÙˆÙ„ÙŠ Ø£Ù…Ø±ÙŠ Ø§Ù„Ø°ÙŠ ÙˆÙ‚Ø¹ Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø¥Ù‚Ø±Ø§Ø± Ø¨Ø¯ÙØ¹ Ø£ÙŠ ØªÙƒØ§Ù„ÙŠÙ Ø¥Ø¶Ø§ÙÙŠØ© Ù„Ø§ ÙŠØªÙ… ØªØºØ·ÙŠØªÙ‡Ø§ Ù…Ù† Ù…ØªØ¹Ù‡Ø¯ÙŠ Ø§Ù„Ø¹Ù„Ø§Ø¬ Ø£Ùˆ Ø§Ù„ØªØ£Ù…ÙŠÙ† Ø£Ùˆ Ø£Ù‡Ù„ÙŠØ© Ø§Ù„Ø¹Ù„Ø§Ø¬.",
    valueEn:
      "I acknowledge and commit that I, or my legal guardian who signed this consent, will pay any additional costs not covered by the insurer, treatment sponsor, or treatment eligibility.",
  },
  {
    labelAr: "ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø±Ø³ÙˆÙ… ØºÙŠØ± Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø© Ø¥Ù„Ù‰ ÙØ§ØªÙˆØ±Ø© Ù†Ù‚Ø¯ÙŠØ©",
    labelEn: "Conversion of unpaid charges",
    valueAr:
      "Ø£Ù‚Ø± Ø¨Ø­Ù‚ Ø§Ù„Ù…Ù†Ø´Ø£Ø© Ø§Ù„ØµØ­ÙŠØ© ÙÙŠ ØªØ­ÙˆÙŠÙ„ Ø£ÙŠ ØªÙƒØ§Ù„ÙŠÙ ØºÙŠØ± Ù…ØºØ·Ø§Ø© Ø£Ùˆ ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹Ø© Ø¥Ù„Ù‰ Ù†Ù‚Ø¯ÙŠØ© Ø£Ùˆ ÙØ§ØªÙˆØ±Ø© Ù…Ø³ØªØ­Ù‚Ø© Ø§Ù„Ø¯ÙØ¹.",
    valueEn:
      "I acknowledge the right of the healthcare facility to convert any uncovered or unpaid costs into cash payment and issue an invoice for such amounts.",
  },
  {
    labelAr: "Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ø¥Ù„Ù‰ Ù…Ù†Ø´Ø£Ø© ØµØ­ÙŠØ© Ø£Ø®Ø±Ù‰",
    labelEn: "Transfer to another healthcare facility",
    valueAr:
      "Ø£Ù‚Ø± Ø¨Ø­Ù‚ Ø§Ù„Ù…Ù†Ø´Ø£Ø© Ø§Ù„ØµØ­ÙŠØ© Ø¯ÙˆÙ† Ø§Ø¹ØªØ±Ø§Ø¶ Ù…Ù†ÙŠ ÙÙŠ ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ù…Ø±ÙŠØ¶ Ø¥Ù„Ù‰ Ù…Ù†Ø´Ø£Ø© ØµØ­ÙŠØ© Ø£Ø®Ø±Ù‰ Ù„Ø§Ø³ØªÙƒÙ…Ø§Ù„ Ø¹Ù„Ø§Ø¬Ù‡ Ø¥Ø°Ø§ Ø§Ù‚ØªØ¶Øª Ù…ØµÙ„Ø­ØªÙ‡ Ø§Ù„Ø·Ø¨ÙŠØ© Ø°Ù„Ùƒ.",
    valueEn:
      "I acknowledge the right of the healthcare facility, without objection from me, to transfer me to another healthcare facility to continue or complete my treatment if medically necessary.",
  },
] as const;

type SignaturePresentation = ReturnType<typeof resolveConsentSignaturePresentation>;

type FinalConsentPdfRow = {
  sectionKey: string;
  sectionTitleAr: string;
  sectionTitleEn: string;
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
};

type FinalConsentPdfPayload = {
  header: Record<string, string | null>;
  patient: Record<string, string | null>;
  encounter: Record<string, string | null>;
  consent: Record<string, string | null>;
  procedure: Record<string, string | null>;
  anesthesia: Record<string, string | null>;
  disclosures: Record<string, string | null>;
  pdpl: Record<string, string | null>;
  financialAcknowledgment: Record<string, string | null>;
  signatures: Record<string, string | null>;
  evidence: Record<string, string | null>;
  bilingualRows: FinalConsentPdfRow[];
  status: string;
  consentDocumentId: string;
  immutablePdfHash: string | null;
  patientSignature: SignaturePresentation | null;
  physicianSignature: SignaturePresentation | null;
  guardianSignature: SignaturePresentation | null;
  interpreterSignature: SignaturePresentation | null;
  witnessSignature: SignaturePresentation | null;
  qrPayload: string;
  qrVerificationUrl: string;
  logoSrc: string;
};

type RenderArgs = {
  documentId: string;
  tenantId: string;
  request: NextRequest;
  lang?: "ar" | "en" | "bilingual";
  copyType: "PATIENT_COPY" | "MEDICAL_RECORD_COPY" | "LEGAL_ARCHIVE_COPY";
  disposition?: "inline" | "attachment";
};

type FinalConsentDocument = Prisma.PromiseReturnType<typeof getFinalConsentPdfDocumentOrThrow>;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readNestedValue(source: unknown, path: string[]): unknown {
  let current: unknown = source;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function firstString(source: unknown, paths: string[][]): string | null {
  for (const path of paths) {
    const value = readNestedValue(source, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function firstBoolean(source: unknown, paths: string[][]): boolean | null {
  for (const path of paths) {
    const value = readNestedValue(source, path);
    if (typeof value === "boolean") return value;
  }

  return null;
}

function toMultilineList(values: Array<string | null | undefined>): string | null {
  const cleaned = values.map((value) => normalizeText(value)).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned.join("\n");
}

function repairGenericMojibake(input: string): string {
  if (!input) return input;

  const commonRepair = (text: string) =>
    text
      .replace(/Ã¢â‚¬â„¢/g, "â€™")
      .replace(/Ã¢â‚¬Ëœ/g, "â€˜")
      .replace(/Ã¢â‚¬Å“/g, "â€œ")
      .replace(/Ã¢â‚¬\u009d/g, "â€")
      .replace(/Ã¢â‚¬Â/g, "â€")
      .replace(/Ã¢â‚¬â€œ/g, "â€“")
      .replace(/Ã¢â‚¬â€/g, "â€”")
      .replace(/Ã¢â‚¬Â¦/g, "â€¦")
      .replace(/Ã‚ /g, " ")
      .replace(/Ã‚/g, "");

  let value = commonRepair(input);

  for (let i = 0; i < 3; i += 1) {
    if (!MOJIBAKE_MARKER_REGEX.test(value)) break;

    try {
      const decoded = Buffer.from(value, "latin1").toString("utf8");
      const cleaned = commonRepair(decoded);

      if (!cleaned || cleaned === value || cleaned.includes("ï¿½")) break;

      value = cleaned;
    } catch {
      break;
    }
  }

  return value;
}

function normalizeText(value: string | null | undefined): string {
  return repairGenericMojibake(value || "").trim();
}

function normalizeArabicText(value: string | null | undefined): string {
  const normalized = normalizeText(value);
  const guarded = normalizeArabicForPatientFacingText(normalized);
  return repairGenericMojibake(guarded).trim();
}

function normalizeArabicLegalText(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeArabicText(value);
  return normalized || fallback;
}

function normalizeLegalText(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeText(value);
  return normalized || fallback;
}

function normalizeArabicRowValue(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeArabicLegalText(value, fallback);
  return /[A-Za-z]{3,}/.test(normalized) && !/[\u0600-\u06FF]/.test(normalized) ? fallback : normalized;
}

function normalizeEnglishRowValue(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeLegalText(value, fallback);
  return /[\u0600-\u06FF]/.test(normalized) ? fallback : normalized;
}

function hasText(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function isPlaceholder(value: string | null | undefined): boolean {
  const normalized = normalizeText(value);
  if (!normalized) return true;
  return /^\[.*\]$/.test(normalized) || /^-\s*\[.*\]$/.test(normalized);
}

function formatDateTime(value: string | Date | null | undefined, locale: "ar" | "en"): string | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return typeof value === "string" ? value : null;

  return parsed.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDobAge(dob: string | null | undefined, locale: "ar" | "en"): string | null {
  const normalizedDob = normalizeText(dob);
  if (!normalizedDob) return null;

  const parsed = new Date(normalizedDob);
  if (Number.isNaN(parsed.getTime())) return normalizedDob;

  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDelta = now.getMonth() - parsed.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }

  const dateLabel = parsed.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return locale === "ar"
    ? `${dateLabel} (${Math.max(age, 0)} Ø³Ù†Ø©)`
    : `${dateLabel} (${Math.max(age, 0)} years)`;
}

function formatStatus(status: string): { ar: string; en: string } {
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "FINALIZED") return { ar: "Ù…ÙƒØªÙ…Ù„ ÙˆÙ…Ø¤Ø±Ø´Ù Ù†Ù‡Ø§Ø¦ÙŠÙ‹Ø§", en: "Completed and finalized" };
  if (normalized === "SIGNED") return { ar: "Ù…ÙˆÙ‚Ù‘Ø¹", en: "Signed" };

  return { ar: "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©", en: "In progress" };
}

function normalizeValuePair(args: {
  ar?: string | null;
  en?: string | null;
  applicable?: boolean;
}): { ar: string; en: string } {
  const applicable = args.applicable ?? true;

  if (!applicable) return { ...NOT_APPLICABLE };

  const ar = normalizeArabicText(args.ar);
  const en = normalizeText(args.en);

  return {
    ar: ar || NOT_PROVIDED.ar,
    en: en || NOT_PROVIDED.en,
  };
}

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMultiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function signatureSummary(signature: SignaturePresentation | null, locale: "ar" | "en"): string | null {
  if (!signature) return null;

  const parts = [signature.signerName];

  if (signature.signedAt) {
    parts.push(
      locale === "ar"
        ? `ØªÙ… Ø§Ù„ØªÙˆÙ‚ÙŠØ¹ ${formatDateTime(signature.signedAt, "ar")}`
        : `Signed ${formatDateTime(signature.signedAt, "en")}`,
    );
  }

  if (signature.evidenceId) {
    parts.push(locale === "ar" ? `Ù…Ø±Ø¬Ø¹ Ø§Ù„Ø¯Ù„ÙŠÙ„: ${signature.evidenceId}` : `Evidence ID: ${signature.evidenceId}`);
  }

  return parts.filter(Boolean).join("\n");
}

function riskListByClass(document: FinalConsentDocument, riskClass: ConsentRiskClass): { ar: string | null; en: string | null } {
  const risks = document.documentRisks
    .filter((risk) => risk.riskClass === riskClass)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    ar: toMultilineList(risks.map((risk) => `- ${normalizeArabicText(risk.wordingAr)}`)),
    en: toMultilineList(risks.map((risk) => `- ${normalizeText(risk.wordingEn)}`)),
  };
}

function getSection(document: FinalConsentDocument, keys: string[]): { contentAr: string | null; contentEn: string | null } {
  const match = document.sections.find((section) => keys.includes(section.sectionKey));

  if (!match) return { contentAr: null, contentEn: null };

  return {
    contentAr: isPlaceholder(match.contentAr) ? null : normalizeArabicText(match.contentAr),
    contentEn: isPlaceholder(match.contentEn) ? null : normalizeText(match.contentEn),
  };
}

function getSectionByTitle(document: FinalConsentDocument, titleMatch: RegExp): { contentAr: string | null; contentEn: string | null } {
  const match = document.sections.find((section) => titleMatch.test(section.titleEn) || titleMatch.test(section.sectionKey));

  if (!match) return { contentAr: null, contentEn: null };

  return {
    contentAr: isPlaceholder(match.contentAr) ? null : normalizeArabicText(match.contentAr),
    contentEn: isPlaceholder(match.contentEn) ? null : normalizeText(match.contentEn),
  };
}
function computeFixedClauseChecksum(document: FinalConsentDocument): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        legalTextAr: document.legalTextAr,
        legalTextEn: document.legalTextEn,
        pdplTextAr: document.pdplTextAr,
        pdplTextEn: document.pdplTextEn,
        witnessDeclAr: document.witnessDeclAr,
        witnessDeclEn: document.witnessDeclEn,
        physicianCertAr: document.physicianCertAr,
        physicianCertEn: document.physicianCertEn,
      }),
    )
    .digest("hex");
}

async function resolveLogoSource(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(IMC_LOGO_URL, {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);

    if (!response.ok) return IMC_LOGO_URL;

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer.length) return IMC_LOGO_URL;

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return IMC_LOGO_URL;
  }
}

async function ensurePdfFontsLoaded(): Promise<void> {
  try {
    await Promise.all([
      chromium.font(
        "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Regular.ttf",
      ),
      chromium.font(
        "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Bold.ttf",
      ),
      chromium.font(
        "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf",
      ),
      chromium.font(
        "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf",
      ),
    ]);
  } catch (error) {
    console.warn("PDF Arabic font loading skipped", error);
  }
}

async function launchBrowser(): Promise<Browser> {
  await ensurePdfFontsLoaded();

  const defaultArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--font-render-hinting=none",
    "--disable-dev-shm-usage",
  ];

  const defaultOptions: LaunchOptions = {
    headless: true,
    args: defaultArgs,
  };

  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();

  if (configuredPath && existsSync(configuredPath)) {
    try {
      return await puppeteer.launch({ ...defaultOptions, executablePath: configuredPath });
    } catch {
      // Fall back to bundled runtime.
    }
  }

  try {
    return await puppeteer.launch(defaultOptions);
  } catch {
    const executablePath = await chromium.executablePath();

    return await puppeteer.launch({
      ...defaultOptions,
      executablePath,
      args: [...chromium.args, ...defaultArgs],
    });
  }
}

async function getFinalConsentPdfDocumentOrThrow(args: { documentId: string; tenantId: string }) {
  const document = await prisma().consentDocument.findFirst({
    where: { id: args.documentId, tenantId: args.tenantId },
    include: {
      tenant: { select: { name: true } },
      template: {
        select: {
          titleAr: true,
          titleEn: true,
          consentType: true,
          specialty: true,
          requiresGuardian: true,
          requiresInterpreter: true,
        },
      },
      templateVersion: {
        select: {
          id: true,
          versionLabel: true,
          approvedAt: true,
        },
      },
      case: { select: { caseNumber: true } },
      emrMappings: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          physicianIdentifier: true,
          encounterIdentifier: true,
          diagnosisCode: true,
          procedureCode: true,
          metadata: true,
        },
      },
      signatures: { orderBy: [{ signedAt: "asc" }, { createdAt: "asc" }] },
      sections: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      documentRisks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      auditEvents: { orderBy: { createdAt: "asc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
      evidencePackages: { orderBy: { generatedAt: "desc" } },
    },
  });

  if (!document) {
    throw new ApiError(404, "Consent document not found");
  }

  return document;
}

export function validateFinalConsentPdfPayload(payload: FinalConsentPdfPayload): void {
  const blockers: string[] = [];

  if (!hasText(payload.consentDocumentId)) {
    blockers.push("Consent document ID is missing.");
  }

  if (payload.bilingualRows.length === 0) {
    blockers.push("No bilingual rows were generated.");
  }

  if (!hasText(payload.patient.patientName) || payload.patient.patientName === NOT_PROVIDED.en) {
    blockers.push("Patient information is incomplete.");
  }

  if (!hasText(payload.header.documentStatus)) {
    blockers.push("Signature status is missing.");
  }

  if (!["SIGNED", "FINALIZED"].includes(payload.status.toUpperCase())) {
    blockers.push("Signature status must be signed or finalized before PDF generation.");
  }

  if (!hasText(payload.pdpl.patientHealthInformationProcessingAcknowledgment)) {
    blockers.push("PDPL acknowledgment is missing.");
  }

  if (!hasText(payload.disclosures.noGuaranteeOfOutcome)) {
    blockers.push("Required legal acknowledgment is missing.");
  }

  if (!hasText(payload.consent.diagnosis)) {
    blockers.push("Diagnosis row is missing.");
  }

  if (!payload.bilingualRows.some((row) => row.sectionKey === "financial_acknowledgment")) {
    blockers.push("Financial acknowledgment rows are missing.");
  }

  if (!payload.bilingualRows.some((row) => row.sectionKey === "signature_and_evidence")) {
    blockers.push("Signature and evidence rows are missing.");
  }

  const corruptedEnglishFields = payload.bilingualRows
    .filter((row) => MOJIBAKE_MARKER_REGEX.test(row.valueEn) || MOJIBAKE_MARKER_REGEX.test(row.labelEn))
    .map((row) => `${row.sectionKey}.${row.labelEn}`);

  if (corruptedEnglishFields.length > 0) {
    blockers.push(`Corrupted English text detected in: ${corruptedEnglishFields.join(", ")}`);
  }

  if (blockers.length > 0) {
    throw new ApiError(409, `Final consent PDF validation failed: ${blockers.join(" ")}`);
  }
}

export async function buildFinalConsentPdfPayload(args: {
  documentId: string;
  tenantId: string;
  requestOrigin: string;
}): Promise<FinalConsentPdfPayload> {
  const document = await getFinalConsentPdfDocumentOrThrow({
    documentId: args.documentId,
    tenantId: args.tenantId,
  });

  const metadata = asRecord(document.metadata);
  const executionContext = asRecord(metadata.executionContext);
  const wordingSnapshot = asRecord(metadata.finalizedWordingSnapshot);
  const fixedClauses = asRecord(wordingSnapshot.fixedClauses);
  const evidenceVault = asRecord(metadata.evidenceVault);
  const signatureSecurity = asRecord(metadata.signatureSecurity);
  const signatureOrchestration = asRecord(metadata.signatureOrchestration);
  const emrMapping = document.emrMappings[0] || null;
  const emrMetadata = asRecord(emrMapping?.metadata);
  const emrPayload: Record<string, unknown> = {};
  const demographics = asRecord(metadata.demographics);
  const patientIdentity = asRecord(metadata.patientIdentity);
  const encounter = asRecord(metadata.encounter);
  const procedureMetadata = asRecord(metadata.procedure);
  const anesthesiaMetadata = asRecord(metadata.anesthesia);
  const disclosuresMetadata = asRecord(metadata.disclosures);
  const facilityName = normalizeText(document.tenant?.name || "International Medical Center");

  void executionContext;
  void args.requestOrigin;

  const visitDate = firstString(
    { metadata, encounter, emrMetadata, emrPayload },
    [
      ["encounter", "visitDate"],
      ["metadata", "visitDate"],
      ["emrPayload", "visitDate"],
      ["emrMetadata", "visitDate"],
    ],
  );

  const nationalId = firstString(
    { metadata, patientIdentity, demographics, emrPayload },
    [
      ["patientIdentity", "nationalId"],
      ["patientIdentity", "iqama"],
      ["demographics", "nationalId"],
      ["metadata", "nationalId"],
      ["metadata", "iqama"],
      ["emrPayload", "nationalId"],
    ],
  );

  const sectionMedicalCondition = getSection(document, ["dynamic_medical_condition", "05_diagnosis_indication"]);
  const sectionProcedure = getSection(document, ["dynamic_proposed_procedure", "04_description"]);
  const sectionSite = getSection(document, ["dynamic_procedure_site_laterality"]);
  const sectionBenefits = getSection(document, ["dynamic_expected_benefits", "06_expected_benefits"]);
  const sectionComplications = getSection(document, ["dynamic_complications", "08_possible_complications"]);
  const sectionAlternatives = getSection(document, ["dynamic_treatment_alternatives", "10_alternatives"]);
  const sectionRefusal = getSection(document, ["dynamic_refusal_risks", "refusal_risks"]);
  const sectionPostProcedure = getSection(document, ["dynamic_post_procedure_instructions"]);
  const sectionPhysicianNotes = getSection(document, ["dynamic_physician_notes"]);
  const sectionSpecialPrecautions = getSection(document, ["dynamic_special_precautions"]);
  const sectionNoGuarantee = getSection(document, ["fixed_no_guarantee"]);
  const sectionInterpreter = getSection(document, ["interpreter_acknowledgment"]);
  const anesthesiaSection = getSectionByTitle(document, /anesthesia/i);

  const commonRisks = riskListByClass(document, ConsentRiskClass.COMMON);
  const uncommonRisks = riskListByClass(document, ConsentRiskClass.LESS_COMMON);
  const seriousRisks = riskListByClass(document, ConsentRiskClass.SERIOUS);
  const lifeThreateningRisks = riskListByClass(document, ConsentRiskClass.LIFE_THREATENING);

  const patientSignatureRaw = document.signatures.find((item) => item.role === "PATIENT") || null;
  const guardianSignatureRaw = document.signatures.find((item) => item.role === "GUARDIAN") || null;
  const physicianSignatureRaw = document.signatures.find((item) => item.role === "PHYSICIAN") || null;
  const interpreterSignatureRaw = document.signatures.find((item) => item.role === "INTERPRETER") || null;
  const witnessSignatureRaw = document.signatures.find((item) => item.role === "WITNESS") || null;

  const toPresentation = (signature: typeof patientSignatureRaw) =>
    signature
      ? resolveConsentSignaturePresentation({
          metadata: signature.metadata || null,
          signatureMethod: signature.signatureMethod || null,
          signedAt: signature.signedAt || null,
          signerName: signature.signerName || "",
        })
      : null;

  const patientSignature = toPresentation(patientSignatureRaw);
  const guardianSignature = toPresentation(guardianSignatureRaw);
  const physicianSignature = toPresentation(physicianSignatureRaw);
  const interpreterSignature = toPresentation(interpreterSignatureRaw);
  const witnessSignature = toPresentation(witnessSignatureRaw);

  const workflowStatus = asRecord(asRecord(metadata.secureSigningWorkflow).status);

  const workflowSigned =
    workflowStatus.signed === true ||
    signatureOrchestration.signed === true ||
    signatureOrchestration.status === "SIGNED" ||
    signatureOrchestration.status === "signed";

  const hasPatientOrGuardianSignature = Boolean(patientSignatureRaw || guardianSignatureRaw);

  const effectiveStatus =
    document.status === "FINALIZED"
      ? "FINALIZED"
      : document.status === "SIGNED" || workflowSigned || hasPatientOrGuardianSignature
        ? "SIGNED"
        : document.status;

  const qrVerificationUrl = `${PRODUCTION_VERIFY_BASE_URL}/verify/consent/${document.id}`;

  const effectiveHash = normalizeText(
    document.auditChecksum || document.immutablePdfHash || computeFixedClauseChecksum(document),
  );

  const qrPayload =
    document.qrPayload ||
    [
      `CONSENT:${document.consentReference}`,
      `DOC:${document.id}`,
      `STATUS:${effectiveStatus}`,
      `HASH:${effectiveHash}`,
      `VERIFY:${qrVerificationUrl}`,
    ].join("|");

  const rows: FinalConsentPdfRow[] = [];

  const addSectionRows = (
    sectionKey: string,
    sectionTitleAr: string,
    sectionTitleEn: string,
    items: Array<{
      labelAr: string;
      labelEn: string;
      valueAr?: string | null;
      valueEn?: string | null;
      applicable?: boolean;
    }>,
  ) => {
    for (const item of items) {
      const valuePair = normalizeValuePair({
        ar: item.valueAr,
        en: item.valueEn,
        applicable: item.applicable,
      });

      rows.push({
        sectionKey,
        sectionTitleAr: normalizeArabicText(sectionTitleAr),
        sectionTitleEn,
        labelAr: normalizeArabicText(item.labelAr),
        labelEn: item.labelEn,
        valueAr: valuePair.ar,
        valueEn: valuePair.en,
      });
    }
  };

  const statusLabel = formatStatus(effectiveStatus);

  addSectionRows("patient_information", "Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø±ÙŠØ¶", "Patient Information", [
    { labelAr: "Ø§Ø³Ù… Ø§Ù„Ù…Ø±ÙŠØ¶", labelEn: "Patient Name", valueAr: document.patientName, valueEn: document.patientName },
    { labelAr: "Ø±Ù‚Ù… Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø·Ø¨ÙŠ", labelEn: "MRN / Medical Record Number", valueAr: document.mrn, valueEn: document.mrn },
    {
      labelAr: "Ø±Ù‚Ù… Ø§Ù„Ø²ÙŠØ§Ø±Ø©",
      labelEn: "Encounter / Visit Number",
      valueAr: emrMapping?.encounterIdentifier || firstString(encounter, [["identifier"]]),
      valueEn: emrMapping?.encounterIdentifier || firstString(encounter, [["identifier"]]),
    },
    {
      labelAr: "ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯ / Ø§Ù„Ø¹Ù…Ø±",
      labelEn: "Date of Birth / Age",
      valueAr: formatDobAge(document.dob, "ar"),
      valueEn: formatDobAge(document.dob, "en"),
    },
    { labelAr: "Ø§Ù„Ø¬Ù†Ø³", labelEn: "Gender", valueAr: document.gender, valueEn: document.gender },
    { labelAr: "Ø§Ù„Ù‡ÙˆÙŠØ© Ø§Ù„ÙˆØ·Ù†ÙŠØ© / Ø§Ù„Ø¥Ù‚Ø§Ù…Ø©", labelEn: "National ID / Iqama", valueAr: nationalId, valueEn: nationalId },
    {
      labelAr: "Ø§Ù„Ù‚Ø³Ù… / Ø§Ù„ØªØ®ØµØµ",
      labelEn: "Department / Specialty",
      valueAr: document.department || document.physicianSpecialty,
      valueEn: document.department || document.physicianSpecialty,
    },
    {
      labelAr: "Ø§Ù„Ø·Ø¨ÙŠØ¨ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬",
      labelEn: "Treating Physician",
      valueAr: document.physicianName,
      valueEn: document.physicianName,
    },
    {
      labelAr: "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø²ÙŠØ§Ø±Ø©",
      labelEn: "Visit Date",
      valueAr: formatDateTime(visitDate, "ar"),
      valueEn: formatDateTime(visitDate, "en"),
    },
  ]);
    addSectionRows("consent_information", "Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø·Ø¨ÙŠ", "Consent / Procedure Information", [
    { labelAr: "Ø§Ù„ØªØ´Ø®ÙŠØµ", labelEn: "Diagnosis", valueAr: document.diagnosis, valueEn: document.diagnosis },
    {
      labelAr: "Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨ÙŠØ©",
      labelEn: "Medical Condition",
      valueAr: sectionMedicalCondition.contentAr || document.admissionDetails,
      valueEn: sectionMedicalCondition.contentEn || document.admissionDetails,
    },
    {
      labelAr: "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­",
      labelEn: "Proposed Procedure",
      valueAr: sectionProcedure.contentAr || document.plannedProcedure,
      valueEn: sectionProcedure.contentEn || document.plannedProcedure,
    },
    {
      labelAr: "Ù…ÙˆØ¶Ø¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ / Ø§Ù„Ø¬Ù‡Ø©",
      labelEn: "Procedure Site / Laterality",
      valueAr: sectionSite.contentAr || firstString(procedureMetadata, [["procedureSite"], ["laterality"]]),
      valueEn: sectionSite.contentEn || firstString(procedureMetadata, [["procedureSite"], ["laterality"]]),
    },
    {
      labelAr: "Ø§Ù„ÙÙˆØ§Ø¦Ø¯ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø©",
      labelEn: "Expected Benefits",
      valueAr: sectionBenefits.contentAr || document.expectedOutcomesAr,
      valueEn: sectionBenefits.contentEn || document.expectedOutcomesEn,
    },
    {
      labelAr: "Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©",
      labelEn: "Common Risks",
      valueAr: commonRisks.ar || getSection(document, ["dynamic_common_risks"]).contentAr,
      valueEn: commonRisks.en || getSection(document, ["dynamic_common_risks"]).contentEn,
    },
    {
      labelAr: "Ø§Ù„Ù…Ø®Ø§Ø·Ø± ØºÙŠØ± Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©",
      labelEn: "Uncommon Risks",
      valueAr: uncommonRisks.ar || getSection(document, ["dynamic_uncommon_risks"]).contentAr,
      valueEn: uncommonRisks.en || getSection(document, ["dynamic_uncommon_risks"]).contentEn,
    },
    {
      labelAr: "Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø¬Ø³ÙŠÙ…Ø© Ø£Ùˆ Ø§Ù„Ù…Ù‡Ø¯Ø¯Ø© Ù„Ù„Ø­ÙŠØ§Ø©",
      labelEn: "Serious / Life-threatening Risks",
      valueAr:
        toMultilineList([seriousRisks.ar, lifeThreateningRisks.ar]) ||
        getSection(document, ["dynamic_serious_risks", "09_serious_complications"]).contentAr,
      valueEn:
        toMultilineList([seriousRisks.en, lifeThreateningRisks.en]) ||
        getSection(document, ["dynamic_serious_risks", "09_serious_complications"]).contentEn,
    },
    {
      labelAr: "Ø§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø©",
      labelEn: "Potential Complications",
      valueAr: sectionComplications.contentAr || document.sideEffectsAr,
      valueEn: sectionComplications.contentEn || document.sideEffectsEn,
    },
    {
      labelAr: "Ø§Ù„Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ©",
      labelEn: "Treatment Alternatives",
      valueAr: sectionAlternatives.contentAr || document.alternativesAr,
      valueEn: sectionAlternatives.contentEn || document.alternativesEn,
    },
    {
      labelAr: "Ù…Ø®Ø§Ø·Ø± Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ Ø£Ùˆ ØªØ£Ø¬ÙŠÙ„Ù‡",
      labelEn: "Risks of Refusal / Delay",
      valueAr: sectionRefusal.contentAr || document.refusalRisksAr,
      valueEn: sectionRefusal.contentEn || document.refusalRisksEn,
    },
    {
      labelAr: "ØªØ¹Ù„ÙŠÙ…Ø§Øª Ù…Ø§ Ø¨Ø¹Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡",
      labelEn: "Post-procedure Instructions",
      valueAr: sectionPostProcedure.contentAr || firstString(procedureMetadata, [["postProcedureAr"]]),
      valueEn: sectionPostProcedure.contentEn || firstString(procedureMetadata, [["postProcedureEn"]]),
    },
    {
      labelAr: "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø·Ø¨ÙŠØ¨",
      labelEn: "Physician Notes",
      valueAr: sectionPhysicianNotes.contentAr || document.physicianNotesAr,
      valueEn: sectionPhysicianNotes.contentEn || document.physicianNotesEn,
    },
    {
      labelAr: "Ø§Ø­ØªÙŠØ§Ø·Ø§Øª Ø®Ø§ØµØ©",
      labelEn: "Special Precautions",
      valueAr: sectionSpecialPrecautions.contentAr || firstString(procedureMetadata, [["specialPrecautionsAr"]]),
      valueEn: sectionSpecialPrecautions.contentEn || firstString(procedureMetadata, [["specialPrecautionsEn"]]),
    },
  ]);

  const anesthesiaApplicable = Boolean(
    firstBoolean(
      { anesthesiaMetadata, signatureSecurity },
      [
        ["anesthesiaMetadata", "applies"],
        ["signatureSecurity", "anesthesiaRequired"],
      ],
    ) ??
      hasText(anesthesiaSection.contentEn) ??
      hasText(anesthesiaSection.contentAr),
  );

  addSectionRows("anesthesia_information", "Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªØ®Ø¯ÙŠØ±", "Anesthesia Information", [
    {
      labelAr: "Ù‡Ù„ Ø§Ù„ØªØ®Ø¯ÙŠØ± Ù…Ù†Ø·Ø¨Ù‚ØŸ",
      labelEn: "Does Anesthesia Apply?",
      valueAr: anesthesiaApplicable ? "Ù†Ø¹Ù…" : NOT_APPLICABLE.ar,
      valueEn: anesthesiaApplicable ? "Yes" : NOT_APPLICABLE.en,
      applicable: true,
    },
    {
      labelAr: "Ù†ÙˆØ¹ Ø§Ù„ØªØ®Ø¯ÙŠØ±",
      labelEn: "Type of Anesthesia",
      valueAr: firstString(anesthesiaMetadata, [["typeAr"], ["type"]]),
      valueEn: firstString(anesthesiaMetadata, [["typeEn"], ["type"]]),
      applicable: anesthesiaApplicable,
    },
    {
      labelAr: "Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„ØªØ®Ø¯ÙŠØ±",
      labelEn: "Anesthesia Options",
      valueAr: firstString(anesthesiaMetadata, [["optionsAr"]]),
      valueEn: firstString(anesthesiaMetadata, [["optionsEn"]]),
      applicable: anesthesiaApplicable,
    },
    {
      labelAr: "Ù…Ø®Ø§Ø·Ø± Ø§Ù„ØªØ®Ø¯ÙŠØ±",
      labelEn: "Anesthesia Risks",
      valueAr: firstString(anesthesiaMetadata, [["risksAr"]]) || anesthesiaSection.contentAr,
      valueEn: firstString(anesthesiaMetadata, [["risksEn"]]) || anesthesiaSection.contentEn,
      applicable: anesthesiaApplicable,
    },
    {
      labelAr: "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø±ÙŠØ¶",
      labelEn: "Patient Acknowledgment",
      valueAr: firstString(anesthesiaMetadata, [["acknowledgmentAr"]]),
      valueEn: firstString(anesthesiaMetadata, [["acknowledgmentEn"]]),
      applicable: anesthesiaApplicable,
    },
  ]);

  addSectionRows("patient_acknowledgment_disclosures", "Ø¥Ù‚Ø±Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø±ÙŠØ¶ ÙˆØ§Ù„Ø¥ÙØµØ§Ø­Ø§Øª", "Patient Acknowledgment / Disclosures", [
    {
      labelAr: "Ø£ØªÙŠØ­Øª Ù„ÙŠ Ø§Ù„ÙØ±ØµØ© Ù„Ø·Ø±Ø­ Ø§Ù„Ø£Ø³Ø¦Ù„Ø©",
      labelEn: "I had the opportunity to ask questions",
      valueAr: firstBoolean(disclosuresMetadata, [["questionsOpportunity"]]) === false ? "Ù„Ø§" : "Ù†Ø¹Ù…",
      valueEn: firstBoolean(disclosuresMetadata, [["questionsOpportunity"]]) === false ? "No" : "Yes",
    },
    {
      labelAr: "ØªÙ…Øª Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù„Ù‰ Ø¬Ù…ÙŠØ¹ Ø£Ø³Ø¦Ù„ØªÙŠ",
      labelEn: "All my questions were answered",
      valueAr: firstBoolean(disclosuresMetadata, [["allQuestionsAnswered"]]) === false ? "Ù„Ø§" : "Ù†Ø¹Ù…",
      valueEn: firstBoolean(disclosuresMetadata, [["allQuestionsAnswered"]]) === false ? "No" : "Yes",
    },
    {
      labelAr: "Ø£ÙÙ‡Ù… Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ù‚Ø¯Ù…Ø© Ù„ÙŠ",
      labelEn: "I understand the information",
      valueAr: firstBoolean(disclosuresMetadata, [["patientUnderstood"]]) === false ? "Ù„Ø§" : "Ù†Ø¹Ù…",
      valueEn: firstBoolean(disclosuresMetadata, [["patientUnderstood"]]) === false ? "No" : "Yes",
    },
    {
      labelAr: "Ø£ÙˆØ§ÙÙ‚ Ø¨Ø¥Ø±Ø§Ø¯ØªÙŠ Ø§Ù„Ø­Ø±Ø© Ø¯ÙˆÙ† Ø¥ÙƒØ±Ø§Ù‡",
      labelEn: "I consent voluntarily",
      valueAr: firstBoolean(disclosuresMetadata, [["voluntaryConsent"]]) === false ? "Ù„Ø§" : "Ù†Ø¹Ù…",
      valueEn: firstBoolean(disclosuresMetadata, [["voluntaryConsent"]]) === false ? "No" : "Yes",
    },
    {
      labelAr: "Ø£ÙÙ‡Ù… Ø£Ù†Ù‡ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¶Ù…Ø§Ù† Ù†ØªÙŠØ¬Ø© Ù…Ø­Ø¯Ø¯Ø©",
      labelEn: "I understand no guarantee of outcome",
      valueAr: normalizeArabicRowValue(sectionNoGuarantee.contentAr || document.legalTextAr, NO_GUARANTEE_AR_FALLBACK),
      valueEn: normalizeEnglishRowValue(sectionNoGuarantee.contentEn || document.legalTextEn, NO_GUARANTEE_EN_FALLBACK),
    },
    {
      labelAr: "Ø£ÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ø£ÙŠ Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ© Ø¶Ø±ÙˆØ±ÙŠØ©",
      labelEn: "Additional procedures if necessary",
      valueAr: firstString(disclosuresMetadata, [["emergencyProceduresAr"]]),
      valueEn: firstString(disclosuresMetadata, [["emergencyProceduresEn"]]),
    },
  ]);

  addSectionRows("pdpl_data_protection", "Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ©", "PDPL / Data Protection", [
    {
      labelAr: "Ø£ÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø¹Ù„ÙˆÙ…Ø§ØªÙŠ Ø§Ù„ØµØ­ÙŠØ©",
      labelEn: "I consent to use my health information",
      valueAr: normalizeArabicRowValue(
        (fixedClauses.pdplTextAr as string | undefined) || document.pdplTextAr,
        PDPL_CONSENT_AR_FALLBACK,
      ),
      valueEn: normalizeEnglishRowValue(
        (fixedClauses.pdplTextEn as string | undefined) || document.pdplTextEn,
        PDPL_CONSENT_EN_FALLBACK,
      ),
    },
    {
      labelAr: "Ù„Ø£ØºØ±Ø§Ø¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ ÙˆØ§Ù„ØªÙˆØ«ÙŠÙ‚ ÙˆØ§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„ØµØ­ÙŠ",
      labelEn: "For treatment, documentation, operations",
      valueAr: normalizeArabicRowValue(
        firstString(metadata, [["pdpl", "processingPurposesAr"]]) || document.pdplTextAr,
        PDPL_PURPOSES_AR_FALLBACK,
      ),
      valueEn: normalizeEnglishRowValue(
        firstString(metadata, [["pdpl", "processingPurposesEn"]]) || document.pdplTextEn,
        PDPL_PURPOSES_EN_FALLBACK,
      ),
    },
    {
      labelAr: "ÙˆÙÙ‚Ù‹Ø§ Ù„Ù†Ø¸Ø§Ù… Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ©",
      labelEn: "Compliance with Saudi PDPL",
      valueAr: normalizeArabicRowValue(document.pdplTextAr, PDPL_COMPLIANCE_AR_FALLBACK),
      valueEn: normalizeEnglishRowValue(document.pdplTextEn, PDPL_COMPLIANCE_EN_FALLBACK),
    },
  ]);

  addSectionRows("financial_acknowledgment", "Ø§Ù„Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø§Ù„ÙŠ", "Financial Acknowledgment", [...FINANCIAL_ACKNOWLEDGMENT_ROWS]);

  const otpVerified = signatureSecurity.otpVerified === true || signatureOrchestration.otpVerified === true;
  const auditReference = evidenceVault.verificationToken || effectiveHash || document.id;
  const evidencePackageReference =
    document.evidencePackages[0]?.id || normalizeText((evidenceVault.evidencePackageV2Id as string | undefined) || "") || null;
  const latestIp = patientSignatureRaw?.ipAddress || guardianSignatureRaw?.ipAddress || document.timelineEvents.at(-1)?.ipAddress || null;
  const latestDevice =
    patientSignatureRaw?.userAgent || guardianSignatureRaw?.userAgent || document.timelineEvents.at(-1)?.userAgent || null;

  addSectionRows("signature_and_evidence", "Ø§Ù„ØªÙˆÙ‚ÙŠØ¹Ø§Øª ÙˆØ§Ù„Ø£Ø¯Ù„Ø©", "Signatures & Evidence", [
    {
      labelAr: "ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø±ÙŠØ¶",
      labelEn: "Patient Signature",
      valueAr: signatureSummary(patientSignature, "ar"),
      valueEn: signatureSummary(patientSignature, "en"),
    },
    {
      labelAr: "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ø·Ø¨ÙŠØ¨",
      labelEn: "Physician Certification",
      valueAr: normalizeArabicRowValue(
        signatureSummary(physicianSignature, "ar") || document.physicianCertAr,
        PHYSICIAN_CERT_AR_FALLBACK,
      ),
      valueEn: normalizeEnglishRowValue(
        signatureSummary(physicianSignature, "en") || document.physicianCertEn,
        PHYSICIAN_CERT_EN_FALLBACK,
      ),
    },
    {
      labelAr: "Ø´Ø±Ø­ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨ÙŠØ© ÙˆØ§Ù„Ø¥Ø¬Ø±Ø§Ø¡",
      labelEn: "Condition and procedure explained",
      valueAr: PHYSICIAN_CERT_CONDITION_AR,
      valueEn: PHYSICIAN_CERT_CONDITION_EN,
    },
    {
      labelAr: "Ø´Ø±Ø­ Ø§Ù„ÙÙˆØ§Ø¦Ø¯ ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„",
      labelEn: "Benefits, risks, and alternatives explained",
      valueAr: PHYSICIAN_CERT_RISKS_AR,
      valueEn: PHYSICIAN_CERT_RISKS_EN,
    },
    {
      labelAr: "Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª",
      labelEn: "Questions answered",
      valueAr: PHYSICIAN_CERT_QUESTIONS_AR,
      valueEn: PHYSICIAN_CERT_QUESTIONS_EN,
    },
    {
      labelAr: "ØªÙˆÙ‚ÙŠØ¹ Ø´Ø§Ù‡Ø¯ Ø£Ùˆ Ù…ØªØ±Ø¬Ù… Ø¥Ù† ÙˆØ¬Ø¯",
      labelEn: "Witness / Interpreter if any",
      valueAr: toMultilineList([
        signatureSummary(witnessSignature, "ar"),
        signatureSummary(interpreterSignature, "ar") || sectionInterpreter.contentAr,
      ]),
      valueEn: toMultilineList([
        signatureSummary(witnessSignature, "en"),
        signatureSummary(interpreterSignature, "en") || sectionInterpreter.contentEn,
      ]),
      applicable: Boolean(witnessSignature || interpreterSignature || document.template.requiresInterpreter),
    },
    {
      labelAr: "ØªÙˆÙ‚ÙŠØ¹ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ø¥Ù† ÙˆØ¬Ø¯",
      labelEn: "Legal Representative if any",
      valueAr: signatureSummary(guardianSignature, "ar"),
      valueEn: signatureSummary(guardianSignature, "en"),
      applicable: document.template.requiresGuardian || Boolean(guardianSignature),
    },
    {
      labelAr: "Ø§Ù„ØªØ­Ù‚Ù‚ Ø¹Ø¨Ø± OTP",
      labelEn: "OTP Verification",
      valueAr: otpVerified ? "ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚" : NOT_PROVIDED.ar,
      valueEn: otpVerified ? "Verified" : NOT_PROVIDED.en,
    },
    {
      labelAr: "Ø±Ù…Ø² Ø§Ù„Ø¬Ù„Ø³Ø© / Ø§Ù„ØªÙˆÙ‚ÙŠØ¹",
      labelEn: "Signing Token / Session",
      valueAr: normalizeText((signatureOrchestration.sessionId as string | undefined) || (signatureOrchestration.challengeId as string | undefined)),
      valueEn: normalizeText((signatureOrchestration.sessionId as string | undefined) || (signatureOrchestration.challengeId as string | undefined)),
    },
    { labelAr: "Ø¹Ù†ÙˆØ§Ù† IP", labelEn: "IP Address", valueAr: latestIp, valueEn: latestIp },
    { labelAr: "Ø§Ù„Ø¬Ù‡Ø§Ø² / Ø§Ù„Ù…ØªØµÙØ­", labelEn: "Device / Browser", valueAr: latestDevice, valueEn: latestDevice },
    { labelAr: "Ù…Ø±Ø¬Ø¹ Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚", labelEn: "Audit Trail Reference", valueAr: auditReference, valueEn: auditReference },
    { labelAr: "Ø­Ø²Ù…Ø© Ø§Ù„Ø£Ø¯Ù„Ø©", labelEn: "Evidence Package", valueAr: evidencePackageReference, valueEn: evidencePackageReference },
    { labelAr: "Ø±Ø§Ø¨Ø· Ø§Ù„ØªØ­Ù‚Ù‚", labelEn: "Verification URL", valueAr: qrVerificationUrl, valueEn: qrVerificationUrl },
    { labelAr: "Ø§Ù„Ø¨ÙŠØ§Ù† Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠ", labelEn: "System validity statement", valueAr: SYSTEM_VALIDITY_STATEMENT_AR, valueEn: SYSTEM_VALIDITY_STATEMENT_EN },
  ]);

  const payload: FinalConsentPdfPayload = {
    header: {
      facilityName,
      documentId: document.id,
      issueDate: formatDateTime(document.finalizedAt || document.updatedAt, "en"),
      documentStatus: statusLabel.en,
      titleEn: FINAL_TITLE.en,
      titleAr: FINAL_TITLE.ar,
      signingStatementEn: FINAL_SIGNING_STATEMENT.en,
      signingStatementAr: FINAL_SIGNING_STATEMENT.ar,
      consentReference: document.consentReference,
    },
    patient: {
      patientName: document.patientName,
      mrn: document.mrn,
      encounterNumber: emrMapping?.encounterIdentifier || null,
      dateOfBirth: document.dob,
      gender: document.gender,
      nationalId,
      department: document.department,
      treatingPhysician: document.physicianName,
      visitDate,
    },
    encounter: {
      caseNumber: document.case?.caseNumber || null,
      encounterIdentifier: emrMapping?.encounterIdentifier || null,
      physicianIdentifier: emrMapping?.physicianIdentifier || null,
      diagnosisCode: emrMapping?.diagnosisCode || null,
      procedureCode: emrMapping?.procedureCode || null,
    },
    consent: {
      consentType: document.template.consentType,
      templateTitle: document.template.titleEn,
      diagnosis: document.diagnosis || NOT_PROVIDED.en,
      medicalCondition: sectionMedicalCondition.contentEn || document.admissionDetails,
    },
    procedure: {
      proposedProcedure: sectionProcedure.contentEn || document.plannedProcedure,
      procedureSite: sectionSite.contentEn,
      expectedBenefits: sectionBenefits.contentEn || document.expectedOutcomesEn,
      commonRisks: commonRisks.en,
      uncommonRisks: uncommonRisks.en,
      seriousRisks: toMultilineList([seriousRisks.en, lifeThreateningRisks.en]),
      potentialComplications: sectionComplications.contentEn || document.sideEffectsEn,
      treatmentAlternatives: sectionAlternatives.contentEn || document.alternativesEn,
      refusalRisks: sectionRefusal.contentEn || document.refusalRisksEn,
      postProcedureInstructions: sectionPostProcedure.contentEn,
      physicianNotes: sectionPhysicianNotes.contentEn || document.physicianNotesEn,
      specialPrecautions: sectionSpecialPrecautions.contentEn,
    },
    anesthesia: {
      applies: anesthesiaApplicable ? "Applies" : NOT_APPLICABLE.en,
      type: firstString(anesthesiaMetadata, [["typeEn"], ["type"]]),
      options: firstString(anesthesiaMetadata, [["optionsEn"]]),
      risks: firstString(anesthesiaMetadata, [["risksEn"]]) || anesthesiaSection.contentEn,
      acknowledgement: firstString(anesthesiaMetadata, [["acknowledgmentEn"]]),
    },
    disclosures: {
      patientQuestionsOpportunity: firstBoolean(disclosuresMetadata, [["questionsOpportunity"]]) === false ? "No" : "Yes",
      allQuestionsAnswered: firstBoolean(disclosuresMetadata, [["allQuestionsAnswered"]]) === false ? "No" : "Yes",
      patientUnderstood: firstBoolean(disclosuresMetadata, [["patientUnderstood"]]) === false ? "No" : "Yes",
      voluntaryConsent: firstBoolean(disclosuresMetadata, [["voluntaryConsent"]]) === false ? "No" : "Yes",
      noGuaranteeOfOutcome: sectionNoGuarantee.contentEn || document.legalTextEn,
      emergencyProcedures: firstString(disclosuresMetadata, [["emergencyProceduresEn"]]),
    },
    pdpl: {
      patientHealthInformationProcessingAcknowledgment: normalizeText(document.pdplTextEn),
      processingPurposes: firstString(metadata, [["pdpl", "processingPurposesEn"]]) || normalizeText(document.pdplTextEn),
      saudiPdplComplianceWording: normalizeText(document.pdplTextEn),
    },
    financialAcknowledgment: {
      treatmentPlanAndEstimatedCosts: FINANCIAL_ACKNOWLEDGMENT_ROWS[0].valueEn,
      uncoveredCostsCommitment: FINANCIAL_ACKNOWLEDGMENT_ROWS[1].valueEn,
      convertUnpaidCharges: FINANCIAL_ACKNOWLEDGMENT_ROWS[2].valueEn,
      transferAuthorization: FINANCIAL_ACKNOWLEDGMENT_ROWS[3].valueEn,
    },
    signatures: {
      patientSignature: signatureSummary(patientSignature, "en"),
      guardianSignature: signatureSummary(guardianSignature, "en"),
      physicianCertification: normalizeLegalText(
        signatureSummary(physicianSignature, "en") || document.physicianCertEn,
        PHYSICIAN_CERT_EN_FALLBACK,
      ),
      interpreterAcknowledgment: signatureSummary(interpreterSignature, "en") || sectionInterpreter.contentEn,
      signatureDateTime: formatDateTime((guardianSignatureRaw || patientSignatureRaw || physicianSignatureRaw)?.signedAt || document.updatedAt, "en"),
      otpVerificationStatus: otpVerified ? "Verified" : NOT_PROVIDED.en,
    },
    evidence: {
      secureSigningReference: normalizeText((signatureOrchestration.sessionId as string | undefined) || (signatureOrchestration.challengeId as string | undefined)),
      ipAddress: latestIp,
      deviceMetadata: latestDevice,
      auditTrailReference: auditReference,
      evidencePackageReference,
      fixedClauseChecksum: computeFixedClauseChecksum(document),
    },
    bilingualRows: rows,
    status: effectiveStatus,
    consentDocumentId: document.id,
    immutablePdfHash: effectiveHash || null,
    patientSignature,
    physicianSignature,
    guardianSignature,
    interpreterSignature,
    witnessSignature,
    qrPayload,
    qrVerificationUrl,
    logoSrc: await resolveLogoSource(),
  };

  validateFinalConsentPdfPayload(payload);

  return payload;
}
function resolveSignatureForRow(payload: FinalConsentPdfPayload, row: FinalConsentPdfRow): SignaturePresentation | null {
  switch (row.labelEn) {
    case "Patient Signature":
      return payload.patientSignature;
    case "Physician Certification":
      return payload.physicianSignature;
    case "Witness / Interpreter if any":
      return payload.witnessSignature || payload.interpreterSignature;
    case "Legal Representative if any":
      return payload.guardianSignature;
    default:
      return null;
  }
}

function renderRowValueHtml(row: FinalConsentPdfRow, locale: "ar" | "en", payload: FinalConsentPdfPayload): string {
  const value = locale === "ar" ? normalizeArabicText(row.valueAr) : normalizeText(row.valueEn);
  const signature = row.sectionKey === "signature_and_evidence" ? resolveSignatureForRow(payload, row) : null;

  const signatureImage = signature?.signatureImageDataUrl
    ? `<img class="signature-inline" src="${escapeHtml(signature.signatureImageDataUrl)}" alt="${escapeHtml(row.labelEn)}" />`
    : "";

  return `<div class="value">${signatureImage}${renderMultiline(value)}</div>`;
}


function readLocalPdfFontBase64(relativePathFromRepoRoot: string): string {
  const candidates = [
    path.join(process.cwd(), relativePathFromRepoRoot),
    path.join(process.cwd(), "..", relativePathFromRepoRoot),
    path.join(process.cwd(), "..", "..", relativePathFromRepoRoot),
    path.join(process.cwd(), "..", "..", "..", relativePathFromRepoRoot),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate).toString("base64");
    }
  }

  return "";
}

function buildInlinePdfFontFaceCss(): string {
  const sansArabic400 = readLocalPdfFontBase64(
    "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff2",
  );

  const sansArabic700 = readLocalPdfFontBase64(
    "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-700-normal.woff2",
  );

  const naskhArabic400 = readLocalPdfFontBase64(
    "node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2",
  );

  const naskhArabic700 = readLocalPdfFontBase64(
    "node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-700-normal.woff2",
  );

  const faces: string[] = [];

  if (sansArabic400) {
    faces.push(`
      @font-face {
        font-family: "WathiqPdfSans";
        src: url("data:font/woff2;base64,${sansArabic400}") format("woff2");
        font-weight: 400;
        font-style: normal;
      }
    `);
  }

  if (sansArabic700) {
    faces.push(`
      @font-face {
        font-family: "WathiqPdfSans";
        src: url("data:font/woff2;base64,${sansArabic700}") format("woff2");
        font-weight: 700;
        font-style: normal;
      }
    `);
  }

  if (naskhArabic400) {
    faces.push(`
      @font-face {
        font-family: "WathiqPdfArabic";
        src: url("data:font/woff2;base64,${naskhArabic400}") format("woff2");
        font-weight: 400;
        font-style: normal;
      }
    `);
  }

  if (naskhArabic700) {
    faces.push(`
      @font-face {
        font-family: "WathiqPdfArabic";
        src: url("data:font/woff2;base64,${naskhArabic700}") format("woff2");
        font-weight: 700;
        font-style: normal;
      }
    `);
  }

  return faces.join("\n");
}

function buildPdfTextVisibilityCss(): string {
  return `
    *,
    *::before,
    *::after {
      color: #0f172a !important;
      -webkit-text-fill-color: #0f172a !important;
      opacity: 1 !important;
      visibility: visible !important;
      text-shadow: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .label,
    .meta-label,
    .section-header-en,
    .section-header-ar,
    .title-box h1,
    .title-ar,
    .footer-brand strong,
    .qr-copy strong {
      color: #164c7a !important;
      -webkit-text-fill-color: #164c7a !important;
    }

    .value,
    .cell-en,
    .cell-ar,
    .meta-value,
    .footer-copy,
    .subtitle-en,
    .subtitle-ar,
    .meta-label-ar,
    .qr-copy,
    .imc-brand,
    .footer-brand .sub {
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
    }

    body,
    .cell-en,
    .title-box,
    .imc-brand,
    .meta-label,
    .meta-value,
    .footer-copy,
    .footer-brand {
      font-family: Arial, Tahoma, "Segoe UI", sans-serif !important;
    }

    .cell-ar,
    .title-ar,
    .subtitle-ar,
    .meta-label-ar,
    .section-header-ar,
    .footer-copy .rtl,
    .qr-copy .ar {
      font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
    }
  `;
}

function buildTableHtml(payload: FinalConsentPdfPayload, copyTypeLabel: string): string {
  const groupedRows: string[] = [];
  let currentSection = "";

  for (const row of payload.bilingualRows) {
    if (row.sectionKey !== currentSection) {
      currentSection = row.sectionKey;

      groupedRows.push(`
        <tr class="section-row">
          <td colspan="2">
            <div class="section-title-wrap">
              <span class="section-header-en">${escapeHtml(row.sectionTitleEn)}</span>
              <span class="section-header-ar">${escapeHtml(row.sectionTitleAr)}</span>
            </div>
          </td>
        </tr>
      `);
    }

    groupedRows.push(`
      <tr>
        <td class="cell-en">
          <div class="label">${escapeHtml(row.labelEn)}</div>
          ${renderRowValueHtml(row, "en", payload)}
        </td>
        <td class="cell-ar">
          <div class="label">${escapeHtml(row.labelAr)}</div>
          ${renderRowValueHtml(row, "ar", payload)}
        </td>
      </tr>
    `);
  }

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <style>
        ${buildInlinePdfFontFaceCss()}
        ${buildPdfTextVisibilityCss()}

        @page {
          size: A4 portrait;
          margin: 8mm 8mm 10mm 8mm;
        }

        * {
          box-sizing: border-box;
        }

        html,
body {
  width: auto;
  min-height: auto;
}

        body {
          margin: 0;
          color: #0f172a !important;
          background: #ffffff;
          font-family: Arial, Tahoma, "Segoe UI", sans-serif !important;
          font-size: 9.8px;
          line-height: 1.42;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .document {
  width: 194mm;
  max-width: 194mm;
  margin: 0 auto;
  color: #0f172a !important;
  opacity: 1 !important;
  visibility: visible !important;
}

        .document,
        .document * {
          opacity: 1 !important;
          visibility: visible !important;
        }

        .header {
          border: 1px solid #c8d6e3;
          border-top: 4px solid #14537d;
          border-bottom: 2px solid #d6a93b;
          padding: 7px 9px;
          display: grid;
          grid-template-columns: 32mm 1fr 56mm;
          gap: 8px;
          align-items: stretch;
          margin-bottom: 6px;
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 36mm;
          color: #0f172a !important;
        }

        .brand-box {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .imc-logo {
          width: 36px;
          height: 36px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .imc-brand {
          font-size: 8px;
          line-height: 1.2;
          color: #1e3a5f !important;
        }

        .imc-brand strong {
          display: block;
          font-size: 9.5px;
          color: #0f3c60 !important;
          -webkit-text-fill-color: #0f3c60 !important;
        }

        .title-box {
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          min-width: 0;
          color: #0f172a !important;
        }

        .title-box h1 {
          margin: 0;
          font-size: 15px;
          color: #164c7a !important;
          -webkit-text-fill-color: #164c7a !important;
          font-weight: 800;
          line-height: 1.12;
        }

        .title-ar {
          margin: 0;
          font-size: 14px;
          color: #164c7a !important;
          -webkit-text-fill-color: #164c7a !important;
          font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
          direction: rtl;
          line-height: 1.2;
          font-weight: 800;
        }

        .subtitle-en,
        .subtitle-ar {
          font-size: 8.2px;
          color: #475569 !important;
          -webkit-text-fill-color: #475569 !important;
          line-height: 1.2;
        }

        .subtitle-ar {
          direction: rtl;
          font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
        }

        .right-box {
          display: grid;
          grid-template-rows: auto auto;
          gap: 5px;
        }

        .metadata-panel {
          border: 1px solid #d6e1eb;
          background: #f8fbfe;
          padding: 4px 5px;
          display: grid;
          gap: 3px;
          color: #0f172a !important;
        }

        .meta-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 5px;
          align-items: start;
          font-size: 7.2px;
          color: #334155 !important;
        }

        .meta-label {
          font-weight: 800;
          color: #164c7a !important;
          -webkit-text-fill-color: #164c7a !important;
          line-height: 1.12;
        }

        .meta-label-ar {
          direction: rtl;
          font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
          color: #64748b !important;
          -webkit-text-fill-color: #64748b !important;
          line-height: 1.12;
        }

        .meta-value {
          text-align: right;
          font-weight: 700;
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          overflow-wrap: anywhere;
          word-break: normal;
          line-height: 1.15;
        }

        .qr-box {
          display: grid;
          grid-template-columns: 48px 1fr;
          align-items: center;
          gap: 5px;
          border: 1px solid #d6e1eb;
          background: #ffffff;
          padding: 5px;
        }

        .qr-box img {
          width: 48px;
          height: 48px;
          border: 1px solid #dbe4ee;
          background: #ffffff;
        }

        .qr-copy {
          text-align: right;
          font-size: 7.2px;
          color: #334155 !important;
          -webkit-text-fill-color: #334155 !important;
          line-height: 1.2;
        }

        .qr-copy strong {
          display: block;
          color: #164c7a !important;
          -webkit-text-fill-color: #164c7a !important;
          margin-bottom: 1px;
        }

        .qr-copy .ar {
          direction: rtl;
          font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
        }

        table {
  page-break-inside: auto;
  break-inside: auto;
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1px solid #b8c9d8;
          page-break-inside: auto;
          color: #0f172a !important;
        }

        col {
          width: 50%;
        }

        tr {
  page-break-inside: auto;
  break-inside: auto;
}

.section-row,
.section-row td {
  page-break-inside: avoid;
  break-inside: avoid;
  page-break-after: avoid;
  break-after: avoid;
}

td {
  page-break-inside: auto;
  break-inside: auto;
          border: 1px solid #d7e2ec;
          vertical-align: top;
          color: #0f172a !important;
        }

        .cell-en,
        .cell-ar {
          width: 50%;
          padding: 4.5px 6px;
          border: 1px solid #d7e0ea;
          vertical-align: top;
          background: #ffffff;
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .cell-en {
          direction: ltr;
          text-align: left;
          font-family: Arial, Tahoma, "Segoe UI", sans-serif !important;
        }

        .cell-ar {
          direction: rtl;
          text-align: right;
          font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
        }

        .label {
          display: block;
          margin-bottom: 2px;
          font-size: 8.2px;
          font-weight: 800;
          color: #164c7a !important;
          -webkit-text-fill-color: #164c7a !important;
          line-height: 1.18;
        }

        .value {
          font-size: 8.8px;
          line-height: 1.44;
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .cell-en .value {
          text-align: justify;
          text-align-last: left;
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .cell-ar .value {
          text-align: right;
          text-align-last: right;
          direction: rtl;
          unicode-bidi: plaintext;
          letter-spacing: 0;
          word-spacing: normal;
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .signature-inline {
          display: block;
          max-width: 130px;
          max-height: 36px;
          object-fit: contain;
          margin: 0 0 4px;
          border-bottom: 1px solid #d5e0ea;
          background: #ffffff;
        }

        .section-row td {
  page-break-inside: avoid;
  break-inside: avoid;
          padding: 5px 7px;
          background: #eaf4fb;
          border: 1px solid #c6d2df;
          border-top: 2px solid #14537d;
          page-break-after: avoid;
          break-after: avoid;
        }

        .section-title-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .section-header-en {
          font-size: 9.6px;
          font-weight: 800;
          color: #123f66 !important;
          -webkit-text-fill-color: #123f66 !important;
          line-height: 1.18;
        }

        .section-header-ar {
          font-size: 9.6px;
          font-weight: 800;
          color: #123f66 !important;
          -webkit-text-fill-color: #123f66 !important;
          direction: rtl;
          text-align: right;
          font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
          line-height: 1.18;
        }

        .footer {
          margin-top: 6px;
          border: 1px solid #c6d2df;
          background: #f7fafc;
          padding: 7px 9px;
          display: grid;
          grid-template-columns: 1fr 42mm;
          gap: 8px;
          page-break-inside: avoid;
          break-inside: avoid;
          color: #0f172a !important;
        }

        .footer-copy {
          font-size: 8px;
          color: #334155 !important;
          -webkit-text-fill-color: #334155 !important;
          line-height: 1.28;
        }

        .footer-copy strong {
          color: #164c7a !important;
          -webkit-text-fill-color: #164c7a !important;
          display: block;
          margin-bottom: 2px;
        }

        .footer-copy .rtl {
          direction: rtl;
          font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
          margin-top: 2px;
        }

        .footer-brand {
          border-left: 2px solid #14537d;
          padding-left: 8px;
          text-align: right;
        }

        .footer-brand strong {
          display: block;
          color: #164c7a !important;
          -webkit-text-fill-color: #164c7a !important;
          font-size: 10px;
        }

        .footer-brand .sub {
          font-size: 7.4px;
          color: #475569 !important;
          -webkit-text-fill-color: #475569 !important;
        }
      </style>
    </head>
    <body>
      <div class="document">
        <div class="header">
          <div class="brand-box">
            <img class="imc-logo" src="${escapeHtml(payload.logoSrc)}" alt="International Medical Center" />
            <div class="imc-brand">
              <strong>IMC</strong>
              <div>International Medical Center</div>
            </div>
          </div>

          <div class="title-box">
            <h1>${escapeHtml(FINAL_TITLE.en)}</h1>
            <div class="title-ar">${escapeHtml(FINAL_TITLE.ar)}</div>
            <div class="subtitle-en">${escapeHtml(FINAL_SIGNING_STATEMENT.en)}</div>
            <div class="subtitle-ar">${escapeHtml(FINAL_SIGNING_STATEMENT.ar)}</div>
          </div>

          <div class="right-box">
            <div class="metadata-panel">
              <div class="meta-row">
                <div>
                  <div class="meta-label">Document ID</div>
                  <div class="meta-label-ar">Ù…Ø¹Ø±Ù Ø§Ù„Ù…Ø³ØªÙ†Ø¯</div>
                </div>
                <div class="meta-value">${escapeHtml(payload.consentDocumentId)}</div>
              </div>
              <div class="meta-row">
                <div>
                  <div class="meta-label">Issue Date</div>
                  <div class="meta-label-ar">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥ØµØ¯Ø§Ø±</div>
                </div>
                <div class="meta-value">${escapeHtml(payload.header.issueDate || "")}</div>
              </div>
              <div class="meta-row">
                <div>
                  <div class="meta-label">Status</div>
                  <div class="meta-label-ar">Ø§Ù„Ø­Ø§Ù„Ø©</div>
                </div>
                <div class="meta-value">${escapeHtml(payload.header.documentStatus || "")}</div>
              </div>
              <div class="meta-row">
                <div>
                  <div class="meta-label">Reference</div>
                  <div class="meta-label-ar">Ø§Ù„Ù…Ø±Ø¬Ø¹</div>
                </div>
                <div class="meta-value">${escapeHtml(payload.header.consentReference || "")}</div>
              </div>
            </div>

            <div class="qr-box">
              <img src="__QR_DATA_URL__" alt="QR verification" />
              <div class="qr-copy">
                <strong>Verify Document</strong>
                <div class="ar">Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù…Ø³ØªÙ†Ø¯</div>
                <div>${escapeHtml(copyTypeLabel)}</div>
              </div>
            </div>
          </div>
        </div>

        <table>
          <colgroup><col /><col /></colgroup>
          <tbody>${groupedRows.join("")}</tbody>
        </table>

        <div class="footer">
          <div class="footer-copy">
            <strong>This document is electronically generated and signed via Wathiq Care system and is legally valid.</strong>
            <div class="rtl">ØªÙ… Ø¥ØµØ¯Ø§Ø± Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ ÙˆØªÙˆÙ‚ÙŠØ¹Ù‡ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠÙ‹Ø§ Ø¹Ø¨Ø± Ù†Ø¸Ø§Ù… ÙˆØ§Ø«Ù‚ ÙƒÙŠØ±ØŒ ÙˆÙ‡Ùˆ ÙˆØ«ÙŠÙ‚Ø© Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© Ù…Ø¹ØªÙ…Ø¯Ø©.</div>
            <div>Verification URL: ${escapeHtml(payload.qrVerificationUrl)}</div>
          </div>

          <div class="footer-brand">
            <strong>Wathiq Care</strong>
            <div class="sub">System-generated legal validity statement</div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export async function renderFinalConsentPdfResponse(args: RenderArgs): Promise<NextResponse> {
  let browser: Browser | null = null;

  try {
    const { payload, html } = await buildFinalConsentPdfRenderContext(args);

    if (args.request.nextUrl.searchParams.get("debug") === "html") {
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Wathiq-Rows-Count": String(payload.bilingualRows.length),
          "X-Wathiq-Html-Length": String(html.length),
          "X-Wathiq-Html-Has-Patient": html.includes("Patient Name") ? "yes" : "no",
          "X-Wathiq-Html-Has-Arabic": /[\u0600-\u06FF]/.test(html) ? "yes" : "no",
        },
      });
    }

    browser = await launchBrowser();

    const page = await browser.newPage();

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.addStyleTag({
      content: buildPdfTextVisibilityCss(),
    });

    await page.emulateMediaType("print");

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    await page.evaluate(() => {
      document.body.style.color = "#0f172a";
      document.body.style.setProperty("-webkit-text-fill-color", "#0f172a");

      const allNodes = document.querySelectorAll<HTMLElement>("*");
      allNodes.forEach((node) => {
        node.style.opacity = "1";
        node.style.visibility = "visible";
      });

      const darkTextNodes = document.querySelectorAll<HTMLElement>(
        ".value, .cell-en, .cell-ar, .meta-value, .footer-copy",
      );

      darkTextNodes.forEach((node) => {
        node.style.color = "#111827";
        node.style.setProperty("-webkit-text-fill-color", "#111827");
      });

      const blueTextNodes = document.querySelectorAll<HTMLElement>(
        ".label, .meta-label, .section-header-en, .section-header-ar, .title-box h1, .title-ar, .footer-brand strong",
      );

      blueTextNodes.forEach((node) => {
        node.style.color = "#164c7a";
        node.style.setProperty("-webkit-text-fill-color", "#164c7a");
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 350));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      scale: 1,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "10mm",
        left: "8mm",
      },
    });

    await page.close();

    const lang = args.lang || "bilingual";

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${args.disposition || "attachment"}; filename="CONSENT-${payload.consentDocumentId}-${args.copyType}-${lang}.pdf"`,
        "Cache-Control": "no-store",
        "X-Wathiq-Document-Status": payload.status,
        "X-Wathiq-Audit-Checksum": payload.immutablePdfHash || "",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("renderFinalConsentPdfResponse", error);

    return NextResponse.json(
      { error: "Failed to generate final consent PDF" },
      { status: 500 },
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // no-op
      }
    }
  }
}

async function buildFinalConsentPdfRenderContext(
  args: RenderArgs,
): Promise<{ payload: FinalConsentPdfPayload; html: string }> {
  const payload = await buildFinalConsentPdfPayload({
    documentId: args.documentId,
    tenantId: args.tenantId,
    requestOrigin: args.request.nextUrl.origin,
  });

  const qrDataUrl = await QRCode.toDataURL(payload.qrPayload, {
    errorCorrectionLevel: "M",
    width: 150,
    margin: 1,
  });

  const copyTypeLabel =
    args.copyType === "LEGAL_ARCHIVE_COPY"
      ? "Legal Archive Copy / Ù†Ø³Ø®Ø© Ø§Ù„Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ"
      : args.copyType === "MEDICAL_RECORD_COPY"
        ? "Medical Record Copy / Ù†Ø³Ø®Ø© Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ø·Ø¨ÙŠ"
        : "Patient Copy / Ù†Ø³Ø®Ø© Ø§Ù„Ù…Ø±ÙŠØ¶";

  const html = buildTableHtml(payload, copyTypeLabel).replace(
    "__QR_DATA_URL__",
    escapeHtml(qrDataUrl),
  );

  return { payload, html };
}

export async function renderFinalConsentHtmlPreviewResponse(args: RenderArgs): Promise<NextResponse> {
  try {
    const { html } = await buildFinalConsentPdfRenderContext(args);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("renderFinalConsentHtmlPreviewResponse", error);

    return NextResponse.json(
      { error: "Failed to generate final consent HTML preview" },
      { status: 500 },
    );
  }
}