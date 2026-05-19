# Signed Informed Consent — End-to-End Internal Preview

> **INTERNAL PREVIEW ONLY — NOT ACTIVE IN PRODUCTION.**
> UAT / sample data only. No production renderer is replaced.
> No production informed-consent workflow is modified. No
> database write occurs. No public verification route is exposed.

This document describes the controlled preview surface for the
end-to-end signed informed-consent PDF workflow with barcode / QR
verification evidence.

## Purpose

Demonstrate a complete internal preview of the dynamic-consent
"legal-grade" pipeline:

1. Build a consent payload from UAT sample data.
2. Render the bilingual (Arabic + English) consent HTML.
3. Apply **simulated** patient, physician, and witness signatures.
4. Generate the deterministic evidence package
   (`evidenceId`, audit hash, template version, QR placeholder
   payload, verification URL).
5. Either return a binary PDF or fall back to a controlled
   `501 PDF_BINARY_RENDERER_UNAVAILABLE` envelope that points at
   the print-to-PDF preview page.

The preview proves the engine is end-to-end ready *without*
touching any production code path.

## Safety Boundaries

The following are explicitly **NOT** done by this preview:

- No replacement of the production informed-consent renderer
  (`apps/web/src/lib/core/pdf-core.ts`).
- No modification of `apps/web/src/lib/server/legal-case-pdf-service.ts`.
- No modification of `/api/informed-consents/**`.
- No modification of `generate-draft`, patient search, or mock
  encounter logic.
- No modification of auth, session, RBAC, Prisma schema, or
  migrations.
- No TrakCare or any external clinical-system call.
- No production-domain aliasing.
- No production deployment.
- No global feature flag enablement.
- No database write — the evidence package is built in-memory
  and discarded after the response.
- No public verification route — verification preview remains
  under `/internal/verify/...?engine=dynamic-preview`.
- No real PHI — patient data is fixed UAT sample only.

## How to Access

The preview is gated by an explicit query parameter and the
production feature flag remains `false`.

Preview page:

```
/internal/dynamic-consent-signed-preview?engine=dynamic-preview
```

API endpoint (used by the page):

```
GET /api/internal/dynamic-consent/signed-pdf?engine=dynamic-preview&signed=true&format=html&language=bilingual
GET /api/internal/dynamic-consent/signed-pdf?engine=dynamic-preview&signed=true&language=bilingual
```

Both routes require an authenticated session
(`requireAuth(request)`). Unauthenticated requests are rejected
by the standard `handleApiError` 401 path.

## How to Generate the Signed PDF

From the preview page:

1. Navigate to
   `/internal/dynamic-consent-signed-preview?engine=dynamic-preview`.
2. The page fetches `format=html` from the signed-pdf endpoint
   and renders the bilingual consent inside an embedded iframe,
   overlaid with simulated signature badges and the evidence
   QR / barcode block.
3. Click **Print / Save as PDF** for the deterministic in-browser
   print-to-PDF fallback (always available).
4. Click **Download Signed Preview PDF** for the binary PDF
   produced by the headless renderer.
5. On environments without a binary renderer the button surfaces
   the controlled fallback message:
   *"PDF binary renderer unavailable in this environment. Use
   Print / Save as PDF instead."*

The PDF filename is deterministic:

```
wathiqcare-signed-informed-consent-preview-{evidenceId}.pdf
```

## Expected QR / Barcode Behavior

The QR / barcode block is a **visual placeholder**. No real QR
code is generated. The placeholder payload follows the existing
evidence-package contract:

```
WC|{evidenceId}|{shortAuditHash}|{verificationUrl}
```

In the in-page block the payload is rendered as text inside a
dashed box. In the signed PDF the payload is additionally
visualized as a deterministic dotted pseudo-QR SVG (a stable
hash-driven 8×8 grid) — clearly labelled as a placeholder.

The block shows:

- Evidence ID
- Short audit hash (first 12 characters)
- Template version
- Verification URL: `/internal/verify/{evidenceId}?engine=dynamic-preview`
- The "INTERNAL PREVIEW ONLY — NOT ACTIVE IN PRODUCTION" banner

## Fallback Behavior

If `@sparticuz/chromium` cannot resolve an executable in the
current environment (or any other binary-renderer failure
occurs), the endpoint returns:

```
HTTP/1.1 501 Not Implemented
Content-Type: application/json

{
  "success": false,
  "code": "PDF_BINARY_RENDERER_UNAVAILABLE",
  "htmlPreviewAvailable": true,
  "printToPdfFallback": true,
  "message": "Use Print / Save as PDF from the preview page.",
  "suggestedHtmlPreviewPath": "/internal/dynamic-consent-signed-preview",
  "detail": "<reason>"
}
```

The preview page surfaces this status inline and the
**Print / Save as PDF** button continues to work.

## Verification Preview Behavior

The **Open Verification Preview** button opens
`/internal/verify/{evidenceId}?engine=dynamic-preview` in a new
tab. This is the existing internal verification surface
introduced in Phase 7. The button is disabled until the evidence
package has been loaded.

## Known Limitations

- Signatures are **simulated** — they are presentation-only and
  carry no legal weight. The method label is
  `PREVIEW_SIMULATED_SIGNATURE` and is included in the signed
  HTML, the response headers (`X-WC-Signing-Method`), and the
  visible signature cards.
- No e-signature service, OTP, biometric capture, or DocuSign
  integration is connected.
- The QR / barcode block is a visual placeholder; no scannable
  QR is encoded.
- The evidence package is in-memory only; no database write.
- The fixed UAT sample is hard-coded server-side and cannot be
  overridden by query parameters (other than `language`).
- Page is internal-only; production navigation has no link.

## Production Activation Requirements

Before any of this surface can be considered for production,
the following must be in place and signed off:

1. Real e-signature service integration with cryptographic
   non-repudiation (OTP, biometric, or qualified e-signature).
2. Real QR / barcode generator producing a scannable code with
   tamper-evident payload signing.
3. Production verification portal (public, rate-limited,
   audit-logged) replacing the internal-only preview.
4. Persisted evidence records (DB + WORM/object-store) with
   migration plan, retention policy, and Prisma schema changes.
5. Production renderer parity review with
   `apps/web/src/lib/core/pdf-core.ts` — explicit decision on
   whether the legal-grade renderer replaces or augments the
   production renderer.
6. Full security review (auth, RBAC, PHI handling, PDPL/HIPAA).
7. Pilot rollout completion through the controlled pilot
   pipeline described in `docs/pilot-rollout-and-rollback.md`.

## Rollback Steps

This preview is **additive only** — rollback is trivial.

1. Remove the route directory:
   `apps/web/app/api/internal/dynamic-consent/signed-pdf/`
2. Remove the page directory:
   `apps/web/app/internal/dynamic-consent-signed-preview/`
3. Remove this document:
   `docs/signed-informed-consent-preview-e2e.md`
4. Run `npm run lint` and `npm run build` from `apps/web` to
   confirm the workspace remains green.

No database migrations, no environment-variable changes, no
production configuration changes are required for rollback.
The feature flag `ENABLE_DYNAMIC_CONSENT_ENGINE` remains
`false` in all environments throughout.
