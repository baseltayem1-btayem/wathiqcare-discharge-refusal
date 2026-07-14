import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { isMissingTableOrColumnError } from "@/lib/server/auth-reset";
import { createConsentDocument } from "@/lib/server/consent-document-create-service";
import { resolveRuntimeDatabaseUrl } from "@/lib/config/env-validation";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import { resolveApprovedConsentSource } from "@/lib/server/approved-consent-source";
import { ENABLE_IMC_PILOT_PATIENTS } from "@/lib/config/feature-flags";
import { imcPilotPatients } from "@/components/informed-consents/production-workspace/lib/pilot-patients";
import { imcApprovedConsentLibraryGenerated } from "@/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated";
import { listRuntimeConsentTemplates } from "@/lib/server/informed-consents-template-catalog";
import { validateIdempotencyKey } from "@/lib/server/idempotency-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_APPROVED_CONSENT_MESSAGE =
  "No approved consent form is linked to this procedure. Please link an approved consent form before sending.";

const CONSENT_SCHEMA_BOOTSTRAP_STATEMENTS = [
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentMethod') THEN
        CREATE TYPE "ConsentMethod" AS ENUM (
          'ELECTRONIC_SIGNATURE',
          'OTP',
          'WITNESS_ACKNOWLEDGMENT',
          'WRITTEN'
        );
      END IF;
    END $$;
  `,
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentTemplateStatus') THEN
        CREATE TYPE "ConsentTemplateStatus" AS ENUM (
          'DRAFT',
          'UNDER_REVIEW',
          'APPROVED',
          'ACTIVE',
          'RETIRED',
          'ARCHIVED'
        );
      END IF;
    END $$;
  `,
  `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname IN ('ConsentTemplateStatus', 'consenttemplatestatus')
      ) THEN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname IN ('ConsentTemplateStatus', 'consenttemplatestatus')
            AND e.enumlabel = 'UNDER_REVIEW'
        ) THEN
          ALTER TYPE "ConsentTemplateStatus" ADD VALUE 'UNDER_REVIEW';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname IN ('ConsentTemplateStatus', 'consenttemplatestatus')
            AND e.enumlabel = 'RETIRED'
        ) THEN
          ALTER TYPE "ConsentTemplateStatus" ADD VALUE 'RETIRED';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname IN ('ConsentTemplateStatus', 'consenttemplatestatus')
            AND e.enumlabel = 'ARCHIVED'
        ) THEN
          ALTER TYPE "ConsentTemplateStatus" ADD VALUE 'ARCHIVED';
        END IF;
      END IF;
    END $$;
  `,
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentDocumentStatus') THEN
        CREATE TYPE "ConsentDocumentStatus" AS ENUM (
          'DRAFT',
          'AI_DRAFT',
          'PHYSICIAN_REVIEW',
          'APPROVED',
          'READY_FOR_SIGNATURE',
          'SIGNED',
          'FINALIZED',
          'ARCHIVED',
          'VOID'
        );
      END IF;
    END $$;
  `,
  `
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
  `,
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentSignatureRole') THEN
        CREATE TYPE "ConsentSignatureRole" AS ENUM (
          'PATIENT',
          'PHYSICIAN',
          'WITNESS',
          'INTERPRETER',
          'GUARDIAN'
        );
      END IF;
    END $$;
  `,
  `
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_consent_categories_tenant_code UNIQUE (tenant_id, code)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_templates (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES consent_categories(id) ON DELETE SET NULL,
      template_code TEXT NOT NULL,
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_consent_templates_tenant_template_code UNIQUE (tenant_id, template_code)
    )
  `,
  `
    ALTER TABLE consent_templates
      ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
      ADD COLUMN IF NOT EXISTS requires_witness BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS requires_guardian BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS requires_interpreter BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS requires_separate_consent BOOLEAN NOT NULL DEFAULT FALSE
  `,
  `
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
      effective_from TIMESTAMPTZ,
      effective_to TIMESTAMPTZ,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_consent_template_versions_template_version UNIQUE (template_id, version_number)
    )
  `,
  `
    ALTER TABLE consent_template_versions
      ADD COLUMN IF NOT EXISTS legal_hash TEXT,
      ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN NOT NULL DEFAULT FALSE
  `,
  `
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_consent_template_sections_version_key UNIQUE (template_version_id, section_key)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_documents (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      template_id TEXT NOT NULL REFERENCES consent_templates(id) ON DELETE CASCADE,
      template_version_id TEXT NOT NULL REFERENCES consent_template_versions(id) ON DELETE RESTRICT,
      consent_reference TEXT NOT NULL,
      status "ConsentDocumentStatus" NOT NULL DEFAULT 'DRAFT',
      language TEXT NOT NULL DEFAULT 'bilingual',
      patient_name TEXT NOT NULL,
      mrn TEXT,
      dob TEXT,
      gender TEXT,
      physician_name TEXT NOT NULL,
      physician_license TEXT,
      physician_specialty TEXT NOT NULL,
      department TEXT,
      diagnosis TEXT,
      planned_procedure TEXT,
      admission_details TEXT,
      procedure_details TEXT,
      risks_ar TEXT,
      risks_en TEXT,
      side_effects_ar TEXT,
      side_effects_en TEXT,
      alternatives_ar TEXT,
      alternatives_en TEXT,
      refusal_risks_ar TEXT,
      refusal_risks_en TEXT,
      expected_outcomes_ar TEXT,
      expected_outcomes_en TEXT,
      physician_notes_ar TEXT,
      physician_notes_en TEXT,
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
      ai_generated_at TIMESTAMPTZ,
      ai_generated_by_user_id TEXT,
      ai_validated_at TIMESTAMPTZ,
      ai_validated_by_user_id TEXT,
      approved_at TIMESTAMPTZ,
      approved_by_user_id TEXT,
      finalized_at TIMESTAMPTZ,
      finalized_by_user_id TEXT,
      immutable_pdf_url TEXT,
      immutable_pdf_hash TEXT,
      qr_payload TEXT,
      document_version TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_consent_documents_tenant_reference UNIQUE (tenant_id, consent_reference)
    )
  `,
  `
    ALTER TABLE consent_documents
      ADD COLUMN IF NOT EXISTS audit_checksum TEXT,
      ADD COLUMN IF NOT EXISTS generated_by_model TEXT,
      ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS legal_hold_reason TEXT,
      ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_document_sections (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
      source_template_section_id TEXT,
      section_key TEXT NOT NULL,
      section_kind "ConsentSectionKind" NOT NULL,
      title_ar TEXT NOT NULL,
      title_en TEXT NOT NULL,
      content_ar TEXT NOT NULL,
      content_en TEXT NOT NULL,
      is_editable_by_physician BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 100,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_document_signatures (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
      role "ConsentSignatureRole" NOT NULL,
      signer_name TEXT NOT NULL,
      signer_id_number TEXT,
      signer_license TEXT,
      signature_method "ConsentMethod" NOT NULL,
      signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    ALTER TABLE consent_document_signatures
      ADD COLUMN IF NOT EXISTS signature_hash TEXT
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_audit_events (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      consent_document_id TEXT REFERENCES consent_documents(id) ON DELETE SET NULL,
      template_id TEXT REFERENCES consent_templates(id) ON DELETE SET NULL,
      template_version_id TEXT REFERENCES consent_template_versions(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      source TEXT,
      actor_user_id TEXT,
      actor_role TEXT,
      summary TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_timeline_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      actor_user_id TEXT,
      actor_role TEXT,
      device_info TEXT,
      ip_address TEXT,
      user_agent TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_templates_tenant_status_specialty
      ON consent_templates (tenant_id, status, specialty)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_template_sections_tenant_version_sort
      ON consent_template_sections (tenant_id, template_version_id, sort_order)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_documents_tenant_case_status_created
      ON consent_documents (tenant_id, case_id, status, created_at)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_document_sections_tenant_doc_sort
      ON consent_document_sections (tenant_id, consent_document_id, sort_order)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_audit_events_tenant_doc_created
      ON consent_audit_events (tenant_id, consent_document_id, created_at)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_timeline_events_doc_created
      ON consent_timeline_events (tenant_id, consent_document_id, created_at)
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_witness_requirements (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
      witness_index INT NOT NULL,
      required_role TEXT NOT NULL
        CHECK (required_role IN ('NURSING_REPRESENTATIVE','PATIENT_EXPERIENCE_REPRESENTATIVE')),
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','ASSIGNED','SIGNED','REVOKED')),
      policy_version TEXT NOT NULL,
      assigned_user_id TEXT,
      assigned_at TIMESTAMPTZ,
      idempotency_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_consent_witness_requirements_doc_index
        UNIQUE (tenant_id, consent_document_id, witness_index)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_witness_signatures (
      id TEXT NOT NULL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
      witness_requirement_id TEXT NOT NULL REFERENCES consent_witness_requirements(id) ON DELETE RESTRICT,
      witness_user_id TEXT NOT NULL,
      employee_id TEXT,
      witness_role TEXT NOT NULL
        CHECK (witness_role IN ('NURSING_REPRESENTATIVE','PATIENT_EXPERIENCE_REPRESENTATIVE')),
      department TEXT,
      attestation_version TEXT NOT NULL,
      signature_id TEXT NOT NULL,
      authentication_reference TEXT NOT NULL,
      signed_at TIMESTAMPTZ NOT NULL,
      signed_at_ksa TEXT NOT NULL,
      document_hash TEXT NOT NULL,
      ip_hash TEXT,
      user_agent_hash TEXT,
      audit_event_id TEXT,
      idempotency_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_consent_witness_signatures_tenant_idempotency
        UNIQUE (tenant_id, idempotency_key),
      CONSTRAINT uq_consent_witness_signatures_requirement
        UNIQUE (witness_requirement_id)
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_witness_requirements_doc
      ON consent_witness_requirements (tenant_id, consent_document_id, status)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_witness_signatures_doc
      ON consent_witness_signatures (tenant_id, consent_document_id)
  `,
];

let consentSchemaBootstrapPromise: Promise<void> | null = null;

async function ensureConsentOperationalSchema() {
  if (!consentSchemaBootstrapPromise) {
    consentSchemaBootstrapPromise = (async () => {
      const prisma = getPrisma();

      for (const statement of CONSENT_SCHEMA_BOOTSTRAP_STATEMENTS) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      consentSchemaBootstrapPromise = null;
      throw error;
    });
  }

  return consentSchemaBootstrapPromise;
}

function getSanitizedRuntimeDatabaseTarget() {
  const rawUrl = resolveRuntimeDatabaseUrl();

  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    return {
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\//, "") || null,
    };
  } catch {
    return { host: "unparseable", database: null };
  }
}

async function resolveOrMaterializeCase(args: {
  tenantId: string;
  caseId: string;
  authUserId: string;
}) {
  const prisma = getPrisma();

  const existing = await prisma.case.findFirst({
    where: { id: args.caseId, tenantId: args.tenantId },
    select: {
      id: true,
      patientName: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });

  if (existing) {
    return existing;
  }

  if (!ENABLE_IMC_PILOT_PATIENTS) {
    return null;
  }

  const normalizedCaseId = args.caseId.trim().toLowerCase();
  const pilot = imcPilotPatients.find(
    (item) =>
      item.pilotId.toLowerCase() === normalizedCaseId
      || item.visitNo.toLowerCase() === normalizedCaseId
      || item.encounterNo.toLowerCase() === normalizedCaseId
      || item.mrn.toLowerCase() === normalizedCaseId
      || item.urn.toLowerCase() === normalizedCaseId,
  );

  if (!pilot) {
    return null;
  }

  const matched = await prisma.case.findFirst({
    where: {
      tenantId: args.tenantId,
      OR: [
        { id: pilot.pilotId },
        { caseNumber: pilot.visitNo },
        { medicalRecordNo: pilot.mrn },
      ],
    },
    select: {
      id: true,
      patientName: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });

  if (matched) {
    return matched;
  }

  return prisma.case.create({
    data: {
      id: pilot.pilotId,
      tenantId: args.tenantId,
      caseNumber: pilot.visitNo,
      title: pilot.diagnosis || pilot.plannedSurgery || "IMC pilot consent case",
      workflowType: "informed-consents-preview-pilot",
      patientName: pilot.name,
      patientIdNumber: pilot.nationalId,
      medicalRecordNo: pilot.mrn,
      roomNumber: pilot.room || undefined,
      createdByUserId: args.authUserId,
      updatedByUserId: args.authUserId,
      metadata: {
        source: "pilot_materialized_case",
        pilotId: pilot.pilotId,
        urn: pilot.urn,
        encounterNo: pilot.encounterNo,
        admissionDate: pilot.admissionDate,
        visitDate: pilot.visitDate,
        dischargeDate: pilot.dischargeDate,
        department: pilot.department,
        physician: pilot.consultant,
        physicianSpecialty: pilot.department,
        diagnosis: pilot.diagnosis,
        plannedProcedure: pilot.plannedSurgery,
        mobileNumber: pilot.mobile,
        email: pilot.email,
        gender: pilot.gender,
        dateOfBirth: pilot.dateOfBirth,
        languagePreference: "bilingual",
        capacityStatus: "competent",
      },
    },
    select: {
      id: true,
      patientName: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });
}

function getCompatibilityTemplateCodes(formType: string): string[] {
  switch (formType) {
    case "ANESTHESIA_CONSENT":
      return ["ANESTHESIA_CONSENT", "SURGICAL_PROCEDURE_CONSENT"];
    case "BLOOD_TRANSFUSION_CONSENT":
      return ["BLOOD_AND_PRODUCTS_TRANSFUSION_CONSENT", "BLOOD_TRANSFUSION_CONSENT", "SURGICAL_PROCEDURE_CONSENT"];
    case "HIGH_RISK_PROCEDURE_CONSENT":
      return ["HIGH_RISK_MEDICAL_PROCEDURE_CONSENT", "SURGICAL_PROCEDURE_CONSENT"];
    case "RESEARCH_CLINICAL_TRIAL_CONSENT":
      return ["RESEARCH_PARTICIPATION_CONSENT", "SURGICAL_PROCEDURE_CONSENT"];
    case "PROCEDURE_CONSENT":
    default:
      return ["SURGICAL_PROCEDURE_CONSENT", "GENERAL_TREATMENT_CONSENT"];
  }
}

async function resolveCompatibilityTemplate(args: {
  tenantId: string;
  formType: string;
  requiresWitness: boolean;
  requiresInterpreter: boolean;
}) {
  const prisma = getPrisma();
  const fallbackTemplates: Array<{
    id: string;
    templateCode: string;
    status: string;
    currentVersionId: string | null;
    requiresWitness: boolean;
    requiresInterpreter: boolean;
  }> = [];

  for (const templateCode of getCompatibilityTemplateCodes(args.formType)) {
    const template = await prisma.consentTemplate.findFirst({
      where: {
        tenantId: args.tenantId,
        status: { in: ["APPROVED", "ACTIVE"] },
        currentVersionId: { not: null },
        templateCode,
      },
      select: {
        id: true,
        templateCode: true,
        status: true,
        currentVersionId: true,
        requiresWitness: true,
        requiresInterpreter: true,
      },
    });

    if (template?.currentVersionId) {
      fallbackTemplates.push(template);
      if (
        template.requiresWitness === args.requiresWitness
        && template.requiresInterpreter === args.requiresInterpreter
      ) {
        return template;
      }
    }
  }

  return fallbackTemplates.find(
    (template) => !template.requiresWitness && !template.requiresInterpreter,
  ) || fallbackTemplates[0] || null;
}


function normalizeApprovedLibraryValue(
  value: unknown,
): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function readApprovedLibraryString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];

  return typeof value === "string"
    ? value.trim()
    : "";
}

function readApprovedLibraryBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return record[key] === true;
}

function parseApprovedLibraryDate(
  ...values: unknown[]
): Date {
  for (const value of values) {
    if (
      typeof value !== "string"
      || !value.trim()
    ) {
      continue;
    }

    const parsed =
      new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function buildApprovedLibraryPdfPath(
  record: Record<string, unknown>,
): string {
  const configuredPath =
    readApprovedLibraryString(
      record,
      "pdfUrl",
    )
    || readApprovedLibraryString(
      record,
      "pdfTemplateUrl",
    );

  const slugSource =
    readApprovedLibraryString(
      record,
      "slug",
    )
    || readApprovedLibraryString(
      record,
      "id",
    );

  const normalizedSlug =
    slugSource
      .replace(
        /^imc-approved-/i,
        "",
      )
      .replace(
        /\.pdf$/i,
        "",
      )
      .trim()
      .toLowerCase();

  const fileName =
    readApprovedLibraryString(
      record,
      "hospitalPdfFilename",
    )
    || readApprovedLibraryString(
      record,
      "sourceFile",
    );

  const normalizedFileName =
    fileName
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean)
      .pop()
    || fileName;

  const candidatePaths =
    [
      normalizedSlug
        ? (
          "/approved-consent-forms/"
          + encodeURIComponent(
            normalizedSlug,
          )
          + ".pdf"
        )
        : "",

      configuredPath.startsWith("/")
        ? configuredPath
        : "",

      normalizedFileName
        ? (
          "/approved-consent-forms/"
          + encodeURIComponent(
            normalizedFileName,
          )
        )
        : "",

      normalizedFileName
        ? (
          "/approved-consent-forms/"
          + encodeURIComponent(
            normalizedFileName.toLowerCase(),
          )
        )
        : "",
    ]
      .filter(
        (
          value,
          index,
          values,
        ) =>
          Boolean(value)
          && values.indexOf(value) === index,
      );

  return (
    candidatePaths.find(
      (candidatePath) =>
        resolveApprovedConsentSource(
          candidatePath,
        ).available,
    )
    || ""
  );
}

function resolveApprovedLibraryItem(
  identifier: string,
) {
  const normalizedIdentifier =
    normalizeApprovedLibraryValue(
      identifier,
    );

  if (!normalizedIdentifier) {
    return null;
  }

  return (
    imcApprovedConsentLibraryGenerated.find(
      (item) =>
        normalizeApprovedLibraryValue(
          item.id,
        ) === normalizedIdentifier,
    )
    || imcApprovedConsentLibraryGenerated.find(
      (item) => {
        const record =
          item as unknown as Record<
            string,
            unknown
          >;

        return (
          normalizeApprovedLibraryValue(
            record.slug,
          ) === normalizedIdentifier
        );
      },
    )
    || null
  );
}

function resolveApprovedLibraryFormType(
  record: Record<string, unknown>,
): string {
  const value =
    readApprovedLibraryString(
      record,
      "consentType",
    ).toUpperCase();

  const allowed =
    new Set([
      "PROCEDURE_CONSENT",
      "ANESTHESIA_CONSENT",
      "BLOOD_TRANSFUSION_CONSENT",
      "DIAGNOSTIC_IMAGING_CONSENT",
      "RESEARCH_CLINICAL_TRIAL_CONSENT",
    ]);

  return allowed.has(value)
    ? value
    : "PROCEDURE_CONSENT";
}

async function materializeApprovedLibraryConsentForm(
  args: {
    tenantId: string;
    approvedConsentIdentifier: string;
    actorUserId: string;
  },
) {
  const item =
    resolveApprovedLibraryItem(
      args.approvedConsentIdentifier,
    );

  if (!item) {
    return null;
  }

  const record =
    item as unknown as Record<
      string,
      unknown
    >;

  const approvalStatus =
    readApprovedLibraryString(
      record,
      "approvalStatus",
    ).toLowerCase();

  if (
    approvalStatus
    && approvalStatus !== "approved"
    && approvalStatus !== "active"
  ) {
    throw new ApiError(
      409,
      NO_APPROVED_CONSENT_MESSAGE,
    );
  }

  const pdfTemplateUrl =
    buildApprovedLibraryPdfPath(
      record,
    );

  const sourceInfo =
    resolveApprovedConsentSource(
      pdfTemplateUrl,
    );

  if (
    !pdfTemplateUrl
    || !sourceInfo.available
  ) {
    throw new ApiError(
      409,
      NO_APPROVED_CONSENT_MESSAGE,
    );
  }

  const version =
    readApprovedLibraryString(
      record,
      "version",
    )
    || "1.0";

  const effectiveDate =
    parseApprovedLibraryDate(
      record.clinicalApprovalDate,
      record.legalApprovalDate,
      record.effectiveDate,
    );

  const formType =
    resolveApprovedLibraryFormType(
      record,
    );

  const titleEn =
    String(item.titleEn || "").trim()
    || args.approvedConsentIdentifier;

  const titleAr =
    String(item.titleAr || "").trim()
    || titleEn;

  const governanceSnapshot = {
    source:
      "imc-approved-library",

    sourcePath:
      pdfTemplateUrl,

    sourceAvailable:
      sourceInfo.available,

    sourceKind:
      sourceInfo.sourceKind,

    approvalStatus:
      approvalStatus || "approved",

    legalApprovalDate:
      readApprovedLibraryString(
        record,
        "legalApprovalDate",
      )
      || null,

    clinicalApprovalDate:
      readApprovedLibraryString(
        record,
        "clinicalApprovalDate",
      )
      || null,

    governanceOwner:
      readApprovedLibraryString(
        record,
        "governanceOwner",
      )
      || "IMC Consent Governance",

    sourceFile:
      readApprovedLibraryString(
        record,
        "sourceFile",
      )
      || readApprovedLibraryString(
        record,
        "hospitalPdfFilename",
      )
      || null,

    checksum:
      readApprovedLibraryString(
        record,
        "checksum",
      )
      || null,

    materializedFrom:
      "generated-imc-approved-library",

    previewPilotMaterialization:
      true,

    materializedAt:
      new Date().toISOString(),
  };

  const prisma =
    getPrisma();

  return prisma.consentForm.upsert({
    where: {
      tenantId_code_version: {
        tenantId:
          args.tenantId,

        code:
          item.id,

        version,
      },
    },

    update: {
      titleEn,
      titleAr,

      formType:
        formType as never,

      status:
        "PUBLISHED",

      effectiveDate,

      governanceSnapshot,

      pdfTemplateUrl,

      requiresWitness:
        readApprovedLibraryBoolean(
          record,
          "requiresWitness",
        ),

      requiresInterpreter:
        readApprovedLibraryBoolean(
          record,
          "requiresInterpreter",
        ),

      publishedByUserId:
        args.actorUserId,
    },

    create: {
      tenantId:
        args.tenantId,

      code:
        item.id,

      titleEn,
      titleAr,

      formType:
        formType as never,

      status:
        "PUBLISHED",

      version,

      effectiveDate,

      governanceSnapshot,

      pdfTemplateUrl,

      requiresWitness:
        readApprovedLibraryBoolean(
          record,
          "requiresWitness",
        ),

      requiresInterpreter:
        readApprovedLibraryBoolean(
          record,
          "requiresInterpreter",
        ),

      createdByUserId:
        args.actorUserId,

      publishedByUserId:
        args.actorUserId,
    },

    select: {
      id: true,
      code: true,
      titleEn: true,
      titleAr: true,
      formType: true,
      requiresWitness: true,
      requiresInterpreter: true,
      status: true,
      version: true,
      effectiveDate: true,
      governanceSnapshot: true,
      pdfTemplateUrl: true,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const caseId = String(body.caseId || "").trim();
  const templateId = String(body.templateId || "").trim();
  const language = body.language === "ar" || body.language === "en" ? (body.language as "ar" | "en") : "bilingual";

  if (!caseId) {
    return NextResponse.json({ ok: false, error: "caseId is required" }, { status: 400 });
  }

  let idempotencyKey: string | undefined;
  try {
    const header = request.headers.get("Idempotency-Key")?.trim();
    const fromBody = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined;
    idempotencyKey = header || fromBody;
    if (idempotencyKey) validateIdempotencyKey(idempotencyKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
    await ensureConsentOperationalSchema();

    const requestMetadata = body.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : {};
    const approvedConsentFormId = String(body.approvedConsentFormId || requestMetadata.approvedConsentFormId || templateId || "").trim();

    const rawInitialStatus = String(body.initialStatus || "").trim().toUpperCase();
    const initialStatus = rawInitialStatus === "READY_FOR_SIGNATURE" ? "READY_FOR_SIGNATURE" : "DRAFT";

    if (!approvedConsentFormId) {
      return NextResponse.json({ ok: false, error: NO_APPROVED_CONSENT_MESSAGE }, { status: 409 });
    }

    let approvedConsentForm = await prisma.consentForm.findFirst({
      where: {
        tenantId,
        status: "PUBLISHED",
        OR: [
          { id: approvedConsentFormId },
          { code: { equals: approvedConsentFormId, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        titleEn: true,
        titleAr: true,
        formType: true,
        requiresWitness: true,
        requiresInterpreter: true,
        status: true,
        version: true,
        effectiveDate: true,
        governanceSnapshot: true,
        pdfTemplateUrl: true,
      },
    });

    const approvedLibraryIdentifier =
      String(
        requestMetadata.approvedLibraryItemId
        || requestMetadata.expectedFormCode
        || approvedConsentFormId,
      ).trim();

    const pilotLibraryMaterializationAllowed =
      process.env.VERCEL_ENV === "preview"
      && ENABLE_IMC_PILOT_PATIENTS
      && requestMetadata.testOnly === true
      && requestMetadata.nonClinicalTest === true
      && requestMetadata.secureSigningBlocked === true
      && requestMetadata.patientMessagingBlocked === true;

    if (
      !approvedConsentForm
      && pilotLibraryMaterializationAllowed
    ) {
      await listRuntimeConsentTemplates(
        auth,
        {},
      );

      approvedConsentForm =
        await materializeApprovedLibraryConsentForm({
          tenantId,

          approvedConsentIdentifier:
            approvedLibraryIdentifier,

          actorUserId:
            auth.sub
            || auth.email
            || "preview-pilot-system",
        });
    }

    if (!approvedConsentForm) {
      return NextResponse.json({ ok: false, error: NO_APPROVED_CONSENT_MESSAGE }, { status: 409 });
    }

    const governanceSnapshot = (approvedConsentForm.governanceSnapshot || {}) as Record<string, unknown>;

    let approvedConsentPdfTemplateUrl =
      approvedConsentForm.pdfTemplateUrl;

    let sourceInfo =
      resolveApprovedConsentSource(
        approvedConsentPdfTemplateUrl,
      );

    if (
      !sourceInfo.available
      && pilotLibraryMaterializationAllowed
    ) {
      const approvedLibraryItem =
        resolveApprovedLibraryItem(
          approvedLibraryIdentifier,
        );

      if (approvedLibraryItem) {
        const resolvedPilotPdfPath =
          buildApprovedLibraryPdfPath(
            approvedLibraryItem as unknown as Record<
              string,
              unknown
            >,
          );

        const resolvedPilotSourceInfo =
          resolveApprovedConsentSource(
            resolvedPilotPdfPath,
          );

        if (
          resolvedPilotPdfPath
          && resolvedPilotSourceInfo.available
        ) {
          approvedConsentPdfTemplateUrl =
            resolvedPilotPdfPath;

          sourceInfo =
            resolvedPilotSourceInfo;
        }
      }
    }

    if (
      governanceSnapshot.source
        !== "imc-approved-library"
      || !sourceInfo.available
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: NO_APPROVED_CONSENT_MESSAGE,
        },
        {
          status: 409,
        },
      );
    }

    const template = await resolveCompatibilityTemplate({
      tenantId,
      formType: approvedConsentForm.formType,
      requiresWitness: approvedConsentForm.requiresWitness,
      requiresInterpreter: approvedConsentForm.requiresInterpreter,
    });

    if (!template || !template.currentVersionId) {
      return NextResponse.json({ ok: false, error: NO_APPROVED_CONSENT_MESSAGE }, { status: 409 });
    }

    const templateVersion = await prisma.consentTemplateVersion.findFirst({
      where: {
        tenantId,
        id: template.currentVersionId,
        templateId: template.id,
      },
      select: {
        id: true,
        versionLabel: true,
        approvedAt: true,
        effectiveFrom: true,
        legalHash: true,
      },
    });

    if (!templateVersion) {
      return NextResponse.json({ ok: false, error: NO_APPROVED_CONSENT_MESSAGE }, { status: 409 });
    }

    // Verify the case belongs to the tenant, or materialize the enabled pilot fallback
    // record into a real preview tenant case so downstream signing routes can bind to it.
    const caseRecord = await resolveOrMaterializeCase({
      tenantId,
      caseId,
      authUserId: auth.sub,
    });
    if (!caseRecord) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const metadata = (caseRecord.metadata || {}) as Record<string, unknown>;
    const plannedProcedure =
      typeof body.plannedProcedure === "string" && body.plannedProcedure.trim()
        ? body.plannedProcedure.trim()
        : approvedConsentForm.titleEn
          ? approvedConsentForm.titleEn
        : typeof metadata.plannedProcedure === "string"
          ? metadata.plannedProcedure
          : null;
    const diagnosis =
      typeof body.diagnosis === "string" && body.diagnosis.trim()
        ? body.diagnosis.trim()
        : typeof metadata.diagnosis === "string"
          ? metadata.diagnosis
          : null;

    const document = await createConsentDocument(auth, {
      caseId,
      templateId: template.id,
      templateVersionId: template.currentVersionId || undefined,
      language,
      physicianName: typeof body.physicianName === "string" ? body.physicianName.trim() : auth.email || undefined,
      physicianLicense: typeof body.physicianLicense === "string" ? body.physicianLicense.trim() : undefined,
      physicianSpecialty: typeof body.physicianSpecialty === "string" ? body.physicianSpecialty.trim() : undefined,
      department: typeof body.department === "string" ? body.department.trim() : undefined,
      diagnosis: diagnosis || undefined,
      plannedProcedure: plannedProcedure || undefined,
      dob: typeof body.dob === "string" ? body.dob.trim() : undefined,
      gender: typeof body.gender === "string" ? body.gender.trim() : undefined,
      idempotencyKey,
      idempotencyFingerprint:
        typeof body.idempotencyFingerprint === "string"
          ? body.idempotencyFingerprint.trim()
          : undefined,
      initialStatus,
      metadata: {
        ...requestMetadata,

        source: "production-physician-workspace",
        approvedConsentFormId: approvedConsentForm.id,
        clinicalConsentFormId: approvedConsentForm.id,
        approvedConsentFormCode: approvedConsentForm.code,
        clinicalConsentFormCode: approvedConsentForm.code,
        approvedConsentFormTitleEn: approvedConsentForm.titleEn,
        approvedConsentFormTitleAr: approvedConsentForm.titleAr,
        approvedConsentFormVersion: approvedConsentForm.version,
        approvedConsentFormEffectiveDate: approvedConsentForm.effectiveDate?.toISOString() || null,
        approvedConsentSourceAvailable: sourceInfo.available,
        approvedConsentSourceKind: sourceInfo.sourceKind,
        pdfTemplateUrl:
          approvedConsentPdfTemplateUrl,

        sourcePath:
          approvedConsentPdfTemplateUrl,
        governanceSnapshot,
        templateId: template.id,
        templateVersionId: templateVersion.id,
        templateCode: template.templateCode,
        approvalStatus: template.status,
        effectiveDate: templateVersion.effectiveFrom?.toISOString() || templateVersion.approvedAt?.toISOString() || null,
        checksumHash: templateVersion.legalHash || null,
        assemblyTemplateId: String(body.templateId || ""),
        compatibilityTemplateId: template.id,
        compatibilityTemplateCode: template.templateCode,
        selectedBy: auth.sub || auth.email || null,
        selectedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      document: {
        id: document.id,
        consentReference: document.consentReference,
        status: document.status,
        patientName: document.patientName,
        mrn: document.mrn,
      },
    });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : String(error);
    if (isMissingTableOrColumnError(error)) {
      consentSchemaBootstrapPromise = null;
    }
    console.error("INFORMED_CONSENT_DOCUMENT_CREATE_FAILED", {
      tenantId,
      caseId,
      templateId,
      runtimeDbTarget: getSanitizedRuntimeDatabaseTarget(),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: message,
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const tenantId = auth.tenant_id || "";

    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "Missing tenant context" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);

    const requestedLimit = Number(
      searchParams.get("limit") || "25",
    );

    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
      : 25;

    const prisma = getPrisma();

    const documents = await prisma.consentDocument.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        consentReference: true,
        status: true,
        patientName: true,
        mrn: true,
        createdAt: true,
        case: {
          select: {
            caseNumber: true,
            medicalRecordNo: true,
            patientName: true,
          },
        },
        template: {
          select: {
            titleAr: true,
            titleEn: true,
            consentType: true,
          },
        },
      },
    });

    return NextResponse.json(documents);
  } catch (error: unknown) {
    const errorStatus =
      typeof error === "object" &&
      error !== null &&
      "status" in error
        ? Number(
            (error as { status?: unknown }).status,
          )
        : 500;

    if (errorStatus === 401) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 },
      );
    }

    if (errorStatus === 403) {
      return NextResponse.json(
        {
          ok: false,
          error: "Forbidden",
          code: "INSUFFICIENT_ACCESS",
        },
        { status: 403 },
      );
    }

    console.error(
      "[informed-consents/documents] GET failed",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to load consent documents",
        code: "DOCUMENT_LIST_FAILED",
      },
      { status: 500 },
    );
  }
}
