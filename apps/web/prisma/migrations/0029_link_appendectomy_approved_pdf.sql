-- Link the available approved Appendectomy PDF to matching clinical consent forms.
-- This is intentionally narrow and non-destructive.

UPDATE clinical_consent_forms
SET
  pdf_template_url = '/approved-consent-forms/appendectomy-consent.pdf',
  updated_at = NOW()
WHERE
  (
    code ILIKE '%APPEND%'
    OR title_en ILIKE '%Appendectomy%'
  )
  AND (
    pdf_template_url IS NULL
    OR pdf_template_url = ''
    OR pdf_template_url LIKE '/imc-consent-library/%'
  );
