# Internal Pilot Test Script — Dynamic Consent

> **Audience:** Pilot physicians, legal reviewers, compliance
> reviewers, QA operators. **Internal use only.**

This script exercises the internal dynamic-consent preview surface
end-to-end. It does **not** touch any production workflow, production
domain, or production data.

## 0. Preconditions

- You have a valid login for the preview deployment.
- Preview deployment URL (current):
  `https://wathiqcare-discharge-refusal-biqzzq3x9-wathiqcare.vercel.app`
- The query parameter `?engine=dynamic-preview` is appended to every
  internal preview URL below.
- `ENABLE_DYNAMIC_CONSENT_ENGINE` is **not** set in production. Do
  not request it to be set.

## 1. Login

1. Open the preview URL above in a fresh browser profile.
2. Sign in with your assigned pilot account.
3. Confirm `/api/health` returns `200 OK` (open it in a new tab).

## 2. Open the dynamic consent preview

1. Navigate to:
   `<preview-url>/internal/dynamic-consent-preview?engine=dynamic-preview`
2. Confirm the page renders with the *Internal Preview* banner.
3. Confirm no production navigation links are present.

## 3. Select the cardiology demo

1. In the *Specialty Demo* selector choose **Cardiology — Coronary
   Angiography**.
2. Click *Generate Preview*.
3. Confirm the HTML preview renders with the cardiology-specific
   sections, risks, declarations, and signature blocks.

## 4. Select bilingual rendering

1. In the *Language* selector choose **Bilingual (EN + AR)**.
2. Click *Generate Preview* again.
3. Confirm both English and Arabic blocks render.
4. Confirm the document direction is correct for the Arabic sections.

## 5. Enable the legal-grade renderer

1. Toggle *Legal-grade renderer* ON.
2. Click *Generate Preview*.
3. Confirm the legal-grade HTML shell is used (you should see the
   bilingual audit footer at the bottom of the preview).

## 6. Enable the evidence package

1. Toggle *Evidence package* ON.
2. Click *Generate Preview*.
3. Confirm the *Evidence Package* panel appears.
4. Record the **Evidence ID** (starts with `EV-`).
5. Record the **Audit Hash**.
6. Record the **Payload Fingerprint**.

## 7. Run validation

1. Click the violet **Run Validation** button.
2. Wait for the validation panel to populate.
3. Confirm the overall status is `PASS` or `WARNING` (any `FAIL`
   item must be flagged in feedback).
4. Confirm the *Determinism* section reports `0 drifts`.

## 8. Download the experimental PDF

1. Click the *Download experimental PDF* button.
2. Expected outcomes:
   - **HTTP 200** with a `.pdf` file → save it and review locally.
   - **HTTP 501** with a controlled fallback envelope → record the
     `renderer.reason` field. The 501 is acceptable on environments
     where the `puppeteer-core` / `@sparticuz/chromium` binary is not
     available.
3. If a PDF was returned, confirm the filename matches the pattern:
   `wathiqcare-consent-preview__<templateId>__v<version>__<mrn>__<case>__<EV-…>.pdf`

## 9. Open the verification preview

1. In the *Evidence Package* panel click
   **Open Verification Preview ↗**.
2. A new tab opens at
   `/internal/verify/<EV-…>?engine=dynamic-preview`.
3. Confirm the **status badge** reads `PREVIEW ONLY`.
4. Confirm the four verification flags read:
   - authenticity: `preview-not-legally-binding`
   - hashStatus: `not-validated-against-database`
   - signerChainStatus: `placeholder`
   - qrStatus: `placeholder`
5. Confirm the **patient MRN is masked** (you should not see the
   full MRN value).
6. Confirm the audit hash, template hash, and payload hash match the
   values recorded in step 6.

## 10. Print / Save as PDF

1. From the dynamic consent preview page (step 6) trigger the
   browser's *Print* dialog (Ctrl + P or ⌘ + P).
2. Save as PDF.
3. Open the saved PDF and visually confirm:
   - A4 page size.
   - No section, declaration, risk block, signature block, or audit
     footer is split across a page boundary.
   - Arabic glyphs render correctly.
   - The audit footer appears on every page (or at the document end,
     depending on browser).

## 11. Capture feedback

Fill in the form below (one form per specialty × language tested).

```
Pilot operator:        ___________________
Role:                  □ Physician  □ Legal  □ Compliance  □ QA
Date / time:           ___________________
Browser + version:     ___________________
Specialty demo:        ___________________
Language:              □ EN  □ AR  □ Bilingual
Preview deployment:    ___________________
Evidence ID tested:    EV-_________________

Legibility (1–5):                    _____
Bilingual rendering quality (1–5):   _____
Print fidelity (1–5):                _____
Verification preview clarity (1–5):  _____

Validation overall status:           □ PASS  □ WARNING  □ FAIL
Determinism drifts observed:         _____ (expected: 0)
PDF endpoint result:                 □ 200  □ 501 fallback  □ other: _____

Issues observed (free text):
  - ___________________________________________________________
  - ___________________________________________________________
  - ___________________________________________________________

Blocking concerns for production activation:
  - ___________________________________________________________

Suggested improvements:
  - ___________________________________________________________

Signed:                ___________________
```

Return the completed form to the pilot coordinator. Do **not**
attach real patient data.
