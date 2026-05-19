# Deterministic PDF Binary Preview Pipeline (Phase 5)

> **Status:** Internal, feature-gated preview / proof-of-concept only.
> **Not** wired into the production informed-consent workflow.
> The production PDF renderer (`apps/web/src/lib/core/pdf-core.ts` and
> `apps/web/src/lib/server/legal-case-pdf-service.ts`) is **untouched**.

## Purpose

Phase 5 introduces a parallel, internal-only deterministic PDF binary preview
for the dynamic-consent engine. It builds the existing Phase 3 legal-grade
HTML preview and the Phase 4 evidence package, then **attempts** to convert
the HTML to a real PDF binary via the already-installed Puppeteer +
@sparticuz/chromium stack.

If the renderer is not loadable at runtime, the route returns a controlled
**501** JSON pointing the caller back to the HTML preview and the
browser-side "Print / Save as PDF" fallback. There is no path through which
this preview can affect production output.

## Dependency capability result

| Package                | Found in `apps/web/package.json` | Used by Phase 5? |
| ---------------------- | -------------------------------- | ---------------- |
| `puppeteer`            | ✅ `^24.42.0`                     | no (avoided to skip Chromium download mismatch) |
| `puppeteer-core`       | ✅ (transitive, used by `pdf-core.ts`) | ✅ dynamic-imported |
| `@sparticuz/chromium`  | ✅ `^138.0.2`                     | ✅ dynamic-imported |
| `@react-pdf/renderer`  | ❌                                | n/a              |
| `pdf-lib`              | ❌                                | n/a              |
| `pdfkit`               | ❌                                | n/a              |
| `html-pdf`             | ❌                                | n/a              |
| `@playwright/test`     | ✅ dev only                       | not used at runtime |

**No new dependencies were added.** Phase 5 only dynamic-imports modules
that are already on disk and are already used by the production renderer.

### Capability status

`detectPdfBinaryRendererCapability()` performs three probes:

1. `import("puppeteer-core")` → fails ⇒ `PUPPETEER_CORE_MISSING`
2. `import("@sparticuz/chromium")` → fails ⇒ `CHROMIUM_MISSING`
3. `chromium.executablePath()` returns falsy or throws ⇒ `EXECUTABLE_PATH_UNAVAILABLE`

All three succeed ⇒ capability `available: true`, renderer id
`"puppeteer-core+sparticuz-chromium"`. The result is cached per-process.

> On Windows developer machines that have not yet warmed the Chromium binary
> via `@sparticuz/chromium`, the executable-path probe may legitimately fail.
> That is by design — the route returns 501 and the HTML preview path stays
> active.

## Module layout

```
apps/web/src/modules/consent-engine/pdf-binary/
├── pdf-binary-types.ts          # types only
├── pdf-renderer-capabilities.ts # capability detection (cached, dynamic import)
├── pdf-metadata.ts              # deterministic PDF metadata from evidence pkg
├── pdf-filename.ts              # deterministic .pdf filename
├── html-to-pdf-preview.ts       # Puppeteer launch + page.pdf()
└── index.ts                     # barrel
```

All functions are pure or rely only on `puppeteer-core` / `@sparticuz/chromium`
via dynamic `import()`. The module never reaches out to the network for
fonts, assets, or telemetry; `page.setContent(html, { waitUntil: "domcontentloaded" })`
is used so external resource fetches do not block (and are not relied on).

## Route

```
GET /api/internal/dynamic-consent/pdf-preview
    ?engine=dynamic-preview
    &renderer=legal-grade
    &evidence=true
    &demo=cardiology
    &language=bilingual
```

Required guards (returns 403 / 400 otherwise):

- `requireAuth` passes (same auth as the existing preview route).
- `ENABLE_DYNAMIC_CONSENT_ENGINE=true` **or** `?engine=dynamic-preview`.
- `?renderer=legal-grade`.
- `?evidence=true`.

### Success (200)

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="<deterministic>.pdf"`
- `X-WC-Preview: dynamic-consent-pdf-binary`
- `X-WC-Renderer: puppeteer-core+sparticuz-chromium`
- `X-WC-Evidence-Id`, `X-WC-Audit-Hash` for cross-checking.

### Unavailable (501)

```json
{
  "success": false,
  "code": "PDF_BINARY_RENDERER_UNAVAILABLE",
  "reasonCode": "EXECUTABLE_PATH_UNAVAILABLE",
  "message": "No approved PDF binary renderer is available in this environment.",
  "detail": "Chromium executable path could not be resolved in this environment.",
  "htmlPreviewAvailable": true,
  "printToPdfFallback": true,
  "suggestedHtmlPreviewUrl": "/api/internal/dynamic-consent/preview?engine=dynamic-preview&renderer=legal-grade&evidence=true&demo=cardiology&language=bilingual"
}
```

The preview page surfaces this controlled warning:
> "PDF binary renderer unavailable; use Print / Save as PDF for now."

## Determinism guarantees

- **Filename:** `wathiqcare-consent-preview__<templateId>__v<version>__<mrn>__<case>__<evidenceId>.pdf`,
  derived deterministically from the evidence package.
- **PDF metadata** (Title/Author/Subject/Keywords/Creator/Producer): derived
  from the evidence package, no `Date.now()` or random suffixes. `generatedAt`
  is sourced from the dynamic-consent build result (already deterministic for
  a given payload).
- **Page geometry:** A4, 18mm margins on all sides, `printBackground: true`,
  `preferCSSPageSize: false`. Same inputs ⇒ same layout.
- **Hashes:** `templateHash`, `payloadHash`, `auditHash` are the existing
  Phase 3 / Phase 4 SHA-256 hashes — same inputs ⇒ same outputs.
- **Network:** no remote fonts, no remote scripts, no external CDN fetches.

## Font and Arabic safety

This preview does **not** embed external/internet fonts. The legal-grade
renderer relies on Chromium's bundled fonts for the HTML body and on `lang=ar`
attributes for shaping. Real-world Arabic typesetting fidelity for legal
distribution is **not guaranteed** by this preview and must not be claimed as
production-ready. The HTML preview path (RTL-aware) remains available for
visual review.

Future approved enhancement: ship a vetted licensed Arabic font (e.g. Noto
Sans Arabic) bundled with the renderer and reference it via a local
`@font-face` rule, behind its own opt-in flag.

## Why the production PDF renderer is untouched

- The production renderer at `apps/web/src/lib/core/pdf-core.ts` and the
  service at `apps/web/src/lib/server/legal-case-pdf-service.ts` are **not
  imported** anywhere in `pdf-binary/` or the new `pdf-preview/` route.
- Phase 5 lives entirely under `apps/web/src/modules/consent-engine/pdf-binary/`
  and `apps/web/app/api/internal/dynamic-consent/pdf-preview/`.
- No `/api/informed-consents/**` route is read, called, modified, or aliased.
- Prisma schema, migrations, auth, RBAC, TrakCare, patient search, and
  `generate-draft` are not touched.
- The feature flag `ENABLE_DYNAMIC_CONSENT_ENGINE` still defaults to `false`.

## Fallback strategy

1. **Renderer unavailable at runtime** → route returns 501; page shows the
   amber warning and keeps the **Print / Save as PDF** button active.
2. **Renderer throws mid-render** → caught in the route; same 501 envelope
   with `reasonCode: "UNKNOWN_ERROR"`. No 500 is propagated to the client.
3. **User has no auth** → existing `requireAuth` ⇒ 401.
4. **Feature flag disabled** → 403 with hint.

The HTML preview path (`/api/internal/dynamic-consent/preview?...&evidence=true`)
is always available as the source of truth.

## Future approved options

- **Embedded local Arabic font** (e.g. Noto Naskh Arabic) with `@font-face`.
- **`pdf-lib` post-processing** to write proper XMP / Info-dictionary
  metadata (Title/Author/Subject/Keywords) deterministically into the PDF
  after Chromium produces it.
- **Real QR encoding** via the `qrcode` package (currently a placeholder).
- **Public `/verify/<evidenceId>` portal** backed by a verification store.
- **Approved renderer pinning**: switch from `@sparticuz/chromium`'s rolling
  binary to a pinned Chromium revision for true byte-level determinism.
- **Production wiring** is **out of scope** for this phase and requires its
  own RFC, legal sign-off, and migration plan.

## Rollback

1. Delete `apps/web/src/modules/consent-engine/pdf-binary/`.
2. Delete `apps/web/app/api/internal/dynamic-consent/pdf-preview/`.
3. Revert the additive changes in
   [apps/web/app/internal/dynamic-consent-preview/page.tsx](../apps/web/app/internal/dynamic-consent-preview/page.tsx)
   — specifically: the `pdfDownloading` / `pdfNotice` state, the
   `handleDownloadPdf` callback, the **Download Experimental PDF** button,
   and the inline notice block.
4. Delete this file.

`git revert <commit>` is equivalent. All Phase 1–4 behavior is preserved
because every Phase 5 change is purely additive and gated behind
`?evidence=true` + `?renderer=legal-grade`.
