-- ============================================================
-- Migration 0020: Approved Wording Repository & Governance
-- ============================================================
-- Stores IMC-approved, legally-reviewed wording templates
-- with strict protection of fixed legal clauses.
-- ============================================================

CREATE TABLE IF NOT EXISTS approved_wording_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL,
  wording_key           TEXT NOT NULL,                -- e.g. "core.informed_consent.fixed"
  version               TEXT NOT NULL DEFAULT '1.0.0',
  language              TEXT NOT NULL                 -- 'ar' | 'en' | 'bilingual'
                          CHECK (language IN ('ar','en','bilingual')),
  is_fixed_legal_clause BOOLEAN NOT NULL DEFAULT FALSE,  -- if true, immutable
  content_ar            TEXT,                         -- Arabic content
  content_en            TEXT,                         -- English content
  section               TEXT,                         -- e.g. "core_consent", "physician_certification"
  description           TEXT,
  approved_by_id        TEXT,
  approved_at           TIMESTAMPTZ,
  legal_review_status   TEXT DEFAULT 'PENDING'        -- PENDING | APPROVED | REJECTED
                          CHECK (legal_review_status IN ('PENDING','APPROVED','REJECTED')),
  medical_review_status TEXT DEFAULT 'PENDING'
                          CHECK (medical_review_status IN ('PENDING','APPROVED','REJECTED')),
  effective_date        TIMESTAMPTZ,
  deprecated_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, wording_key, version, language)
);

CREATE INDEX IF NOT EXISTS idx_awt_tenant_key
  ON approved_wording_templates (tenant_id, wording_key, deprecated_at)
  WHERE deprecated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_awt_section
  ON approved_wording_templates (section, deprecated_at)
  WHERE deprecated_at IS NULL;

-- ============================================================
-- SEED: IMC Unified Informed Consent Wording (System Tenant)
-- ============================================================

-- Core Informed Consent — FIXED LEGAL CLAUSE
INSERT INTO approved_wording_templates
  (tenant_id, wording_key, version, language, is_fixed_legal_clause, section, 
   content_ar, content_en, description, legal_review_status, medical_review_status, 
   effective_date, approved_by_id, approved_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'core.informed_consent.main_clause',
    '1.0.0',
    'bilingual',
    TRUE,
    'core_consent',
    'أقر أنا الموقع أدناه بأن الطبيب المعالج وفريق الرعاية الصحية قد قاموا بشرح حالتي الصحية وطبيعة الإجراء الطبي / الجراحي / التشخيصي / العلاجي المقترح لي بصورة واضحة ومفهومة، بما في ذلك الغرض من الإجراء، والفوائد المتوقعة، والمخاطر والمضاعفات المحتملة، والبدائل العلاجية الممكنة، إضافة إلى النتائج أو المضاعفات المحتملة في حال رفض العلاج أو عدم إجرائه.

كما أقر بأنه أتيحت لي الفرصة الكاملة لطرح الأسئلة والاستفسارات المتعلقة بحالتي الصحية والإجراء المقترح، وقد تمت الإجابة على جميع استفساراتي بصورة واضحة ومفهومة ومرضية بالنسبة لي.

وأقر كذلك بأن ممارسة الطب والجراحة لا تخلو من المخاطر والمضاعفات المحتملة، وأنه لا يمكن تقديم أو ضمان نتائج محددة بشكل مطلق، رغم اتخاذ كافة المعايير المهنية والطبية المتعارف عليها.

وأفهم أن بعض المخاطر أو المضاعفات قد تكون شائعة أو نادرة أو خطيرة أو مهددة للحياة بحسب طبيعة الإجراء وحالتي الصحية.

كما أوافق على اتخاذ أي إجراءات طبية إضافية أو طارئة يراها الفريق الطبي ضرورية أثناء أو بعد الإجراء الطبي حفاظًا على سلامتي الصحية، وفقًا للأصول الطبية المتعارف عليها.

وأقر بأنه قد تم شرح خيارات التخدير المناسبة لي — إن وجدت — بما في ذلك مخاطر التخدير ومضاعفاته المحتملة.

وأوافق على استخدام وتبادل معلوماتي الصحية الشخصية بالقدر اللازم لأغراض العلاج والرعاية الصحية والتوثيق الطبي والالتزام بالأنظمة واللوائح الصحية المعمول بها، وفقًا لنظام حماية البيانات الشخصية والأنظمة ذات العلاقة في المملكة العربية السعودية.

كما أقر بأن هذه الموافقة تمثل موافقة مستنيرة وصادرة بإرادتي الحرة دون أي إكراه أو ضغط.',
    'I, the undersigned, hereby acknowledge that the treating physician and healthcare team have explained to me, in a clear and understandable manner, my medical condition and the nature of the proposed medical, surgical, diagnostic, or therapeutic procedure, including the purpose of the procedure, expected benefits, potential risks and complications, available treatment alternatives, and the possible consequences or complications that may arise from refusing or delaying treatment.

I further acknowledge that I have been given full opportunity to ask questions and discuss concerns regarding my condition and the proposed procedure, and that all my questions have been answered clearly and satisfactorily.

I understand that the practice of medicine and surgery involves inherent risks and potential complications, and that no absolute guarantee or assurance has been made regarding specific outcomes, despite adherence to recognized medical and professional standards.

I further understand that certain risks or complications may be common, uncommon, serious, or life-threatening depending on the nature of the procedure and my medical condition.

I also authorize the medical team to perform any additional or emergency procedures deemed medically necessary during or after the procedure in order to preserve my health and safety in accordance with accepted medical standards.

I acknowledge that the available anesthesia options — where applicable — together with their potential risks and complications have been explained to me.

I consent to the use and processing of my personal health information to the extent necessary for treatment, healthcare operations, medical documentation, and compliance with applicable healthcare laws and regulations, in accordance with the Personal Data Protection Law (PDPL) and related regulations of the Kingdom of Saudi Arabia.

I further acknowledge that this informed consent is given voluntarily and without coercion or undue pressure.',
    'IMC Unified Core Informed Consent — Main Clause (FIXED LEGAL TEXT)',
    'APPROVED',
    'APPROVED',
    '2026-05-10'::TIMESTAMPTZ,
    NULL,
    '2026-05-10'::TIMESTAMPTZ
  )
ON CONFLICT DO NOTHING;

-- Medical Imaging/Recording Consent — FIXED LEGAL CLAUSE
INSERT INTO approved_wording_templates
  (tenant_id, wording_key, version, language, is_fixed_legal_clause, section,
   content_ar, content_en, description, legal_review_status, medical_review_status,
   effective_date, approved_by_id, approved_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'core.imaging_recording_consent',
    '1.0.0',
    'bilingual',
    TRUE,
    'medical_imaging',
    'أوافق على إمكانية تسجيل أو حفظ الصور الطبية أو مقاطع الفيديو أو التسجيلات المتعلقة بالإجراء الطبي أو الجراحي أو التشخيصي ضمن ملفي الطبي لأغراض الرعاية الصحية والتوثيق الطبي وتحسين جودة الخدمات الصحية، مع الالتزام بالسرية الطبية والأنظمة المعمول بها.',
    'I consent to the recording or retention of medical images, videos, or procedure-related recordings as part of my medical record for purposes of healthcare delivery, medical documentation, and quality improvement, subject to applicable confidentiality obligations and regulations.',
    'Medical Imaging/Recording Consent (FIXED LEGAL TEXT)',
    'APPROVED',
    'APPROVED',
    '2026-05-10'::TIMESTAMPTZ,
    NULL,
    '2026-05-10'::TIMESTAMPTZ
  )
ON CONFLICT DO NOTHING;

-- Interpreter Clause — FIXED LEGAL CLAUSE
INSERT INTO approved_wording_templates
  (tenant_id, wording_key, version, language, is_fixed_legal_clause, section,
   content_ar, content_en, description, legal_review_status, medical_review_status,
   effective_date, approved_by_id, approved_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'core.interpreter_clause',
    '1.0.0',
    'bilingual',
    TRUE,
    'interpreter',
    'أقر بأن المعلومات المتعلقة بحالتي الصحية والإجراء الطبي قد تم شرحها لي باللغة التي أفهمها، وفي حال الاستعانة بمترجم، فقد تمت الترجمة بصورة مفهومة وواضحة بالنسبة لي.',
    'I acknowledge that the information regarding my medical condition and proposed procedure has been explained to me in a language I understand, and where an interpreter was involved, the interpretation was provided clearly and appropriately.',
    'Interpreter Clause (FIXED LEGAL TEXT)',
    'APPROVED',
    'APPROVED',
    '2026-05-10'::TIMESTAMPTZ,
    NULL,
    '2026-05-10'::TIMESTAMPTZ
  )
ON CONFLICT DO NOTHING;

-- Legal Guardian Clause — FIXED LEGAL CLAUSE
INSERT INTO approved_wording_templates
  (tenant_id, wording_key, version, language, is_fixed_legal_clause, section,
   content_ar, content_en, description, legal_review_status, medical_review_status,
   effective_date, approved_by_id, approved_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'core.legal_guardian_clause',
    '1.0.0',
    'bilingual',
    TRUE,
    'guardian',
    'أقر أنا الموقع أدناه بصفتي وليًا شرعيًا / ممثلًا نظاميًا للمريض بأنني مخول نظامًا بإعطاء هذه الموافقة نيابة عنه، وأنه تم شرح الحالة الطبية والإجراء المقترح والمخاطر والبدائل العلاجية لي بصورة واضحة ومفهومة.',
    'I, the undersigned, acting as the patient''s legal guardian / authorized substitute decision maker, acknowledge that I am legally authorized to provide this consent on behalf of the patient, and that the medical condition, proposed procedure, risks, and treatment alternatives have been clearly explained to me.',
    'Legal Guardian / Substitute Decision Maker Clause (FIXED LEGAL TEXT)',
    'APPROVED',
    'APPROVED',
    '2026-05-10'::TIMESTAMPTZ,
    NULL,
    '2026-05-10'::TIMESTAMPTZ
  )
ON CONFLICT DO NOTHING;

-- Physician Certification — FIXED LEGAL CLAUSE
INSERT INTO approved_wording_templates
  (tenant_id, wording_key, version, language, is_fixed_legal_clause, section,
   content_ar, content_en, description, legal_review_status, medical_review_status,
   effective_date, approved_by_id, approved_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'core.physician_certification',
    '1.0.0',
    'bilingual',
    TRUE,
    'physician_certification',
    'أقر أنا الطبيب / الممارس الصحي الموقع أدناه بأنني قمت بشرح الحالة الطبية للمريض وطبيعة الإجراء المقترح والفوائد والمخاطر والمضاعفات المحتملة والبدائل العلاجية ومخاطر رفض العلاج للمريض أو لممثله النظامي بصورة واضحة ومفهومة، وأجبت على كافة الاستفسارات المطروحة وفقًا للأصول المهنية والطبية المتعارف عليها.',
    'I, the undersigned physician / healthcare practitioner, certify that I have explained to the patient or the patient''s legal representative the medical condition, the nature of the proposed procedure, expected benefits, potential risks and complications, available treatment alternatives, and the risks of refusing treatment in a clear and understandable manner, and that I have answered all related questions in accordance with accepted medical and professional standards.',
    'Physician Certification (FIXED LEGAL TEXT)',
    'APPROVED',
    'APPROVED',
    '2026-05-10'::TIMESTAMPTZ,
    NULL,
    '2026-05-10'::TIMESTAMPTZ
  )
ON CONFLICT DO NOTHING;

-- No Guarantee Clause — FIXED LEGAL CLAUSE
INSERT INTO approved_wording_templates
  (tenant_id, wording_key, version, language, is_fixed_legal_clause, section,
   content_ar, content_en, description, legal_review_status, medical_review_status,
   effective_date, approved_by_id, approved_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'core.no_guarantee_clause',
    '1.0.0',
    'bilingual',
    TRUE,
    'no_guarantee',
    'أفهم وأقر بأنه لا يمكن ضمان أو التعهد بنتائج محددة للإجراء الطبي أو الجراحي أو العلاجي، وأن الاستجابة للعلاج تختلف من شخص لآخر بحسب الحالة الصحية والعوامل الطبية المختلفة.',
    'I understand and acknowledge that no specific result or outcome can be guaranteed for the medical, surgical, or therapeutic procedure, and that treatment outcomes may vary depending on individual medical conditions and related factors.',
    'No Guarantee Clause (FIXED LEGAL TEXT)',
    'APPROVED',
    'APPROVED',
    '2026-05-10'::TIMESTAMPTZ,
    NULL,
    '2026-05-10'::TIMESTAMPTZ
  )
ON CONFLICT DO NOTHING;

-- Electronic Signature Clause — FIXED LEGAL CLAUSE
INSERT INTO approved_wording_templates
  (tenant_id, wording_key, version, language, is_fixed_legal_clause, section,
   content_ar, content_en, description, legal_review_status, medical_review_status,
   effective_date, approved_by_id, approved_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'core.electronic_signature_clause',
    '1.0.0',
    'bilingual',
    TRUE,
    'electronic_signature',
    'يُعد التوقيع الإلكتروني أو التوقيع المرسل عبر الرابط الإلكتروني الآمن معتمدًا وملزمًا نظامًا، ويترتب عليه ذات الأثر القانوني للتوقيع الخطي، وذلك وفقًا للأنظمة المعمول بها في المملكة العربية السعودية.',
    'Electronic signatures or signatures executed through a secure electronic link shall be considered legally valid and binding and shall have the same legal effect as handwritten signatures in accordance with the applicable laws and regulations of the Kingdom of Saudi Arabia.',
    'Electronic Signature Clause (FIXED LEGAL TEXT)',
    'APPROVED',
    'APPROVED',
    '2026-05-10'::TIMESTAMPTZ,
    NULL,
    '2026-05-10'::TIMESTAMPTZ
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Governance Audit Trail for Wording Changes
-- ============================================================

CREATE TABLE IF NOT EXISTS wording_change_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  template_id     UUID REFERENCES approved_wording_templates(id),
  wording_key     TEXT NOT NULL,
  change_type     TEXT NOT NULL
                    CHECK (change_type IN ('CREATED','APPROVED','REJECTED','DEPRECATED','VERSION_BUMP')),
  actor_id        TEXT,
  actor_role      TEXT,
  reason          TEXT,
  previous_version TEXT,
  new_version     TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wca_tenant_wording
  ON wording_change_audit (tenant_id, wording_key, timestamp DESC);
