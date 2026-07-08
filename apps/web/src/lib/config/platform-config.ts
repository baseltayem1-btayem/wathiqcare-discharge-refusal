/**
 * Enterprise Platform Configuration
 *
 * Centralizes all platform-wide constants: branding, legal defaults,
 * PDF settings, AI settings, QR settings, expiry rules.
 *
 * Do NOT hardcode these values elsewhere in the codebase.
 * Consume via `PLATFORM_CONFIG.*` or individual named exports.
 */

// ---------------------------------------------------------------------------
// Brand & Identity
// ---------------------------------------------------------------------------

export const PLATFORM_NAME = process.env.PLATFORM_NAME || "WathiqCare";
export const PLATFORM_NAME_AR = process.env.PLATFORM_NAME_AR || "واثق كير";

export const BRAND = {
  ROYAL_BLUE: "#002B5C",
  LUXURY_GOLD: "#C9A13B",
  WHITE: "#FFFFFF",
  LIGHT_GRAY: "#F5F7FA",
  TEXT_PRIMARY: "#1A1A2E",
  TEXT_SECONDARY: "#6B7280",
} as const;

export const IMC_BRANDING = {
  fullName: "International Medical Center",
  fullNameAr: "المركز الطبي الدولي",
  shortName: "IMC",
  crNumber: process.env.IMC_CR_NUMBER || "",
  address: process.env.IMC_ADDRESS || "Jeddah, Saudi Arabia",
  addressAr: process.env.IMC_ADDRESS_AR || "جدة، المملكة العربية السعودية",
  phone: process.env.IMC_PHONE || "",
  email: process.env.IMC_EMAIL || "",
  website: process.env.IMC_WEBSITE || "https://imc.med.sa",
  logoUrl: process.env.IMC_LOGO_URL || "/imc-logo.png",
} as const;

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

export const PDF_CONFIG = {
  /** Default page format */
  format: "A4" as const,
  /** Page margins in mm */
  margins: { top: 20, right: 15, bottom: 20, left: 15 },
  /** Default viewport width for Puppeteer */
  viewportWidth: 1200,
  /** Print background colors */
  printBackground: true,
  /** Default language if not specified */
  defaultLanguage: "bilingual" as "ar" | "en" | "bilingual",
  /** QR base URL for verification links */
  qrBaseUrl: process.env.QR_VERIFY_BASE_URL || process.env.NEXTAUTH_URL || "https://wathiqcare.online",
  /** QR code size in pixels */
  qrSize: 120,
  /** QR error correction level */
  qrErrorCorrection: "M" as const,
  /** Watermark opacity (0-1) */
  watermarkOpacity: 0.12,
  /** Max retries for Puppeteer launch */
  chromiumMaxRetries: 2,
} as const;

// ---------------------------------------------------------------------------
// AI & Generation
// ---------------------------------------------------------------------------

export const AI_CONFIG = {
  /** Default AI model for consent drafts */
  defaultModel: process.env.AI_MODEL || "gpt-4o-mini",
  /** Max tokens for AI consent draft */
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || "2000", 10),
  /** Temperature for generation (lower = more deterministic) */
  temperature: parseFloat(process.env.AI_TEMPERATURE || "0.3"),
  /** System prompt prefix applied to all requests */
  systemPrefix: "You are a medico-legal consent drafting assistant. Output must be clinically accurate, legally defensible, and IMC-approved wording compliant.",
  /** Label applied to AI-generated content */
  generatedLabel: "AI-assisted draft — pending physician validation",
  /** Label in Arabic */
  generatedLabelAr: "مسودة بمساعدة الذكاء الاصطناعي — في انتظار تحقق الطبيب",
} as const;

// ---------------------------------------------------------------------------
// Signature & Signing Sessions
// ---------------------------------------------------------------------------

export const SIGNATURE_CONFIG = {
  /** Secure link expiry in hours */
  linkExpiryHours: parseInt(process.env.SIGN_LINK_EXPIRY_HOURS || "48", 10),
  /** Max resend attempts before lock */
  maxResendAttempts: 3,
  /** SMS provider — adapter key */
  smsProvider: process.env.SMS_PROVIDER || "taqniat",
  /** PDF Filler base URL */
  pdfFillerBaseUrl: process.env.PDF_FILLER_BASE_URL || "",
  /** PDF Filler API key env var name (never the value) */
  pdfFillerApiKeyEnv: "PDF_FILLER_API_KEY",
  /** Taqniat API URL */
  taqniatApiUrl: process.env.TAQNIAT_API_URL || "https://api.taqniat.sa/v1",
  /** Taqniat API key env var name */
  taqniatApiKeyEnv: "TAQNIAT_API_KEY",
  /** Signing webhook verification secret env var name */
  webhookSecretEnv: "SIGNING_WEBHOOK_SECRET",
} as const;

// ---------------------------------------------------------------------------
// Audit & Retention
// ---------------------------------------------------------------------------

export const AUDIT_CONFIG = {
  /** Default retention period in years */
  defaultRetentionYears: parseInt(process.env.AUDIT_RETENTION_YEARS || "10", 10),
  /** Legal hold retention in years */
  legalHoldRetentionYears: 25,
  /** Audit chain algorithm */
  hashAlgorithm: "sha256" as const,
  /** Evidence package checksum algorithm */
  checksumAlgorithm: "sha256" as const,
} as const;

// ---------------------------------------------------------------------------
// Legal & PDPL
// ---------------------------------------------------------------------------

export const LEGAL_CONFIG = {
  jurisdiction: "Saudi Arabia",
  pdplNoticeEn: "This document is processed in accordance with the Personal Data Protection Law (PDPL) of Saudi Arabia.",
  pdplNoticeAr: "تتم معالجة هذه الوثيقة وفقاً لنظام حماية البيانات الشخصية في المملكة العربية السعودية.",
  consentLegalBasisEn: "Consent is given voluntarily and may be withdrawn at any time prior to the commencement of the procedure.",
  consentLegalBasisAr: "يُعطى الموافقة طوعاً ويمكن سحبها في أي وقت قبل بدء الإجراء الطبي.",
  disclaimerEn: "This document was generated by an AI-assisted platform. Physician review and approval is mandatory before legal finalization.",
  disclaimerAr: "تم إنشاء هذه الوثيقة بمساعدة منصة ذكاء اصطناعي. المراجعة والموافقة من قِبل الطبيب إلزامية قبل الإنهاء القانوني.",
} as const;

// ---------------------------------------------------------------------------
// Composite Export
// ---------------------------------------------------------------------------

export const PLATFORM_CONFIG = {
  name: PLATFORM_NAME,
  nameAr: PLATFORM_NAME_AR,
  brand: BRAND,
  imc: IMC_BRANDING,
  pdf: PDF_CONFIG,
  ai: AI_CONFIG,
  signature: SIGNATURE_CONFIG,
  audit: AUDIT_CONFIG,
  legal: LEGAL_CONFIG,
} as const;
