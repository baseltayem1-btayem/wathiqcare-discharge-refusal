-- Clinical Knowledge Engine MVP — Additive Migration
-- Creates tenant-scoped, versioned, governed clinical knowledge tables.
-- No existing tables are modified or dropped.

-- ── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "ClinicalKnowledgeStatus" AS ENUM (
  'DRAFT',
  'UNDER_REVIEW',
  'MEDICALLY_APPROVED',
  'LEGALLY_APPROVED',
  'PUBLISHED',
  'SUPERSEDED',
  'ARCHIVED',
  'REJECTED'
);

CREATE TYPE "ClinicalKnowledgePackageItemType" AS ENUM (
  'CONSENT_FORM',
  'EDUCATION_MATERIAL',
  'RISK_DISCLOSURE',
  'DECISION_RULE'
);

CREATE TYPE "ClinicalKnowledgeConsentFormType" AS ENUM (
  'PROCEDURE_CONSENT',
  'ANESTHESIA_CONSENT',
  'BLOOD_TRANSFUSION_CONSENT',
  'HIGH_RISK_PROCEDURE_CONSENT',
  'DIAGNOSTIC_IMAGING_CONSENT',
  'RESEARCH_CLINICAL_TRIAL_CONSENT',
  'TELEMEDICINE_CONSENT',
  'VACCINATION_CONSENT'
);

CREATE TYPE "ClinicalKnowledgeRiskLevel" AS ENUM (
  'STANDARD',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "ClinicalKnowledgeEducationAssetType" AS ENUM (
  'PDF',
  'VIDEO',
  'INTERACTIVE',
  'TEXT'
);

CREATE TYPE "ClinicalKnowledgeDecisionRuleStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'INACTIVE'
);

CREATE TYPE "ClinicalKnowledgeParticipantType" AS ENUM (
  'WITNESS',
  'INTERPRETER',
  'GUARDIAN',
  'ANESTHESIOLOGIST',
  'SECOND_PHYSICIAN'
);

CREATE TYPE "ClinicalKnowledgeGovernanceEntityType" AS ENUM (
  'PROCEDURE',
  'PACKAGE',
  'FORM',
  'EDUCATION',
  'RISK',
  'RULE'
);

CREATE TYPE "ClinicalKnowledgeGovernanceEventType" AS ENUM (
  'CREATED',
  'SUBMITTED_FOR_REVIEW',
  'MEDICALLY_APPROVED',
  'LEGALLY_APPROVED',
  'PUBLISHED',
  'SUPERSEDED',
  'ARCHIVED',
  'REJECTED',
  'MODIFIED'
);

-- ── Clinical Specialty ──────────────────────────────────────────────────────

CREATE TABLE "clinical_specialties" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"  TEXT NOT NULL,
  "code"       TEXT NOT NULL,
  "name_en"    TEXT NOT NULL,
  "name_ar"    TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_specialties_tenant_code_unique" UNIQUE ("tenant_id", "code"),
  CONSTRAINT "clinical_specialties_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_clinical_specialties_tenant_status" ON "clinical_specialties"("tenant_id", "status");

-- ── Clinical Procedure ──────────────────────────────────────────────────────

CREATE TABLE "clinical_procedures" (
  "id"                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"                TEXT NOT NULL,
  "code"                     TEXT NOT NULL,
  "name_en"                  TEXT NOT NULL,
  "name_ar"                  TEXT NOT NULL,
  "short_name_en"            TEXT,
  "short_name_ar"            TEXT,
  "specialty_id"             TEXT NOT NULL,
  "department_name"          TEXT NOT NULL,
  "category_code"            TEXT NOT NULL,
  "typical_duration_minutes" INTEGER,
  "anesthesia_required"      BOOLEAN NOT NULL DEFAULT FALSE,
  "keywords"                 TEXT[] NOT NULL DEFAULT '{}',
  "external_mappings"        JSONB,
  "status"                   TEXT NOT NULL DEFAULT 'draft',
  "created_at"               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_procedures_tenant_code_unique" UNIQUE ("tenant_id", "code"),
  CONSTRAINT "clinical_procedures_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "clinical_procedures_specialty_fk" FOREIGN KEY ("specialty_id") REFERENCES "clinical_specialties"("id") ON DELETE RESTRICT
);

CREATE INDEX "idx_clinical_procedures_tenant_status" ON "clinical_procedures"("tenant_id", "status");
CREATE INDEX "idx_clinical_procedures_tenant_specialty" ON "clinical_procedures"("tenant_id", "specialty_id");

-- ── Clinical Knowledge Package ───────────────────────────────────────────────

CREATE TABLE "clinical_knowledge_packages" (
  "id"                            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"                     TEXT NOT NULL,
  "procedure_id"                  TEXT NOT NULL,
  "version"                       TEXT NOT NULL,
  "version_major"                 INTEGER NOT NULL,
  "version_minor"                 INTEGER NOT NULL,
  "version_patch"                 INTEGER NOT NULL,
  "effective_date"                TIMESTAMP NOT NULL,
  "expiry_date"                   TIMESTAMP,
  "status"                        "ClinicalKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "governance_snapshot"           JSONB,
  "required_participants_snapshot" JSONB,
  "package_snapshot"              JSONB,
  "superseded_by_package_id"      TEXT,
  "created_by_user_id"            TEXT NOT NULL,
  "published_by_user_id"          TEXT,
  "created_at"                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_knowledge_packages_tenant_procedure_version_unique" UNIQUE ("tenant_id", "procedure_id", "version"),
  CONSTRAINT "clinical_knowledge_packages_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "clinical_knowledge_packages_procedure_fk" FOREIGN KEY ("procedure_id") REFERENCES "clinical_procedures"("id") ON DELETE RESTRICT
);

CREATE INDEX "idx_clinical_knowledge_packages_tenant_procedure_status" ON "clinical_knowledge_packages"("tenant_id", "procedure_id", "status");
CREATE INDEX "idx_clinical_knowledge_packages_tenant_status_dates" ON "clinical_knowledge_packages"("tenant_id", "status", "effective_date", "expiry_date");

-- ── Package Item ────────────────────────────────────────────────────────────

CREATE TABLE "clinical_package_items" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"         TEXT NOT NULL,
  "package_id"        TEXT NOT NULL,
  "item_type"         "ClinicalKnowledgePackageItemType" NOT NULL,
  "item_id"           TEXT NOT NULL,
  "order_index"       INTEGER NOT NULL,
  "is_required"       BOOLEAN NOT NULL DEFAULT TRUE,
  "package_overrides" JSONB,
  CONSTRAINT "clinical_package_items_package_fk" FOREIGN KEY ("package_id") REFERENCES "clinical_knowledge_packages"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_clinical_package_items_tenant_package" ON "clinical_package_items"("tenant_id", "package_id");
CREATE INDEX "idx_clinical_package_items_tenant_type_item" ON "clinical_package_items"("tenant_id", "item_type", "item_id");

-- ── Consent Form ────────────────────────────────────────────────────────────

CREATE TABLE "clinical_consent_forms" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"            TEXT NOT NULL,
  "code"                 TEXT NOT NULL,
  "title_en"             TEXT NOT NULL,
  "title_ar"             TEXT NOT NULL,
  "form_type"            "ClinicalKnowledgeConsentFormType" NOT NULL,
  "risk_level"           "ClinicalKnowledgeRiskLevel" NOT NULL DEFAULT 'STANDARD',
  "status"               "ClinicalKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "version"              TEXT NOT NULL,
  "effective_date"       TIMESTAMP NOT NULL,
  "expiry_date"          TIMESTAMP,
  "governance_snapshot"  JSONB,
  "pdf_template_url"     TEXT,
  "requires_witness"     BOOLEAN NOT NULL DEFAULT FALSE,
  "requires_interpreter" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_by_user_id"   TEXT NOT NULL,
  "published_by_user_id" TEXT,
  "created_at"           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_consent_forms_tenant_code_version_unique" UNIQUE ("tenant_id", "code", "version"),
  CONSTRAINT "clinical_consent_forms_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_clinical_consent_forms_tenant_status" ON "clinical_consent_forms"("tenant_id", "status");
CREATE INDEX "idx_clinical_consent_forms_tenant_type_status" ON "clinical_consent_forms"("tenant_id", "form_type", "status");

-- ── Consent Form Section ────────────────────────────────────────────────────

CREATE TABLE "clinical_consent_form_sections" (
  "id"                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"              TEXT NOT NULL,
  "form_id"                TEXT NOT NULL,
  "type"                   TEXT NOT NULL,
  "order_index"            INTEGER NOT NULL,
  "title_en"               TEXT,
  "title_ar"               TEXT,
  "content_en"             TEXT,
  "content_ar"             TEXT,
  "is_required"            BOOLEAN NOT NULL DEFAULT TRUE,
  "is_editable_by_physician" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "clinical_consent_form_sections_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "clinical_consent_form_sections_form_fk" FOREIGN KEY ("form_id") REFERENCES "clinical_consent_forms"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_clinical_consent_form_sections_tenant_form_order" ON "clinical_consent_form_sections"("tenant_id", "form_id", "order_index");

-- ── Education Material ──────────────────────────────────────────────────────

CREATE TABLE "clinical_education_materials" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"          TEXT NOT NULL,
  "code"               TEXT NOT NULL,
  "title_en"           TEXT NOT NULL,
  "title_ar"           TEXT NOT NULL,
  "asset_type"         "ClinicalKnowledgeEducationAssetType" NOT NULL,
  "asset_url"          TEXT NOT NULL,
  "duration_minutes"   INTEGER,
  "status"             "ClinicalKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "version"            TEXT NOT NULL,
  "effective_date"     TIMESTAMP NOT NULL,
  "expiry_date"        TIMESTAMP,
  "governance_snapshot" JSONB,
  "created_by_user_id" TEXT NOT NULL,
  "published_by_user_id" TEXT,
  "created_at"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_education_materials_tenant_code_version_unique" UNIQUE ("tenant_id", "code", "version"),
  CONSTRAINT "clinical_education_materials_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_clinical_education_materials_tenant_status" ON "clinical_education_materials"("tenant_id", "status");

-- ── Risk Disclosure ─────────────────────────────────────────────────────────

CREATE TABLE "clinical_risk_disclosures" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"          TEXT NOT NULL,
  "code"               TEXT NOT NULL,
  "title_en"           TEXT NOT NULL,
  "title_ar"           TEXT NOT NULL,
  "description_en"     TEXT,
  "description_ar"     TEXT,
  "risk_level"         "ClinicalKnowledgeRiskLevel" NOT NULL DEFAULT 'STANDARD',
  "incidence_rate"     TEXT,
  "specialty_ids"      TEXT[] NOT NULL DEFAULT '{}',
  "status"             "ClinicalKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "version"            TEXT NOT NULL,
  "effective_date"     TIMESTAMP NOT NULL,
  "expiry_date"        TIMESTAMP,
  "governance_snapshot" JSONB,
  "created_by_user_id" TEXT NOT NULL,
  "published_by_user_id" TEXT,
  "created_at"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_risk_disclosures_tenant_code_version_unique" UNIQUE ("tenant_id", "code", "version"),
  CONSTRAINT "clinical_risk_disclosures_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_clinical_risk_disclosures_tenant_status" ON "clinical_risk_disclosures"("tenant_id", "status");

-- ── Decision Rule ───────────────────────────────────────────────────────────

CREATE TABLE "clinical_decision_rules" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"          TEXT NOT NULL,
  "code"               TEXT NOT NULL,
  "name_en"            TEXT NOT NULL,
  "name_ar"            TEXT NOT NULL,
  "description"        TEXT,
  "priority"           INTEGER NOT NULL DEFAULT 0,
  "condition"          JSONB NOT NULL,
  "action"             JSONB NOT NULL,
  "status"             "ClinicalKnowledgeDecisionRuleStatus" NOT NULL DEFAULT 'DRAFT',
  "effective_date"     TIMESTAMP NOT NULL,
  "expiry_date"        TIMESTAMP,
  "created_by_user_id" TEXT NOT NULL,
  "approved_by_user_id" TEXT,
  "created_at"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_decision_rules_tenant_code_unique" UNIQUE ("tenant_id", "code"),
  CONSTRAINT "clinical_decision_rules_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_clinical_decision_rules_tenant_status" ON "clinical_decision_rules"("tenant_id", "status");

-- ── Governance Event ────────────────────────────────────────────────────────

CREATE TABLE "clinical_governance_events" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"     TEXT NOT NULL,
  "entity_type"   "ClinicalKnowledgeGovernanceEntityType" NOT NULL,
  "entity_id"     TEXT NOT NULL,
  "event_type"    "ClinicalKnowledgeGovernanceEventType" NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "actor_role"    TEXT NOT NULL,
  "comment"       TEXT,
  "metadata"      JSONB,
  "previous_hash" TEXT,
  "event_hash"    TEXT NOT NULL,
  "created_at"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_governance_events_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_clinical_governance_events_tenant_entity" ON "clinical_governance_events"("tenant_id", "entity_type", "entity_id");
CREATE INDEX "idx_clinical_governance_events_tenant_entity_created" ON "clinical_governance_events"("tenant_id", "entity_type", "entity_id", "created_at");

-- ── Trigger for updated_at ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clinical_specialties_updated_at BEFORE UPDATE ON "clinical_specialties"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_procedures_updated_at BEFORE UPDATE ON "clinical_procedures"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_knowledge_packages_updated_at BEFORE UPDATE ON "clinical_knowledge_packages"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_consent_forms_updated_at BEFORE UPDATE ON "clinical_consent_forms"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_education_materials_updated_at BEFORE UPDATE ON "clinical_education_materials"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_risk_disclosures_updated_at BEFORE UPDATE ON "clinical_risk_disclosures"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_decision_rules_updated_at BEFORE UPDATE ON "clinical_decision_rules"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
