# Legal Evidence PDF Preview Pipeline (Phase 4)

> **Status:** Internal preview / proof-of-concept only.
> Not connected to production informed-consent workflow.
> No production PDF renderer, route, or schema is modified.

## Purpose

Phase 4 introduces a **parallel, internal-only** "Legal Evidence PDF Preview" pipeline
for the dynamic-consent engine. The goal is to demonstrate what a court-grade evidence
envelope around a rendered consent will look like — without coupling any of it to:

- the production informed-consent workflow
- the production PDF renderer (`renderers/html-renderer.ts` and the `/api/informed-consents/**` family)
- Prisma schema / migrations
- TrakCare, patient search, generate-draft
- auth and RBAC contracts

The preview is reachable only through the existing internal preview API and page, and
only when the dynamic-consent feature flag (or the `?engine=dynamic-preview` override) is
active. All output is HTML; no real PDF binaries are produced, persisted, or stored.

## Module layout

```
apps/web/src/modules/consent-engine/pdf-evidence/
├── evidence-types.ts       # EvidencePackage, LegalEvidencePdfPreviewInput/Output
├── evidence-hash.ts        # canonicalJsonStringify, sha256Hex, hashJson, deriveEvidenceId
├── verification-url.ts     # buildVerificationUrl
├── qr-placeholder.ts       # buildEvidenceQrPlaceholder (isReal: false)
├── evidence-package.ts     # buildEvidencePackage + LEGAL_FOOTER
├── pdf-preview-adapter.ts  # buildLegalEvidencePdfPreview, suggested filename helper
└── index.ts                # barrel
```

All functions are pure and use only Node `crypto` — no I/O, no DB, no network.

### Evidence ID

`deriveEvidenceId(...parts)` → `EV-<14 hex chars uppercase>`, derived deterministically
from `(templateId, templateVersion, patientMrn, encounterNo, caseNumber, auditHash,
generatedAt)`. Same inputs always produce the same evidence ID — useful for repeatable
internal demos.

### Verification URL

`https://wathiqcare.online/verify/<evidenceId>` (or override with `baseUrl`). The
`/verify/<id>` portal is **not yet live**; the URL is reserved for the follow-up phase.

### QR placeholder

The current implementation emits a textual placeholder of the form
`WC|<evidenceId>|<auditHashShort>|<verificationUrl>` with `isReal: false`. Wiring a real
QR encoder (e.g. `qrcode` package) is a follow-up.

### Suggested filename

`wathiqcare-consent-preview__<templateId>__v<version>__<mrn>__<case>__<evidenceId>.html`
— sanitized, lowercase, ASCII-safe. `.html` (not `.pdf`) intentionally signals that this
is preview output, not a binary PDF.

## API surface

Preview endpoint (unchanged path, additive flag):

```
GET /api/internal/dynamic-consent/preview
    ?engine=dynamic-preview
    &renderer=legal-grade
    &evidence=true
    &demo=cardiology
    &language=bilingual
```

When `evidence=true`, the JSON response gains:

```json
{
  "evidence": {
    "evidenceId": "EV-AB12CD34EF5678",
    "templateId": "consent.cardiology.cath.v1",
    "templateVersion": "1.0.0",
    "patientMrn": "IMC-2026-02000",
    "encounterNo": "ENC-UAT-2026-0001",
    "caseNumber": "CASE-2026-0001",
    "generatedAt": "2026-01-01T00:00:00.000Z",
    "generatedBy": "doctor@example.com",
    "auditHash": "<sha256 hex>",
    "templateHash": "<sha256 hex>",
    "payloadHash": "<sha256 hex>",
    "verificationUrl": "https://wathiqcare.online/verify/EV-AB12CD34EF5678",
    "qrPlaceholder": {
      "payload": "WC|EV-AB12CD34EF5678|<short>|https://wathiqcare.online/verify/EV-AB12CD34EF5678",
      "label": "QR\nRESERVED\n<short>",
      "isReal": false
    },
    "legalFooter": "WathiqCare™ Evidence-Ready • Chain-of-Custody Protected — جاهز كدليل قانوني — محمي بسلسلة الإسناد"
  },
  "verificationUrl": "https://wathiqcare.online/verify/EV-AB12CD34EF5678",
  "suggestedFilename": "wathiqcare-consent-preview__consent-cardiology-cath-v1__v1-0-0__imc-2026-02000__case-2026-0001__ev-ab12cd34ef5678.html",
  "contentType": "text/html-preview"
}
```

When `evidence` is absent or not `true`, the response is byte-for-byte the same as Phase 3.

The `POST` branch supports the same `?evidence=true` flag and emits the same envelope.

## Preview page

`/internal/dynamic-consent-preview` gains:

- An **Evidence: ON / OFF** toggle next to the renderer/demo/language controls.
- An **Evidence Package** panel (rendered only when evidence is ON and a package is
  present) showing evidence ID, hashes, suggested filename, generated-by, verification
  URL (as a clickable `<a target="_blank" rel="noopener noreferrer">`), QR placeholder
  payload, and the bilingual legal footer.
- The existing **Print preview** button is relabeled **Print / Save as PDF** — it still
  calls `iframe.contentWindow.print()`, which lets the browser's native print dialog
  produce a PDF via "Save as PDF". No server-side PDF binary is generated.

The preview page never adds production navigation entries; it remains feature-gated.

## How to test locally

1. Either set `ENABLE_DYNAMIC_CONSENT_ENGINE=true` or use the `?engine=dynamic-preview`
   override.
2. Authenticate as any user (the preview route still requires `requireAuth`).
3. Open:

   ```
   /api/internal/dynamic-consent/preview?engine=dynamic-preview&renderer=legal-grade&evidence=true&demo=cardiology&language=bilingual
   ```

   or visit:

   ```
   /internal/dynamic-consent-preview?evidence=true
   ```

4. Toggle the **Evidence** chip and the Evidence Package panel will appear/disappear.
5. Use **Print / Save as PDF** to export the iframe contents via the browser's print
   dialog.

## Guarantees / non-changes

- The production PDF renderer at `renderers/html-renderer.ts` is **untouched**.
- Routes under `apps/web/app/api/informed-consents/**` are **untouched**.
- Prisma schema, migrations, auth, RBAC, TrakCare, patient search, generate-draft are
  **untouched**.
- The feature flag `ENABLE_DYNAMIC_CONSENT_ENGINE` still defaults to `false`. No
  production navigation links to this preview surface.
- No PDFs are written to disk. No database writes. No external network calls.

## Rollback

To remove the Phase 4 changes:

1. Delete `apps/web/src/modules/consent-engine/pdf-evidence/`.
2. In `apps/web/app/api/internal/dynamic-consent/preview/route.ts`:
   - Remove the import block `from "@/modules/consent-engine/pdf-evidence"`.
   - Remove the `isEvidenceRequested`, `buildEvidencePreviewForResult` helpers.
   - Remove the `wantEvidence` / `evidencePreview` / `evidencePackage` blocks and the
     `evidence` / `verificationUrl` / `suggestedFilename` / `contentType` fields from
     both the GET and POST response bodies.
   - Restore `await requireAuth(request)` (without capturing `auth`/`generatedBy`).
3. In `apps/web/app/internal/dynamic-consent-preview/page.tsx`:
   - Remove the `EvidencePackage` / `EvidenceQrPlaceholder` interfaces and evidence
     fields from `PreviewResponse`.
   - Remove `evidenceEnabled` state, the `evidence=true` URL parameter logic, the
     Evidence toggle button, and the Evidence Package panel.
   - Rename the button back to **Print preview** if desired (label-only).
4. Delete this file (`docs/legal-evidence-pdf-preview-pipeline.md`).

All Phase 1–3 behavior is preserved because every Phase 4 change is additive and
behind the `?evidence=true` opt-in.

## Future work

- Real PDF binary generation (puppeteer or `pdf-lib`) wired behind a second opt-in.
- Real QR encoding (e.g. the `qrcode` npm package).
- Public `/verify/<evidenceId>` portal backed by a verification store.
- Persistence of evidence packages (Prisma model + migration, behind its own flag).
- Cryptographic signing of the audit hash (e.g. Ed25519) and signed envelope export.
