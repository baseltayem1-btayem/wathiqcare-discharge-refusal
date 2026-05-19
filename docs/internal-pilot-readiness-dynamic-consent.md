# Internal Pilot Readiness — Dynamic Consent

> **Status:** Preview-only. NOT production-ready. NOT a go-live document.
>
> This checklist governs an **internal** pilot of the dynamic consent
> preview pipeline (Phases 1–7). It does **not** authorize any change
> to production workflows, production routes, the production PDF
> renderer, or the `wathiqcare.online` domain.

## Scope

The pilot exercises only:

- `/internal/dynamic-consent-preview` — internal preview surface.
- `/internal/verify/[evidenceId]` — internal verification portal preview.
- `/api/internal/dynamic-consent/preview`
- `/api/internal/dynamic-consent/pdf-preview`
- `/api/internal/dynamic-consent/validation`
- `/api/internal/dynamic-consent/verify/[evidenceId]`

All routes require authentication and the
`?engine=dynamic-preview` feature gate (or
`ENABLE_DYNAMIC_CONSENT_ENGINE=true`, which is **NOT** flipped in
production).

## Physician pilot checklist

- [ ] Pilot physicians identified (specialty, role, language).
- [ ] Each physician has a working preview-deployment login.
- [ ] Each physician has read the test script
      (`internal-pilot-test-script-dynamic-consent.md`).
- [ ] Pilot run on at least two browsers per operator (e.g. Chrome +
      Edge).
- [ ] Pilot run for at least three specialty demos
      (cardiology, general-surgery, DAMA at minimum).
- [ ] Bilingual (EN + AR) preview reviewed by an Arabic-fluent
      physician.
- [ ] Feedback captured in writing (free-form + structured per
      checklist below).

## Legal review checklist

- [ ] Bilingual title block reviewed.
- [ ] Bilingual legal statements reviewed.
- [ ] Declaration block wording reviewed.
- [ ] Warning block wording reviewed for medico-legal accuracy.
- [ ] Signature zones reviewed (patient, physician, witness as
      applicable).
- [ ] DAMA refusal specialty reviewed for refusal-specific language.
- [ ] Anesthesia separate-consent specialty reviewed.
- [ ] Audit footer language reviewed
      ("WathiqCare™ Evidence-Ready • Chain-of-Custody Protected").
- [ ] Legal counsel sign-off recorded in writing.

## Compliance review checklist

- [ ] No real PHI flows through the preview surface.
- [ ] No DB writes occur from any preview route (verified by code
      review of routes listed in *Scope*).
- [ ] No production routes are reachable from preview navigation.
- [ ] Audit hash, payload fingerprint, and template hash are stable
      across N=3 runs of the same payload (verified by
      `/api/internal/dynamic-consent/validation`).
- [ ] Patient MRN is **masked** in the verification preview
      (`XXX***YY` form).
- [ ] Feature flag `ENABLE_DYNAMIC_CONSENT_ENGINE` remains `false` in
      production environment.
- [ ] Compliance officer sign-off recorded.

## Print validation checklist

- [ ] `@page` declaration present with `size: A4` and 18mm margins.
- [ ] Risk, declaration, warning, signature, and audit-footer blocks
      do NOT split across pages in print preview.
- [ ] Section headings are not orphaned at the bottom of pages.
- [ ] Document prints correctly via the page's *Print / Save as PDF*
      button in at least two browsers.
- [ ] Document prints correctly when the deterministic PDF binary
      preview is exercised (or the 501 controlled fallback is observed).

## Arabic RTL checklist

> Heuristic checks only. Final production readiness for Arabic
> typesetting is **not** claimed by this pilot.

- [ ] `<html dir="rtl">` set when `language=ar`.
- [ ] Arabic regions carry `lang="ar"`.
- [ ] Arabic glyphs render without tofu / fallback boxes on the
      reviewer's machine.
- [ ] Bilingual layout preserves mixed-script paragraphs without
      reordering.
- [ ] Punctuation in Arabic blocks reads naturally (no Latin curly
      quotes inside Arabic-tagged blocks).
- [ ] Arabic-fluent reviewer has signed off on each specialty demo.

## PDF evidence checklist

- [ ] Audit hash matches `audit.hash` reported by
      `/api/internal/dynamic-consent/preview?evidence=true`.
- [ ] Suggested filename follows the deterministic pattern
      `wathiqcare-consent-preview__<templateId>__v<version>__<mrn>__<case>__<evidenceId>.pdf`.
- [ ] Evidence ID is consistent across the HTML preview, evidence
      panel, downloadable PDF, and verification preview.
- [ ] Verification preview opens via the *Open Verification Preview*
      button on the evidence panel.
- [ ] Verification preview always declares
      `status: PREVIEW_ONLY` and `authenticity:
      preview-not-legally-binding`.

## Known limitations

- No DB lookup performed by the verification preview.
- No real QR code rendered — placeholder only.
- No signer chain validation — placeholder only.
- No automated cross-browser pixel-comparison.
- Arabic typesetting depends on the host's installed fonts.
- The `puppeteer-core` + `@sparticuz/chromium` renderer may be absent
  on some environments; in that case the PDF endpoint returns the
  controlled 501 envelope and the HTML print-to-PDF fallback remains
  available.

## Go / No-Go criteria

| # | Criterion | Status |
| - | --- | --- |
| 1 | All sections of this checklist signed off | ⏳ |
| 2 | Validation API reports `overallStatus: PASS` or `WARNING` (no `FAIL`) for each tested specialty + language combination | ⏳ |
| 3 | Determinism validator reports zero drifts across N=3 runs | ⏳ |
| 4 | Arabic-fluent reviewer sign-off | ⏳ |
| 5 | Legal counsel sign-off | ⏳ |
| 6 | Compliance officer sign-off | ⏳ |
| 7 | Operations runbook updated for renderer capability gate | ⏳ |
| 8 | Production code paths confirmed untouched by a final code-review pass | ⏳ |

**Go** requires all eight criteria signed off.
**No-Go** on any single criterion blocks promotion.

## Rollback plan

- All Phase 4–7 work is contained in additive commits. To revert:

  ```
  git revert <phase7-sha> <phase6-sha> <phase5-sha> <phase4-sha>
  ```

  Removes all dynamic-consent preview routes, validators,
  verification portal preview, and pilot docs. No data migration is
  involved. No production workflow is affected.

- The preview Vercel deployment can be removed via the Vercel
  dashboard; production aliases (`wathiqcare.online`) are not bound to
  it and are unaffected.

## Production activation conditions

Production activation (flipping
`ENABLE_DYNAMIC_CONSENT_ENGINE=true` in production and creating the
public `/verify/<evidenceId>` route) requires **all** of the
following:

1. All Go-criteria above signed off.
2. Persisted-evidence schema design reviewed (no schema work done in
   Phases 1–7).
3. Real QR encoding wired and reviewed.
4. Real signer-chain validation implemented and reviewed.
5. Penetration-test sign-off on the public verification route.
6. Backout / kill-switch documented for the operations team.
7. A staged production rollout plan (single tenant → multi-tenant)
   approved by leadership.

Until those conditions are met, the dynamic consent engine remains
internal preview only.
