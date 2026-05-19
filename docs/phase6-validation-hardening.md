# Phase 6 — Validation & Hardening Suite

> Internal-only validation pass for the dynamic-consent **preview**
> pipeline (legal-grade renderer + evidence package + deterministic PDF
> binary preview).
>
> **No** production code paths, Prisma schema, migrations, RBAC, auth,
> TrakCare integration, informed-consent routes, patient search, or
> production workflows are modified by this phase. All work is
> preview-only, feature-gated, additive, and fully reversible by
> `git revert` of the Phase 6 commit.

## 1. Scope

This phase **only**:

- Adds a `validation/` module under
  `apps/web/src/modules/consent-engine/`.
- Adds one internal-only API route:
  `apps/web/app/api/internal/dynamic-consent/validation/route.ts`.
- Adds an in-page **Run Validation** panel to
  `/internal/dynamic-consent-preview`.
- Adds a static screenshot manifest under
  `qa-screenshots/dynamic-consent/`.
- Adds this documentation.

It does **not** add new dependencies, modify production renderers,
modify the existing preview API, or expose any production navigation.

## 2. Validators

| Validator | File | Purpose |
| --- | --- | --- |
| `validation-report` | `validation-report.ts` | Shared types, status roll-up |
| `rtl-validator` | `rtl-validator.ts` | Arabic glyph presence, `dir="rtl"`, `lang="ar"`, mixed-language hints |
| `signature-layout-validator` | `signature-layout-validator.ts` | Signature container + block presence, `page-break-inside: avoid` rules |
| `print-layout-validator` | `print-layout-validator.ts` | `@page` rule, A4 sizing, per-class page-break protections, `@media print` |
| `pdf-layout-validator` | `pdf-layout-validator.ts` | HTML shell, embedded `<style>`, no remote stylesheets/scripts, audit footer presence |
| `specialty-preview-validator` | `specialty-preview-validator.ts` | Round-trip each `SPECIALTY_DEMOS` payload through engine + renderer; assert structural completeness |
| `deterministic-validator` | `deterministic-validator.ts` | Run each demo `n=3` times; assert byte-identical `audit.hash`, `payloadFingerprint`, HTML, template hash, suggested filename |
| `screenshot-manifest` | `screenshot-manifest.ts` | Static manifest of visual captures the QA operator must collect |

## 3. Validation Status Semantics

Each check returns one of:

- `PASS` — invariant verified.
- `WARNING` — non-critical heuristic miss (e.g. Arabic punctuation
  collision). Does **not** block.
- `FAIL` — structural invariant violated. Investigate before any
  promotion of the preview to UAT-adjacent environments.
- `SKIPPED` — check intentionally not applicable (e.g. RTL checks under
  `language=en`).

Section status is the worst of its child checks; overall status is the
worst of its sections.

## 4. RTL / Arabic findings

The RTL validator is **heuristic-only**. It verifies that:

- Arabic-range Unicode codepoints are present when
  `language !== "en"`.
- `dir="rtl"` is emitted (the legal-grade renderer sets it at the
  `<html>` level for `language=ar`).
- `lang="ar"` attributes are present on Arabic regions for bilingual
  renders.
- Bilingual structural markers (`lg-bilingual`, `lg-lang-ar`) exist.
- No Latin curly quotation marks leak into Arabic-tagged blocks.

**Arabic typesetting production readiness is NOT claimed by this
phase.** Visual review by an Arabic-language reviewer is still required
before any production-adjacent rollout.

## 5. PDF / HTML layout findings

- The legal-grade renderer emits a single self-contained HTML document
  with an embedded `<style>` block.
- No remote stylesheet or script tags are emitted.
- The `lg-audit-footer` is always present.
- `@page` rules and per-class `page-break-inside: avoid` rules are
  present for the critical content blocks
  (`.lg-section`, `.lg-risk`, `.lg-signature-block`, `.lg-audit-footer`,
  `.lg-declaration`, `.lg-warning`, `.lg-legal-item`).

The deterministic PDF binary preview pipeline introduced in Phase 5
uses `puppeteer-core` + `@sparticuz/chromium` already declared in
`package.json` — **no new dependencies** are added in Phase 6.

## 6. Print findings

- `@page` declaration present with `size: A4` and 18mm margins.
- `@media print` block present.
- Section, risk, signature, audit-footer, declaration, warning, and
  legal-item blocks all carry break-inside avoidance.
- The signature container also carries page-break-inside protection so
  the signature zone stays on one page even when content shifts above
  it.

## 7. Deterministic findings

For each of the six published specialty demos (cardiology,
general-surgery, orthopedics, anesthesia, dama, blood-transfusion),
the engine + legal-grade renderer + evidence adapter are executed
`n=3` times. The validator asserts byte-equality of:

- `audit.hash`
- `audit.payloadFingerprint`
- rendered legal-grade HTML
- `hashJson(template)`
- evidence-adapter `suggestedFilename`

Any drift is reported in the `determinismDrifts` array of the API
response with the offending field and a short-form before/after.

## 8. Screenshot manifest

The screenshot capture plan is enumerated in
[apps/web/src/modules/consent-engine/validation/screenshot-manifest.ts](../apps/web/src/modules/consent-engine/validation/screenshot-manifest.ts)
and mirrored at
[qa-screenshots/dynamic-consent/manifest.json](../qa-screenshots/dynamic-consent/manifest.json).

No PNG/PDF binaries are checked into source control — captures are
collected per-environment by the QA operator and attached to the
validation report ticket.

## 9. Browser limitations

- **No automated cross-browser comparison** is performed in Phase 6.
  The validators are static (regex / structural) and deterministic
  (engine output equality). Automated Chrome vs Edge vs Safari
  rendering diffing is intentionally out of scope.
- The `puppeteer-core` + `@sparticuz/chromium` binary may be absent on
  developer Windows boxes. The `pdf-preview` endpoint returns a clean
  `501` envelope in that case and the page surfaces a non-blocking
  amber notice; the `Print / Save as PDF` fallback remains available.
- Arabic font shaping depends on the host's available fonts. Captures
  collected on a system without an Arabic-capable system font will
  reflect glyph fallback, not the intended typesetting.

## 10. Production readiness assessment

**The dynamic-consent preview pipeline (Phases 1–6) is NOT production
ready.** It remains:

- Internal-only.
- Feature-gated via `ENABLE_DYNAMIC_CONSENT_ENGINE` (default `false`).
- Gated behind `?engine=dynamic-preview` query opt-in for non-flagged
  environments.
- Behind explicit `?renderer=legal-grade` and `?evidence=true` opt-ins
  for the deterministic PDF binary endpoint.
- Authenticated (`requireAuth(request)`).
- Read-only — no DB writes, no document creation, no patient record
  mutation, no TrakCare calls.

Production rollout requires, at minimum:
- Independent Arabic-language reviewer sign-off.
- Independent medico-legal counsel sign-off on legal statements and
  declarations.
- UAT capture set collected per `manifest.json` across at least two
  browsers.
- Operations runbook updates for the deterministic PDF renderer
  capability gate.

## 11. Confirmation: production untouched

- Production renderer at `apps/web/src/lib/core/pdf-core.ts` — **NOT
  modified**.
- Production informed-consent routes at
  `apps/web/app/api/informed-consents/**` — **NOT modified**.
- Prisma schema and migrations — **NOT modified**.
- Auth / RBAC modules — **NOT modified**.
- TrakCare integration — **NOT modified**.
- Patient search and generate-draft flows — **NOT modified**.
- Feature flag default (`ENABLE_DYNAMIC_CONSENT_ENGINE = false`) — **NOT
  modified**.

## 12. Rollback

```
git revert <phase-6-commit-sha>
```

This removes:

- `apps/web/src/modules/consent-engine/validation/*`
- `apps/web/app/api/internal/dynamic-consent/validation/route.ts`
- the validation panel additions in
  `apps/web/app/internal/dynamic-consent-preview/page.tsx`
- `qa-screenshots/dynamic-consent/*`
- this document

No data migrations or production wiring is involved, so the revert is
fully reversible with no operational impact.
