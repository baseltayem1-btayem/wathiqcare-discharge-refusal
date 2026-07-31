# Physician Journey Complementary Correction Report

## Branch / Commit Context

- Branch: `feature/patient-send-physician-final-step`
- Starting HEAD: `46e152de2335e34327f2816713616fc8a09a48a5`
- Commit subject (planned): `fix(consents): complete bilingual PDF preview and readiness`
- Protected commits preserved: `4196edb9`, `6e6552b4`, `a56ea44f`, `8f44cfa0`, `c4b9a005`, `46e152de`
- No push, deploy, or remote database actions taken.

## Root Causes Addressed

1. **Embedded PDF viewer 401 / empty canvas**
   - `PdfObjectEmbedViewer` loaded the PDF source without credentials, so authenticated routes returned 401.
   - CSP did not allow `object-src`/`frame-src`/`worker-src` for the PDF.js canvas renderer.
   - Stale renders from overlapping effect runs created blank canvases or revoked valid object URLs.

2. **Draft PDF race conditions**
   - `ProductionPhysicianWorkspace` did not guard against stale async results; an in-flight render could overwrite a newer result or leak object URLs.

3. **Bilingual field population incomplete**
   - The overlay engine stamped mapped fields only on the `DEFAULT` language target; the Arabic target remained blank.
   - Patient date-of-birth, gender, physician name, designation, license, signature date/time were not forwarded into the PDF auto-value resolver.

4. **Physician signature missing or tiny**
   - Signature placement used only one language target.
   - Very small mapped rectangles produced invisible signatures.

5. **Guardian signature area left blank**
   - When no guardian signature was required, the mapped rectangle remained empty, appearing unfinished.

6. **Baked-in pagination wrong**
   - The approved IMC source PDF contains "Page X of 1"; the overlay did not mask and redraw the footer for the final two-page document.

7. **Readiness model inconsistent**
   - `useProductionWorkspace` computed readiness in an ad-hoc `useMemo`; send gating, the checklist UI, and progress used divergent logic.

## Changes Made

### Canonical readiness aggregate
- Added `apps/web/src/lib/server/physician-journey-readiness.ts` with a pure `computePhysicianJourneyReadiness` function.
- Items have statuses `COMPLETE | BLOCKED | REQUIRED | NOT_APPLICABLE`.
- Progress, blocker keys, missing keys, and send gating derive from the same item array.
- `NOT_APPLICABLE` items count as satisfied and are visually distinct.

### PDF viewer
- Rewrote `PdfObjectEmbedViewer.tsx` to use `pdfjs-dist/build/pdf.mjs` with `withCredentials: true`.
- Added render-token disposal, object-URL cleanup, page count display, and compact error UI with retry, open-in-tab, and mapping/settings navigation.
- Added correlation ID and status classification.

### CSP / Next.js config
- Updated `apps/web/next.config.js` to add `object-src 'self' blob:`, `frame-src 'self'`, `worker-src 'self' blob:`.

### Draft PDF race safety
- Added `disposed` guard and stale-result revocation in `ProductionPhysicianWorkspace`.
- Reset downstream state (`draftApproved`, `previewReviewed`, `signingResult`, etc.) when physician completion, signature, or anesthesia decision changes.

### Bilingual overlay and metadata
- Updated `buildProductionMappedTextOverlayHtml` to render both `coordinates` and `arabicCoordinates`.
- Updated `resolveProductionMappingAutoValues` to consume `dob`, `gender`, `physicianName`, `physicianDesignation`, `physicianLicense`, `physicianSignedDate`, `physicianSignedTime`.
- Updated `consent-document-create-service.ts`, `documents/route.ts`, and `physician-signature/route.ts` to persist and forward the new metadata fields.
- Expanded `adenotonsillectomy.mapping.ts` with bilingual physician-signature targets and physician metadata fields.

### Signature and pagination rendering
- Rewrote `drawProductionMappedSignature` to draw on both `DEFAULT` and `ARABIC` placements and enforce a minimum visible rectangle.
- Added `drawPaginationOverlay` to mask the source footer and draw correct `Page X of Y`.
- Added `drawNotApplicableMarker` for the no-guardian case (uses language-safe "N/A" markers).

### UI
- Rewrote `ReadinessChecklist.tsx` to render from the canonical readiness item array.
- Updated `ApprovedPdfViewer.tsx` to wire the new `PdfObjectEmbedViewer` and fix pre-existing Button/Badge prop mismatches.

### Type safety
- Added `apps/web/src/types/pdfjs-dist-mjs.d.ts` for the ESM pdfjs-dist build.
- Removed circular type dependency between client and server readiness types.
- Cleaned up unused variables/functions in `imc-approved-pdf-template-engine.ts` surfaced by lint.

## Validation Results

| Gate | Command | Result |
|---|---|---|
| Focused mapping/signature/readiness tests | `npx tsx --test src/lib/server/physician-journey-mapping-signature.test.ts` | 26/26 pass |
| Web full suite | `npx tsx --test src/lib/server/*.test.ts src/components/cases/*.test.ts src/components/approved-design/patient/*.test.ts` | 460/463 pass |
| Allowed baseline failures | demo-account-access, modules-catalog-routing, package1-idempotency partial unique-index assertion | 3 failures, pre-existing |
| Lint (touched files) | `npx eslint --max-warnings=0 <touched files>` | clean |
| TypeScript (touched files) | `npx tsc --noEmit` | no new errors in touched files |
| Build | `DATABASE_URL=postgresql://dummy npm run build -w apps/web` | succeeds |
| Prisma validate | `DATABASE_URL=postgresql://dummy npx prisma validate --schema=./prisma/schema.prisma` | valid |
| Diff whitespace check | `git diff --check` | clean (only CRLF line-ending warnings) |

## Notes

- Pre-existing TypeScript errors in unrelated production-workspace components (design-system imports, Button/Badge prop mismatches) and `lib/api.ts` type conversions remain outside the scope of this correction and were not introduced by these changes.
- The three full-suite failures are the documented baseline failures.
- All file changes are confined to the working directory; no secrets, `.env`, or remote resources were modified.
