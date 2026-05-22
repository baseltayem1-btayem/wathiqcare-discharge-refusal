import { Prisma, type PrismaClient } from "@prisma/client";
import { ConsentSectionKind, ConsentTemplateStatus } from "@/lib/server/prisma-enums";
import crypto from "node:crypto";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { normalizeConsentType } from "@/lib/consent-type-canonicalization";
import {
  SAUDI_ENTERPRISE_TEMPLATES,
  buildSaudiTemplateBodyAr,
  buildSaudiTemplateBodyEn,
  buildSaudiTemplateSections,
  type SaudiEnterpriseTemplateSeed,
} from "@/lib/server/informed-consents-saudi-template-library";

const prisma = () => getPrisma();

function readDatabaseErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }

  const e = error as { code?: unknown; meta?: { code?: unknown } };
  const code = typeof e.code === "string" ? e.code : "";
  const sqlState = typeof e.meta?.code === "string" ? e.meta.code : "";
  return code || sqlState;
}

export function isMissingConsentTemplateSchemaError(error: unknown): boolean {
  const code = readDatabaseErrorCode(error);
  return code === "P2021" || code === "P2022" || code === "42P01" || code === "42703";
}

export async function ensureConsentTemplateSchema(client: PrismaClient): Promise<void> {
  await client.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentTemplateStatus') THEN
        CREATE TYPE "ConsentTemplateStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'ARCHIVED');
      END IF;
    END $$;
  `);

  await client.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentSectionKind') THEN
        CREATE TYPE "ConsentSectionKind" AS ENUM (
          'FIXED_LEGAL',
          'DYNAMIC_MEDICAL',
          'AUTO_POPULATED',
          'SIGNATURE',
          'WITNESS',
          'INTERPRETER'
        );
      END IF;
    END $$;
  `);

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS consent_categories (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description_ar TEXT,
      description_en TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 100,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS consent_templates (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES consent_categories(id) ON DELETE SET NULL,
      template_code TEXT NOT NULL,
      risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
      requires_witness BOOLEAN NOT NULL DEFAULT FALSE,
      requires_guardian BOOLEAN NOT NULL DEFAULT FALSE,
      requires_interpreter BOOLEAN NOT NULL DEFAULT FALSE,
      requires_separate_consent BOOLEAN NOT NULL DEFAULT FALSE,
      consent_type TEXT NOT NULL,
      specialty TEXT NOT NULL,
      department TEXT,
      status "ConsentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
      current_version_id TEXT,
      title_ar TEXT NOT NULL,
      title_en TEXT NOT NULL,
      summary_ar TEXT,
      summary_en TEXT,
      is_ai_assist_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS consent_template_versions (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      template_id TEXT NOT NULL REFERENCES consent_templates(id) ON DELETE CASCADE,
      version_label TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      status "ConsentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
      legal_text_ar TEXT NOT NULL,
      legal_text_en TEXT NOT NULL,
      pdpl_text_ar TEXT NOT NULL,
      pdpl_text_en TEXT NOT NULL,
      witness_decl_ar TEXT NOT NULL,
      witness_decl_en TEXT NOT NULL,
      physician_cert_ar TEXT NOT NULL,
      physician_cert_en TEXT NOT NULL,
      ai_warning_ar TEXT NOT NULL,
      ai_warning_en TEXT NOT NULL,
      created_by_user_id TEXT,
      approved_by_user_id TEXT,
      approved_at TIMESTAMPTZ,
      legal_hash TEXT,
      is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
      effective_from TIMESTAMPTZ,
      effective_to TIMESTAMPTZ,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS consent_template_sections (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      template_version_id TEXT NOT NULL REFERENCES consent_template_versions(id) ON DELETE CASCADE,
      section_key TEXT NOT NULL,
      section_kind "ConsentSectionKind" NOT NULL,
      title_ar TEXT NOT NULL,
      title_en TEXT NOT NULL,
      content_ar TEXT NOT NULL,
      content_en TEXT NOT NULL,
      is_required BOOLEAN NOT NULL DEFAULT TRUE,
      is_editable_by_physician BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 100,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS consent_template_localizations (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      template_version_id TEXT NOT NULL REFERENCES consent_template_versions(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      direction TEXT NOT NULL,
      title TEXT NOT NULL,
      full_body TEXT NOT NULL,
      sections_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_consent_categories_tenant_code
      ON consent_categories (tenant_id, code)
  `);
  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_consent_templates_tenant_template_code
      ON consent_templates (tenant_id, template_code)
  `);
  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_consent_template_versions_template_version
      ON consent_template_versions (template_id, version_number)
  `);
  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_consent_template_sections_version_key
      ON consent_template_sections (template_version_id, section_key)
  `);
  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_consent_template_localizations_version_language
      ON consent_template_localizations (template_version_id, language)
  `);
  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_consent_templates_tenant_status_specialty
      ON consent_templates (tenant_id, status, specialty)
  `);
  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_consent_templates_tenant_type
      ON consent_templates (tenant_id, consent_type)
  `);
  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_consent_template_versions_tenant_template_version
      ON consent_template_versions (tenant_id, template_id, version_number)
  `);
  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_consent_template_localizations_tenant_language
      ON consent_template_localizations (tenant_id, language)
  `);
}

async function withConsentTemplateSchemaRecovery<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingConsentTemplateSchemaError(error)) {
      throw error;
    }

    await ensureConsentTemplateSchema(prisma());
    return operation();
  }
}

async function listRuntimeConsentTemplatesWithClient(
  client: PrismaClient,
  auth: AuthContext,
  filter: RuntimeTemplateFilter,
): Promise<RuntimeConsentTemplate[]> {
  const tenantId = requireTenantId(auth);
  const consentType = normalizeConsentType(filter.consentType);
  const specialty = normalizeFilter(filter.specialty).toUpperCase();
  const department = normalizeFilter(filter.department).toUpperCase();

  await ensureDefaultTemplates(tenantId, auth.sub);

  const templates = await client.consentTemplate.findMany({
    where: {
      tenantId,
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

  if (mapped.length === 0) {
    const originalConsentType = normalizeFilter(filter.consentType);
    const normalizedConsentType = consentType || "UNSPECIFIED";
    throw new ApiError(
      404,
      originalConsentType
        ? `No consent templates found for "${originalConsentType}" after normalization to "${normalizedConsentType}".`
        : "No consent templates found for the requested filters.",
      { code: "CONSENT_TEMPLATE_NOT_FOUND" },
    );
  }

  return mapped;
}

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

const FIXED_LEGAL_TITLE_AR = "Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ù…Ø³ØªÙ†ÙŠØ±Ø© Ø§Ù„Ø·Ø¨ÙŠØ©";
const FIXED_LEGAL_TITLE_EN = "Medical Informed Consent";

const FIXED_MAIN_AR = `Ø£Ù‚Ø± Ø£Ù†Ø§ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø£Ø¯Ù†Ø§Ù‡ Ø¨Ø£Ù† Ø§Ù„Ø·Ø¨ÙŠØ¨ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬ ÙˆÙØ±ÙŠÙ‚ Ø§Ù„Ø±Ø¹Ø§ÙŠØ© Ø§Ù„ØµØ­ÙŠØ© Ù‚Ø¯ Ù‚Ø§Ù…ÙˆØ§ Ø¨Ø´Ø±Ø­ Ø­Ø§Ù„ØªÙŠ Ø§Ù„ØµØ­ÙŠØ© ÙˆØ·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø·Ø¨ÙŠ / Ø§Ù„Ø¬Ø±Ø§Ø­ÙŠ / Ø§Ù„ØªØ´Ø®ÙŠØµÙŠ / Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠ Ø§Ù„Ù…Ù‚ØªØ±Ø­ Ù„ÙŠ Ø¨ØµÙˆØ±Ø© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©ØŒ Ø¨Ù…Ø§ ÙÙŠ Ø°Ù„Ùƒ Ø§Ù„ØºØ±Ø¶ Ù…Ù† Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ØŒ ÙˆØ§Ù„ÙÙˆØ§Ø¦Ø¯ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø©ØŒ ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø©ØŒ ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© Ø§Ù„Ù…Ù…ÙƒÙ†Ø©ØŒ Ø¥Ø¶Ø§ÙØ© Ø¥Ù„Ù‰ Ø§Ù„Ù†ØªØ§Ø¦Ø¬ Ø£Ùˆ Ø§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø© ÙÙŠ Ø­Ø§Ù„ Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ Ø£Ùˆ Ø¹Ø¯Ù… Ø¥Ø¬Ø±Ø§Ø¦Ù‡.

ÙƒÙ…Ø§ Ø£Ù‚Ø± Ø¨Ø£Ù†Ù‡ Ø£ØªÙŠØ­Øª Ù„ÙŠ Ø§Ù„ÙØ±ØµØ© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ù„Ø·Ø±Ø­ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© ÙˆØ§Ù„Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ù…ØªØ¹Ù„Ù‚Ø© Ø¨Ø­Ø§Ù„ØªÙŠ Ø§Ù„ØµØ­ÙŠØ© ÙˆØ§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­ØŒ ÙˆÙ‚Ø¯ ØªÙ…Øª Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù„Ù‰ Ø¬Ù…ÙŠØ¹ Ø§Ø³ØªÙØ³Ø§Ø±Ø§ØªÙŠ Ø¨ØµÙˆØ±Ø© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø© ÙˆÙ…Ø±Ø¶ÙŠØ© Ø¨Ø§Ù„Ù†Ø³Ø¨Ø© Ù„ÙŠ.

ÙˆØ£ÙÙ‡Ù… Ø£Ù† Ù…Ù…Ø§Ø±Ø³Ø© Ø§Ù„Ø·Ø¨ ÙˆØ§Ù„Ø¬Ø±Ø§Ø­Ø© Ù„Ø§ ØªØ®Ù„Ùˆ Ù…Ù† Ø§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø©ØŒ ÙˆØ£Ù†Ù‡ Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªÙ‚Ø¯ÙŠÙ… Ø£Ùˆ Ø¶Ù…Ø§Ù† Ù†ØªØ§Ø¦Ø¬ Ù…Ø­Ø¯Ø¯Ø© Ø¨Ø´ÙƒÙ„ Ù…Ø·Ù„Ù‚ØŒ Ø±ØºÙ… Ø§ØªØ®Ø§Ø° ÙƒØ§ÙØ© Ø§Ù„Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ù…Ù‡Ù†ÙŠØ© ÙˆØ§Ù„Ø·Ø¨ÙŠØ© Ø§Ù„Ù…ØªØ¹Ø§Ø±Ù Ø¹Ù„ÙŠÙ‡Ø§.

ÙˆØ£ÙÙ‡Ù… ÙƒØ°Ù„Ùƒ Ø£Ù† Ø¨Ø¹Ø¶ Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø£Ùˆ Ø§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ù‚Ø¯ ØªÙƒÙˆÙ† Ø´Ø§Ø¦Ø¹Ø© Ø£Ùˆ Ù†Ø§Ø¯Ø±Ø© Ø£Ùˆ Ø®Ø·ÙŠØ±Ø© Ø£Ùˆ Ù…Ù‡Ø¯Ø¯Ø© Ù„Ù„Ø­ÙŠØ§Ø© Ø¨Ø­Ø³Ø¨ Ø·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ ÙˆØ­Ø§Ù„ØªÙŠ Ø§Ù„ØµØ­ÙŠØ©.

ÙƒÙ…Ø§ Ø£ÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ø§ØªØ®Ø§Ø° Ø£ÙŠ Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø·Ø¨ÙŠØ© Ø¥Ø¶Ø§ÙÙŠØ© Ø£Ùˆ Ø·Ø§Ø±Ø¦Ø© ÙŠØ±Ø§Ù‡Ø§ Ø§Ù„ÙØ±ÙŠÙ‚ Ø§Ù„Ø·Ø¨ÙŠ Ø¶Ø±ÙˆØ±ÙŠØ© Ø£Ø«Ù†Ø§Ø¡ Ø£Ùˆ Ø¨Ø¹Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø·Ø¨ÙŠ Ø­ÙØ§Ø¸Ù‹Ø§ Ø¹Ù„Ù‰ Ø³Ù„Ø§Ù…ØªÙŠ Ø§Ù„ØµØ­ÙŠØ©ØŒ ÙˆÙÙ‚Ù‹Ø§ Ù„Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ø·Ø¨ÙŠØ© Ø§Ù„Ù…ØªØ¹Ø§Ø±Ù Ø¹Ù„ÙŠÙ‡Ø§.

ÙˆØ£Ù‚Ø± Ø¨Ø£Ù†Ù‡ Ù‚Ø¯ ØªÙ… Ø´Ø±Ø­ Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„ØªØ®Ø¯ÙŠØ± Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø© Ù„ÙŠ â€” Ø¥Ù† ÙˆØ¬Ø¯Øª â€” Ø¨Ù…Ø§ ÙÙŠ Ø°Ù„Ùƒ Ù…Ø®Ø§Ø·Ø± Ø§Ù„ØªØ®Ø¯ÙŠØ± ÙˆÙ…Ø¶Ø§Ø¹ÙØ§ØªÙ‡ Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø©.

ÙˆØ£ÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ø§Ø³ØªØ®Ø¯Ø§Ù… ÙˆÙ…Ø¹Ø§Ù„Ø¬Ø© Ù…Ø¹Ù„ÙˆÙ…Ø§ØªÙŠ Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ø´Ø®ØµÙŠØ© Ø¨Ø§Ù„Ù‚Ø¯Ø± Ø§Ù„Ù„Ø§Ø²Ù… Ù„Ø£ØºØ±Ø§Ø¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ ÙˆØ§Ù„Ø±Ø¹Ø§ÙŠØ© Ø§Ù„ØµØ­ÙŠØ© ÙˆØ§Ù„ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø·Ø¨ÙŠ ÙˆØ§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ø§Ù„Ø£Ù†Ø¸Ù…Ø© ÙˆØ§Ù„Ù„ÙˆØ§Ø¦Ø­ Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ù…Ø¹Ù…ÙˆÙ„ Ø¨Ù‡Ø§ØŒ ÙˆÙÙ‚Ù‹Ø§ Ù„Ù†Ø¸Ø§Ù… Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ© ÙˆØ§Ù„Ø£Ù†Ø¸Ù…Ø© Ø°Ø§Øª Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© ÙÙŠ Ø§Ù„Ù…Ù…Ù„ÙƒØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©.

ÙƒÙ…Ø§ Ø£Ù‚Ø± Ø¨Ø£Ù† Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© ØªÙ…Ø«Ù„ Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ø³ØªÙ†ÙŠØ±Ø© ÙˆØµØ§Ø¯Ø±Ø© Ø¨Ø¥Ø±Ø§Ø¯ØªÙŠ Ø§Ù„Ø­Ø±Ø© Ø¯ÙˆÙ† Ø£ÙŠ Ø¥ÙƒØ±Ø§Ù‡ Ø£Ùˆ Ø¶ØºØ·.`;

const FIXED_MAIN_EN = `I, the undersigned, hereby acknowledge that the treating physician and healthcare team have explained to me, in a clear and understandable manner, my medical condition and the nature of the proposed medical, surgical, diagnostic, or therapeutic procedure, including the purpose of the procedure, expected benefits, potential risks and complications, available treatment alternatives, and the possible consequences or complications that may arise from refusing or delaying treatment.

I further acknowledge that I have been given full opportunity to ask questions and discuss concerns regarding my condition and the proposed procedure, and that all my questions have been answered clearly and satisfactorily.

I understand that the practice of medicine and surgery involves inherent risks and potential complications, and that no absolute guarantee or assurance has been made regarding specific outcomes, despite adherence to recognized medical and professional standards.

I further understand that certain risks or complications may be common, uncommon, serious, or life-threatening depending on the nature of the procedure and my medical condition.

I also authorize the medical team to perform any additional or emergency procedures deemed medically necessary during or after the procedure in order to preserve my health and safety in accordance with accepted medical standards.

I acknowledge that the available anesthesia options â€” where applicable â€” together with their potential risks and complications have been explained to me.

I consent to the use and processing of my personal health information to the extent necessary for treatment, healthcare operations, medical documentation, and compliance with applicable healthcare laws and regulations, in accordance with the Personal Data Protection Law (PDPL) and related regulations of the Kingdom of Saudi Arabia.

I further acknowledge that this informed consent is given voluntarily and without coercion or undue pressure.`;

const PATIENT_ACK_AR = "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø±ÙŠØ¶ / ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±: Ø£Ù‚Ø± Ø¨Ø£Ù†Ù†ÙŠ Ù‚Ø±Ø£Øª ÙˆÙÙ‡Ù…Øª Ù…Ø¶Ù…ÙˆÙ† Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©ØŒ ÙˆØ£Ù† Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…ØªØ¹Ù„Ù‚Ø© Ø¨Ø­Ø§Ù„ØªÙŠ Ø§Ù„ØµØ­ÙŠØ© ÙˆØ§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­ Ù‚Ø¯ ØªÙ… Ø´Ø±Ø­Ù‡Ø§ Ù„ÙŠ Ø¨Ù„ØºØ© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©ØŒ ÙˆØ£Ù†Ù†ÙŠ ÙˆØ§ÙÙ‚Øª Ø¹Ù„Ù‰ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø¨Ø¹Ø¯ Ø§Ø·Ù„Ø§Ø¹ÙŠ Ø¹Ù„Ù‰ Ø§Ù„ÙÙˆØ§Ø¦Ø¯ ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„ ÙˆÙ…Ø®Ø§Ø·Ø± Ø§Ù„Ø±ÙØ¶.";
const PATIENT_ACK_EN = "Patient / Guardian Acknowledgment: I acknowledge that I have read and understood the contents of this consent form, and that the information regarding my medical condition and the proposed procedure has been explained to me in clear and understandable language. I consent to the procedure after being informed of the benefits, risks, complications, alternatives, and risks of refusal.";

const PHYSICIAN_CERT_AR = "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ø·Ø¨ÙŠØ¨: Ø£Ù‚Ø± Ø£Ù†Ø§ Ø§Ù„Ø·Ø¨ÙŠØ¨ / Ø§Ù„Ù…Ù…Ø§Ø±Ø³ Ø§Ù„ØµØ­ÙŠ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø£Ø¯Ù†Ø§Ù‡ Ø¨Ø£Ù†Ù†ÙŠ Ù‚Ù…Øª Ø¨Ø´Ø±Ø­ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨ÙŠØ© Ù„Ù„Ù…Ø±ÙŠØ¶ ÙˆØ·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­ ÙˆØ§Ù„ÙÙˆØ§Ø¦Ø¯ ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø© ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆÙ…Ø®Ø§Ø·Ø± Ø±ÙØ¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ Ù„Ù„Ù…Ø±ÙŠØ¶ Ø£Ùˆ Ù„Ù…Ù…Ø«Ù„Ù‡ Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠ Ø¨ØµÙˆØ±Ø© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©ØŒ ÙˆØ£Ø¬Ø¨Øª Ø¹Ù„Ù‰ ÙƒØ§ÙØ© Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø·Ø±ÙˆØ­Ø© ÙˆÙÙ‚Ù‹Ø§ Ù„Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…Ù‡Ù†ÙŠØ© ÙˆØ§Ù„Ø·Ø¨ÙŠØ© Ø§Ù„Ù…ØªØ¹Ø§Ø±Ù Ø¹Ù„ÙŠÙ‡Ø§.";
const PHYSICIAN_CERT_EN = "Physician Certification: I, the undersigned physician / healthcare practitioner, certify that I have explained to the patient or the patientâ€™s legal representative the medical condition, the nature of the proposed procedure, expected benefits, potential risks and complications, available treatment alternatives, and the risks of refusing treatment in a clear and understandable manner, and that I have answered all related questions in accordance with accepted medical and professional standards.";

const GUARDIAN_ACK_AR = "Ø¥Ù‚Ø±Ø§Ø± ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± / Ø§Ù„Ù…Ù…Ø«Ù„ Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠ: Ø£Ù‚Ø± Ø£Ù†Ø§ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø£Ø¯Ù†Ø§Ù‡ Ø¨ØµÙØªÙŠ ÙˆÙ„ÙŠÙ‹Ø§ Ø´Ø±Ø¹ÙŠÙ‹Ø§ / Ù…Ù…Ø«Ù„Ù‹Ø§ Ù†Ø¸Ø§Ù…ÙŠÙ‹Ø§ Ù„Ù„Ù…Ø±ÙŠØ¶ Ø¨Ø£Ù†Ù†ÙŠ Ù…Ø®ÙˆÙ„ Ù†Ø¸Ø§Ù…Ù‹Ø§ Ø¨Ø¥Ø¹Ø·Ø§Ø¡ Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ù†ÙŠØ§Ø¨Ø© Ø¹Ù†Ù‡ØŒ ÙˆØ£Ù†Ù‡ ØªÙ… Ø´Ø±Ø­ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨ÙŠØ© ÙˆØ§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­ ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ© Ù„ÙŠ Ø¨ØµÙˆØ±Ø© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©.";
const GUARDIAN_ACK_EN = "Legal Guardian / Substitute Decision Maker Acknowledgment: I, the undersigned, acting as the patientâ€™s legal guardian / authorized substitute decision maker, acknowledge that I am legally authorized to provide this consent on behalf of the patient, and that the medical condition, proposed procedure, risks, and treatment alternatives have been clearly explained to me.";

const INTERPRETER_ACK_AR = "Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ù…ØªØ±Ø¬Ù…: Ø£Ù‚Ø± Ø¨Ø£Ù† Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…ØªØ¹Ù„Ù‚Ø© Ø¨Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„ØµØ­ÙŠØ© ÙˆØ§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ù‚ØªØ±Ø­ Ù‚Ø¯ ØªÙ… Ø´Ø±Ø­Ù‡Ø§ Ù„Ù„Ù…Ø±ÙŠØ¶ / ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„ØªÙŠ ÙŠÙÙ‡Ù…Ù‡Ø§ØŒ ÙˆØ£Ù†Ù†ÙŠ Ù‚Ù…Øª Ø¨Ø§Ù„ØªØ±Ø¬Ù…Ø© Ø¨ØµÙˆØ±Ø© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©.";
const INTERPRETER_ACK_EN = "Interpreter Acknowledgment: I acknowledge that the information regarding the patientâ€™s medical condition and proposed procedure has been explained to the patient / guardian in a language they understand, and that I have provided interpretation clearly and appropriately.";

const NO_GUARANTEE_AR = "Ø¹Ø¯Ù… Ø¶Ù…Ø§Ù† Ø§Ù„Ù†ØªØ§Ø¦Ø¬: Ø£ÙÙ‡Ù… ÙˆØ£Ù‚Ø± Ø¨Ø£Ù†Ù‡ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¶Ù…Ø§Ù† Ø£Ùˆ Ø§Ù„ØªØ¹Ù‡Ø¯ Ø¨Ù†ØªØ§Ø¦Ø¬ Ù…Ø­Ø¯Ø¯Ø© Ù„Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø·Ø¨ÙŠ Ø£Ùˆ Ø§Ù„Ø¬Ø±Ø§Ø­ÙŠ Ø£Ùˆ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØŒ ÙˆØ£Ù† Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ù„Ù„Ø¹Ù„Ø§Ø¬ ØªØ®ØªÙ„Ù Ù…Ù† Ø´Ø®Øµ Ù„Ø¢Ø®Ø± Ø¨Ø­Ø³Ø¨ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„ØµØ­ÙŠØ© ÙˆØ§Ù„Ø¹ÙˆØ§Ù…Ù„ Ø§Ù„Ø·Ø¨ÙŠØ© Ø§Ù„Ù…Ø®ØªÙ„ÙØ©.";
const NO_GUARANTEE_EN = "No Guarantee of Outcome: I understand and acknowledge that no specific result or outcome can be guaranteed for the medical, surgical, or therapeutic procedure, and that treatment outcomes may vary depending on individual medical conditions and related factors.";

const ELECTRONIC_SIGNATURE_AR = "Ø§Ù„ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ: ÙŠÙØ¹Ø¯ Ø§Ù„ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø£Ùˆ Ø§Ù„ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø±Ø³Ù„ Ø¹Ø¨Ø± Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„Ø¢Ù…Ù† Ù…Ø¹ØªÙ…Ø¯Ù‹Ø§ ÙˆÙ…Ù„Ø²Ù…Ù‹Ø§ Ù†Ø¸Ø§Ù…Ù‹Ø§ØŒ ÙˆÙŠØªØ±ØªØ¨ Ø¹Ù„ÙŠÙ‡ Ø°Ø§Øª Ø§Ù„Ø£Ø«Ø± Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ù„Ù„ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ø®Ø·ÙŠØŒ ÙˆØ°Ù„Ùƒ ÙˆÙÙ‚Ù‹Ø§ Ù„Ù„Ø£Ù†Ø¸Ù…Ø© Ø§Ù„Ù…Ø¹Ù…ÙˆÙ„ Ø¨Ù‡Ø§ ÙÙŠ Ø§Ù„Ù…Ù…Ù„ÙƒØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©.";
const ELECTRONIC_SIGNATURE_EN = "Electronic Signature: Electronic signatures or signatures executed through a secure electronic link shall be considered legally valid and binding and shall have the same legal effect as handwritten signatures in accordance with the applicable laws and regulations of the Kingdom of Saudi Arabia.";

const PDPL_AR = "Ø£ÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ø§Ø³ØªØ®Ø¯Ø§Ù… ÙˆÙ…Ø¹Ø§Ù„Ø¬Ø© Ù…Ø¹Ù„ÙˆÙ…Ø§ØªÙŠ Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ø´Ø®ØµÙŠØ© Ø¨Ø§Ù„Ù‚Ø¯Ø± Ø§Ù„Ù„Ø§Ø²Ù… Ù„Ø£ØºØ±Ø§Ø¶ Ø§Ù„Ø¹Ù„Ø§Ø¬ ÙˆØ§Ù„Ø±Ø¹Ø§ÙŠØ© Ø§Ù„ØµØ­ÙŠØ© ÙˆØ§Ù„ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø·Ø¨ÙŠ ÙˆØ§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ø§Ù„Ø£Ù†Ø¸Ù…Ø© ÙˆØ§Ù„Ù„ÙˆØ§Ø¦Ø­ Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ù…Ø¹Ù…ÙˆÙ„ Ø¨Ù‡Ø§ØŒ ÙˆÙÙ‚Ù‹Ø§ Ù„Ù†Ø¸Ø§Ù… Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ© ÙˆØ§Ù„Ø£Ù†Ø¸Ù…Ø© Ø°Ø§Øª Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© ÙÙŠ Ø§Ù„Ù…Ù…Ù„ÙƒØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©.";
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
  const client = prisma();
  return withConsentTemplateSchemaRecovery(async () => {
    return listRuntimeConsentTemplatesWithClient(client, auth, filter);
  });
}
