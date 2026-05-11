-- ============================================================
-- Migration 0019: Specialty Knowledge Base & Procedure Catalog
-- Signature Workflow Tables
-- ============================================================
-- Safe, additive migration — no drops, no destructive changes.
-- ============================================================

-- ------------------------------------------------------------
-- A. SPECIALTY RISK PROFILES
-- Canonical risk items per specialty
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS specialty_risk_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  specialty             TEXT NOT NULL,
  procedure_code        TEXT,                         -- NULL = specialty-wide default
  description_en        TEXT NOT NULL,
  description_ar        TEXT NOT NULL,
  frequency             TEXT NOT NULL                 -- COMMON | LESS_COMMON | RARE
                          CHECK (frequency IN ('COMMON','LESS_COMMON','RARE')),
  severity              TEXT NOT NULL                 -- MILD | MODERATE | SERIOUS | LIFE_THREATENING
                          CHECK (severity IN ('MILD','MODERATE','SERIOUS','LIFE_THREATENING')),
  alert_level           TEXT NOT NULL DEFAULT 'ROUTINE'
                          CHECK (alert_level IN ('ROUTINE','HEIGHTENED','CRITICAL','MANDATORY_DISCLOSURE')),
  is_mandatory_disclosure BOOLEAN NOT NULL DEFAULT FALSE,
  probability_estimate  TEXT,
  physician_editable    BOOLEAN NOT NULL DEFAULT TRUE,
  display_order         INT NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id         UUID
);

CREATE INDEX IF NOT EXISTS idx_srf_tenant_specialty
  ON specialty_risk_profiles (tenant_id, specialty);
CREATE INDEX IF NOT EXISTS idx_srf_procedure_code
  ON specialty_risk_profiles (procedure_code)
  WHERE procedure_code IS NOT NULL;

-- ------------------------------------------------------------
-- B. SPECIALTY PROMPT TEMPLATES
-- Governance-versioned AI prompt templates per specialty
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS specialty_prompt_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  specialty       TEXT NOT NULL,
  prompt_key      TEXT NOT NULL,                -- e.g. "consent.surgery.general"
  version         TEXT NOT NULL DEFAULT '1.0.0',
  system_prompt   TEXT NOT NULL,
  user_template   TEXT NOT NULL,               -- Supports {{PROCEDURE}}, {{PATIENT_AGE}} etc.
  language        TEXT NOT NULL DEFAULT 'bilingual'
                    CHECK (language IN ('ar','en','bilingual')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by_id  UUID,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, specialty, prompt_key, version)
);

CREATE INDEX IF NOT EXISTS idx_spt_tenant_specialty
  ON specialty_prompt_templates (tenant_id, specialty);
CREATE INDEX IF NOT EXISTS idx_spt_prompt_key
  ON specialty_prompt_templates (prompt_key);

-- ------------------------------------------------------------
-- C. SIGNING SESSIONS
-- External signature workflow sessions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signing_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  document_id           UUID NOT NULL,
  module_type           TEXT NOT NULL
                          CHECK (module_type IN ('informed_consent','discharge_refusal','promissory_note')),
  provider_key          TEXT NOT NULL,             -- e.g. "pdf_filler", "docusign"
  provider_session_id   TEXT,                      -- External provider's ID
  status                TEXT NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING','SENT','PARTIALLY_SIGNED','COMPLETED','EXPIRED','REVOKED')),
  required_signers      JSONB NOT NULL DEFAULT '[]',   -- array of role strings
  completed_signers     JSONB NOT NULL DEFAULT '[]',
  signer_links          JSONB NOT NULL DEFAULT '{}',   -- role -> secure token
  expires_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  revoked_at            TIMESTAMPTZ,
  revoked_reason        TEXT,
  signed_pdf_key        TEXT,                      -- Storage key for signed PDF
  initiated_by_id       UUID NOT NULL,
  resend_count          INT NOT NULL DEFAULT 0,
  last_resent_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ss_tenant_document
  ON signing_sessions (tenant_id, document_id);
CREATE INDEX IF NOT EXISTS idx_ss_provider_session
  ON signing_sessions (provider_session_id)
  WHERE provider_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ss_status
  ON signing_sessions (status);
CREATE INDEX IF NOT EXISTS idx_ss_expires
  ON signing_sessions (expires_at)
  WHERE status = 'SENT' OR status = 'PARTIALLY_SIGNED';

-- ------------------------------------------------------------
-- D. SIGNING EVENTS
-- Immutable event log for each signing session
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signing_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES signing_sessions(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL,
  event_type          TEXT NOT NULL,      -- signer.viewed | signer.signed | session.completed | etc.
  signer_role         TEXT,
  provider_key        TEXT NOT NULL,
  provider_event_id   TEXT,
  payload             JSONB NOT NULL DEFAULT '{}',
  ip_address          TEXT,
  timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_se_session
  ON signing_events (session_id);
CREATE INDEX IF NOT EXISTS idx_se_tenant_event
  ON signing_events (tenant_id, event_type);

-- ------------------------------------------------------------
-- E. SIGNING SECURE TOKENS
-- Short-lived tokens for signing links; separately indexed
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signing_secure_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES signing_sessions(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,
  signer_role   TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  ip_on_use     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_token
  ON signing_secure_tokens (token);
CREATE INDEX IF NOT EXISTS idx_sst_session
  ON signing_secure_tokens (session_id);
CREATE INDEX IF NOT EXISTS idx_sst_expires
  ON signing_secure_tokens (expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

-- ------------------------------------------------------------
-- F. WEBHOOK EVENTS LOG
-- Immutable inbound webhook event log
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,
  provider_key    TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  raw_payload     JSONB NOT NULL,
  hmac_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  processing_error TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_we_provider_event
  ON webhook_events (provider_key, event_type);
CREATE INDEX IF NOT EXISTS idx_we_unprocessed
  ON webhook_events (processed, received_at)
  WHERE processed = FALSE;

-- ------------------------------------------------------------
-- G. FEATURE FLAG OVERRIDES
-- Per-tenant runtime feature flag overrides
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  flag_key    TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL,
  set_by_id   UUID,
  set_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  reason      TEXT,
  UNIQUE (tenant_id, flag_key)
);

CREATE INDEX IF NOT EXISTS idx_ffo_tenant
  ON feature_flag_overrides (tenant_id);

-- ------------------------------------------------------------
-- H. PLATFORM ERROR LOG
-- Centralized error registry for silent-failure prevention
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_error_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,
  module          TEXT NOT NULL,          -- consent | discharge | promissory | pdf | signature | ai
  operation       TEXT NOT NULL,          -- e.g. "pdf_render", "ai_generate"
  error_code      TEXT NOT NULL,
  error_message   TEXT NOT NULL,
  stack_trace     TEXT,
  context         JSONB NOT NULL DEFAULT '{}',
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pel_module_operation
  ON platform_error_log (module, operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pel_unresolved
  ON platform_error_log (resolved, created_at DESC)
  WHERE resolved = FALSE;

-- ============================================================
-- SEED: Specialty Risk Profiles (System / NULL tenant treated as global)
-- ============================================================
-- Uses a fixed "system" tenant placeholder UUID so rows can be
-- scoped or copied to real tenants at runtime.
-- ============================================================

-- Surgery
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Surgery', 'Bleeding requiring transfusion', 'نزيف يستدعي نقل الدم', 'LESS_COMMON', 'SERIOUS', 'HEIGHTENED', TRUE, '1-5%', 1),
  ('00000000-0000-0000-0000-000000000001', 'Surgery', 'Wound infection', 'التهاب الجرح', 'COMMON', 'MODERATE', 'ROUTINE', FALSE, '5-10%', 2),
  ('00000000-0000-0000-0000-000000000001', 'Surgery', 'Deep vein thrombosis (DVT)', 'الجلطة الوريدية العميقة', 'LESS_COMMON', 'SERIOUS', 'HEIGHTENED', TRUE, '1-3%', 3),
  ('00000000-0000-0000-0000-000000000001', 'Surgery', 'Pulmonary embolism', 'الانسداد الرئوي', 'RARE', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, '<1%', 4),
  ('00000000-0000-0000-0000-000000000001', 'Surgery', 'Anesthetic reaction', 'رد فعل التخدير', 'RARE', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '<0.5%', 5),
  ('00000000-0000-0000-0000-000000000001', 'Surgery', 'Nerve damage', 'تلف الأعصاب', 'RARE', 'SERIOUS', 'HEIGHTENED', TRUE, '<1%', 6),
  ('00000000-0000-0000-0000-000000000001', 'Surgery', 'Scar formation', 'تشكل ندبة', 'COMMON', 'MILD', 'ROUTINE', FALSE, '>50%', 7),
  ('00000000-0000-0000-0000-000000000001', 'Surgery', 'Need for reoperation', 'الحاجة إلى إعادة الجراحة', 'LESS_COMMON', 'MODERATE', 'HEIGHTENED', TRUE, '2-8%', 8)
ON CONFLICT DO NOTHING;

-- Cardiology
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Cardiology', 'Cardiac arrhythmia', 'اضطراب النظم القلبي', 'COMMON', 'SERIOUS', 'HEIGHTENED', TRUE, '5-15%', 1),
  ('00000000-0000-0000-0000-000000000001', 'Cardiology', 'Stroke or TIA', 'السكتة الدماغية أو نوبة نقص التروية العابرة', 'LESS_COMMON', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, '1-3%', 2),
  ('00000000-0000-0000-0000-000000000001', 'Cardiology', 'Contrast dye allergy / nephropathy', 'حساسية أو اعتلال كلوي من صبغة التباين', 'LESS_COMMON', 'SERIOUS', 'HEIGHTENED', TRUE, '1-5%', 3),
  ('00000000-0000-0000-0000-000000000001', 'Cardiology', 'Cardiac perforation (catheter)', 'ثقب القلب أثناء القسطرة', 'RARE', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, '<0.5%', 4),
  ('00000000-0000-0000-0000-000000000001', 'Cardiology', 'Vascular access site complications', 'مضاعفات موقع الوصول الوعائي', 'COMMON', 'MODERATE', 'ROUTINE', FALSE, '3-5%', 5)
ON CONFLICT DO NOTHING;

-- OBGYN
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'OBGYN', 'Uterine injury', 'إصابة الرحم', 'RARE', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '<1%', 1),
  ('00000000-0000-0000-0000-000000000001', 'OBGYN', 'Bladder or ureter injury', 'إصابة المثانة أو الحالب', 'RARE', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '<1%', 2),
  ('00000000-0000-0000-0000-000000000001', 'OBGYN', 'Postpartum hemorrhage', 'نزيف ما بعد الولادة', 'LESS_COMMON', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, '1-5%', 3),
  ('00000000-0000-0000-0000-000000000001', 'OBGYN', 'Infection / endometritis', 'التهاب بطانة الرحم', 'COMMON', 'MODERATE', 'ROUTINE', FALSE, '5-10%', 4),
  ('00000000-0000-0000-0000-000000000001', 'OBGYN', 'Need for hysterectomy (emergency)', 'الحاجة إلى استئصال الرحم طارئ', 'RARE', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, '<1%', 5)
ON CONFLICT DO NOTHING;

-- ENT
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'ENT', 'Post-operative bleeding (tonsillar)', 'نزيف ما بعد استئصال اللوزتين', 'LESS_COMMON', 'SERIOUS', 'HEIGHTENED', TRUE, '1-5%', 1),
  ('00000000-0000-0000-0000-000000000001', 'ENT', 'Voice change (hoarseness)', 'تغير في الصوت (بحة)', 'COMMON', 'MILD', 'ROUTINE', FALSE, '10-30%', 2),
  ('00000000-0000-0000-0000-000000000001', 'ENT', 'Hearing loss (sensorineural)', 'فقدان السمع الحسي العصبي', 'RARE', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '<1%', 3),
  ('00000000-0000-0000-0000-000000000001', 'ENT', 'Facial nerve injury', 'إصابة العصب الوجهي', 'RARE', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '<1%', 4)
ON CONFLICT DO NOTHING;

-- Anesthesia
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Anesthesia', 'Nausea and vomiting', 'غثيان وقيء', 'COMMON', 'MILD', 'ROUTINE', FALSE, '20-30%', 1),
  ('00000000-0000-0000-0000-000000000001', 'Anesthesia', 'Sore throat (intubation)', 'التهاب الحلق (من التنبيب)', 'COMMON', 'MILD', 'ROUTINE', FALSE, '20-40%', 2),
  ('00000000-0000-0000-0000-000000000001', 'Anesthesia', 'Anaphylactic reaction', 'التفاعل التحسسي الشديد', 'RARE', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, '<0.1%', 3),
  ('00000000-0000-0000-0000-000000000001', 'Anesthesia', 'Awareness under anesthesia', 'الوعي أثناء التخدير', 'RARE', 'MODERATE', 'HEIGHTENED', TRUE, '0.1-0.2%', 4),
  ('00000000-0000-0000-0000-000000000001', 'Anesthesia', 'Malignant hyperthermia', 'ارتفاع حرارة خبيث', 'RARE', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, '<0.01%', 5),
  ('00000000-0000-0000-0000-000000000001', 'Anesthesia', 'Dental damage (intubation)', 'تلف الأسنان أثناء التنبيب', 'LESS_COMMON', 'MILD', 'ROUTINE', FALSE, '1-5%', 6)
ON CONFLICT DO NOTHING;

-- Orthopedics
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Orthopedics', 'Deep venous thrombosis', 'الجلطة الوريدية العميقة', 'COMMON', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '10-40%', 1),
  ('00000000-0000-0000-0000-000000000001', 'Orthopedics', 'Implant failure or revision', 'فشل الغرسة أو الحاجة لإعادة الجراحة', 'LESS_COMMON', 'SERIOUS', 'HEIGHTENED', TRUE, '2-10%', 2),
  ('00000000-0000-0000-0000-000000000001', 'Orthopedics', 'Periprosthetic infection', 'التهاب محيط الغرسة', 'LESS_COMMON', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '1-3%', 3),
  ('00000000-0000-0000-0000-000000000001', 'Orthopedics', 'Nerve or vessel injury', 'إصابة الأعصاب أو الأوعية', 'RARE', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '<1%', 4),
  ('00000000-0000-0000-0000-000000000001', 'Orthopedics', 'Limb length discrepancy', 'اختلاف طول الأطراف', 'LESS_COMMON', 'MODERATE', 'ROUTINE', FALSE, '2-5%', 5)
ON CONFLICT DO NOTHING;

-- Gastroenterology
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Gastroenterology', 'Perforation (endoscopic)', 'انثقاب القولون أو المعدة (تنظيري)', 'RARE', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, '<0.5%', 1),
  ('00000000-0000-0000-0000-000000000001', 'Gastroenterology', 'Bleeding post-polypectomy', 'نزيف بعد استئصال الورم', 'LESS_COMMON', 'SERIOUS', 'HEIGHTENED', TRUE, '1-5%', 2),
  ('00000000-0000-0000-0000-000000000001', 'Gastroenterology', 'Pancreatitis post-ERCP', 'التهاب البنكرياس بعد ERCP', 'COMMON', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '3-5%', 3),
  ('00000000-0000-0000-0000-000000000001', 'Gastroenterology', 'Aspiration (sedation)', 'استنشاق (أثناء التخدير)', 'RARE', 'SERIOUS', 'HEIGHTENED', TRUE, '<1%', 4)
ON CONFLICT DO NOTHING;

-- Emergency Medicine
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Emergency Medicine', 'Deterioration despite intervention', 'تدهور الحالة رغم التدخل', 'LESS_COMMON', 'LIFE_THREATENING', 'MANDATORY_DISCLOSURE', TRUE, 'Condition-dependent', 1),
  ('00000000-0000-0000-0000-000000000001', 'Emergency Medicine', 'Medication adverse reaction', 'تفاعل دوائي ضار', 'COMMON', 'MODERATE', 'HEIGHTENED', TRUE, '5-10%', 2),
  ('00000000-0000-0000-0000-000000000001', 'Emergency Medicine', 'Procedure-related infection', 'التهاب مرتبط بالإجراء', 'LESS_COMMON', 'MODERATE', 'ROUTINE', FALSE, '2-5%', 3)
ON CONFLICT DO NOTHING;

-- ICU
INSERT INTO specialty_risk_profiles
  (tenant_id, specialty, description_en, description_ar, frequency, severity, alert_level, is_mandatory_disclosure, probability_estimate, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'ICU', 'Ventilator-associated pneumonia', 'التهاب رئوي مرتبط بالتهوية الميكانيكية', 'COMMON', 'SERIOUS', 'MANDATORY_DISCLOSURE', TRUE, '10-20%', 1),
  ('00000000-0000-0000-0000-000000000001', 'ICU', 'Central line infection', 'التهاب الخط الوريدي المركزي', 'LESS_COMMON', 'SERIOUS', 'HEIGHTENED', TRUE, '3-8%', 2),
  ('00000000-0000-0000-0000-000000000001', 'ICU', 'Pressure ulcers', 'قرحة الضغط', 'COMMON', 'MODERATE', 'ROUTINE', FALSE, '15-25%', 3),
  ('00000000-0000-0000-0000-000000000001', 'ICU', 'Delirium / ICU psychosis', 'الهذيان / ذهان وحدة العناية المركزة', 'COMMON', 'MODERATE', 'HEIGHTENED', TRUE, '20-40%', 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Default AI Prompt Templates per Specialty
-- ============================================================

INSERT INTO specialty_prompt_templates
  (tenant_id, specialty, prompt_key, version, system_prompt, user_template, language)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Surgery',
    'consent.surgery.general',
    '1.0.0',
    'You are a medico-legal consent drafting assistant specializing in surgical procedures at IMC. Output must be clinically accurate, IMC-approved wording compliant, and legally defensible in Saudi Arabia.',
    'Generate a bilingual (Arabic and English) informed consent document for the following surgical procedure:
Procedure: {{PROCEDURE}} ({{PROCEDURE_CODE}})
Patient Age: {{PATIENT_AGE}}
Diagnosis: {{DIAGNOSIS}}
Consent Type: {{CONSENT_TYPE}}

Structure:
1. Procedure Description (English / وصف الإجراء)
2. Risks and Complications (English / المخاطر والمضاعفات)
3. Alternatives (English / البدائل)
4. Refusal Consequences (English / عواقب الرفض)
5. Patient Declaration (English / إقرار المريض)

Use formal Modern Standard Arabic (فصحى) for Arabic sections.',
    'bilingual'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Cardiology',
    'consent.cardiology.general',
    '1.0.0',
    'You are a medico-legal consent drafting assistant specializing in cardiology procedures at IMC. Emphasize cardiovascular risks, contrast dye warnings, and anticoagulation considerations.',
    'Generate a bilingual informed consent document for the following cardiology procedure:
Procedure: {{PROCEDURE}} ({{PROCEDURE_CODE}})
Patient Age: {{PATIENT_AGE}}
Diagnosis: {{DIAGNOSIS}}

Sections: Description, Risks (including cardiac, vascular, contrast-related), Alternatives, Refusal Consequences, Declaration.',
    'bilingual'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Anesthesia',
    'consent.anesthesia.general',
    '1.0.0',
    'You are a medico-legal consent drafting assistant specializing in anesthesia at IMC. Emphasize pre-operative fasting, allergy history, anesthetic agents, monitoring, and recovery.',
    'Generate a bilingual anesthesia consent document for:
Procedure requiring anesthesia: {{PROCEDURE}}
Patient Age: {{PATIENT_AGE}}
Consent Type: {{CONSENT_TYPE}}

Sections: Type of anesthesia, Risks (routine and rare), Patient responsibilities, Declaration.',
    'bilingual'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'OBGYN',
    'consent.obgyn.general',
    '1.0.0',
    'You are a medico-legal consent drafting assistant for OBGYN at IMC. Be culturally sensitive. Emphasize fertility implications, pregnancy risks, and guardian consent requirements where applicable.',
    'Generate a bilingual OBGYN consent document for:
Procedure: {{PROCEDURE}}
Patient Age: {{PATIENT_AGE}}
Diagnosis: {{DIAGNOSIS}}

Sections: Description, Risks (including fertility, hemorrhage, organ injury), Alternatives, Refusal Consequences, Guardian/Patient Declaration.',
    'bilingual'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Orthopedics',
    'consent.orthopedics.general',
    '1.0.0',
    'You are a medico-legal consent drafting assistant for orthopedic surgery at IMC. Emphasize implant-related risks, DVT prophylaxis, rehabilitation requirements, and revision surgery possibility.',
    'Generate a bilingual orthopedic consent document for:
Procedure: {{PROCEDURE}} ({{PROCEDURE_CODE}})
Patient Age: {{PATIENT_AGE}}
Diagnosis: {{DIAGNOSIS}}

Sections: Procedure, Implant/Device Information, Risks, Rehabilitation Expectations, Alternatives, Refusal Consequences, Declaration.',
    'bilingual'
  )
ON CONFLICT (tenant_id, specialty, prompt_key, version) DO NOTHING;
