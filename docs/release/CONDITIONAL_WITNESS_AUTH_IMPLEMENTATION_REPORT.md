# Conditional Witness Policy & Electronic Authentication Label — Implementation Report

Branch: `feature/conditional-witness-auth` (base `d3aa047c`)
Scope: `apps/web` (the live Next.js + Prisma stack). No other apps touched.

## 1. Architecture

The feature is implemented as four new server modules plus surgical enforcement
hooks in the existing consent pipeline:

| Module | Responsibility |
|---|---|
| `src/lib/server/witness-policy-service.ts` | Typed, versioned, deterministic witness policy engine (`evaluateWitnessPolicy`), satisfaction evaluation (`evaluateWitnessSatisfaction`/`assertWitnessSatisfied`), template policy config parsing (fail-closed), trigger-fact extraction, stored-decision provenance |
| `src/lib/server/patient-declarations-service.ts` | Versioned patient declaration records (7 declarations) and the **separate** clinician attestation record, both bound to the exact document content hash; stale evidence rejected |
| `src/lib/server/witness-requirement-service.ts` | Independent witness requirement records, task assign/claim, complete witness signature capture (RBAC, self-witnessing and duplicate protections, attestation, hash binding, idempotency, KSA timestamps, IP/UA hashing, audit), send-gate helper |
| `src/lib/server/witness-auth-label.ts` | IMC MR 1168 page-2 calibration (normalized coordinates), fail-closed bounds validation, deterministic auto-fit typography, bilingual label content builders, content-safety assertions, deterministic preview fixture |

Data model (migration `apps/web/prisma/migrations/0031_conditional_witness_auth.sql`,
additive/idempotent, mirrored in `CONSENT_SCHEMA_BOOTSTRAP_STATEMENTS` and
`prisma/schema.prisma`):

- `consent_witness_requirements` — one independent record per required witness
  (tenant, document, index, required role, status PENDING/ASSIGNED/SIGNED/REVOKED,
  policy version, assignment, idempotency key; unique per document+index).
- `consent_witness_signatures` — independent witness evidence: witness user ID,
  employee ID, role, department, attestation version, signature ID, authentication
  reference, signed-at + Saudi Arabia time, document hash, IP/UA hashes,
  idempotency key (unique), one per requirement (unique).
- Patient declarations and clinician attestation are stored as versioned,
  hash-bound records on `ConsentDocument.metadata`
  (`patientDeclarations`, `clinicianAttestation`) — no schema change required and
  no duplication of existing fields.
- The evaluated policy decision is snapshotted to
  `ConsentDocument.metadata.witnessPolicyDecision` at creation (policy provenance)
  and re-evaluated deterministically at enforcement points with current runtime
  facts; the stricter outcome wins (fail closed).

## 2. Changed files

**New**
- `apps/web/src/lib/server/witness-policy-service.ts`
- `apps/web/src/lib/server/witness-requirement-service.ts`
- `apps/web/src/lib/server/patient-declarations-service.ts`
- `apps/web/src/lib/server/witness-auth-label.ts`
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/witness-signature/route.ts`
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/witness-requirements/route.ts`
- `apps/web/src/components/enterprise/consent/WitnessSigningWorkspace.tsx`
- `apps/web/prisma/migrations/0031_conditional_witness_auth.sql`
- Tests: `witness-policy-service.test.ts`, `witness-requirement-service.test.ts`,
  `patient-declarations-service.test.ts`, `witness-auth-label.test.ts`

**Modified**
- `apps/web/prisma/schema.prisma` — two models + relations
- `apps/web/src/app/api/modules/informed-consents/documents/route.ts` — bootstrap DDL for the two tables
- `apps/web/src/lib/server/consent-document-create-service.ts` — legacy witness 422 block replaced by policy evaluation; decision persisted; `WITNESS_POLICY_EVALUATED` audit
- `apps/web/src/lib/server/consent-library-service.ts` — same replacement in legacy create path; finalization gate now policy-driven (witness satisfaction + routine evidence completeness); `computeFixedClauseChecksum` exported for hash binding
- `apps/web/src/lib/server/module-secure-signing-service.ts` — *(unchanged; gate applied in routes)*
- `apps/web/src/app/api/modules/informed-consents/send/route.ts` — witness-policy send gate
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/secure-signing/route.ts` — same gate
- `apps/web/src/lib/server/public-signing-signature-service.ts` — patient declarations captured, validated (routine path), hash-bound, persisted at signature
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/physician-signature/route.ts` — separate clinician attestation record persisted
- `apps/web/src/lib/server/informed-consents-final-pdf-payload.ts` — PDF-generation witness gate (required-but-unsigned witness blocks final PDF)
- `apps/web/src/lib/server/imc-approved-pdf-template-engine.ts` — bilingual authentication label overlay (IMC MR 1168 page 2)
- `apps/web/src/lib/modules/informed-consents-rbac.ts` — `consent:witness_attest` permission + witness role grants (nursing, patient_affairs)
- `apps/web/src/lib/server/idempotency-core.ts` — `WITNESS_REQUIREMENT_CREATE`, `WITNESS_SIGNATURE_CAPTURE` operations
- `apps/web/src/components/modules/PublicSigningWorkflow.tsx` — 7 declaration checkboxes, gating, payload
- `.gitignore` — `apps/web/test-output/`

## 3. Policy behaviour (matrix)

`witnessMode` / `requiredWitnessCount` outcomes (policy version `1.0.0`,
source of truth `evaluateWitnessPolicy`):

| Scenario | Mode | Count | Source |
|---|---|---|---|
| Competent patient, complete e-evidence, no triggers | NONE | 0 | DEFAULT_ROUTINE |
| Substitute decision-maker / lacks capacity / cannot read or use journey / communication barrier / disputed / refusal-AMA | REQUIRED | 1 (configurable) | trigger code recorded |
| Template policy `REQUIRED` (clinical/research/legal rule) | REQUIRED | configured (1–2) | TEMPLATE_METADATA |
| Template policy `NONE`, no triggers | NONE | 0 | TEMPLATE_METADATA |
| Template policy `NONE` **with** a fired trigger | REQUIRED | 1 | fail-closed escalation |
| Template policy `CONDITIONAL`, no triggers | CONDITIONAL | 0 | TEMPLATE_METADATA |
| Legacy `requiresWitness=true` or risk HIGH/CRITICAL | REQUIRED | 1 | LEGACY_TEMPLATE_FLAG |

- Draft creation never fails solely because of a legacy `requiresWitness` flag
  (the old 422 block was removed; interpreter templates remain out of scope).
- Enforcement points: creation (evaluate + persist + audit), send-for-signature
  (evaluate + issue requirement records, fail closed on invalid config),
  patient signature (declarations for routine path), witness signature (full
  workflow), final PDF generation (unsigned required witness blocks),
  finalization/completion (policy satisfaction + routine evidence completeness).
- WathiqCare is never represented as a human witness; it is the electronic
  signing and authentication system.

## 4. Human-witness workflow

1. Policy requires witnesses → send gate issues one
   `consent_witness_requirements` record per required witness (idempotent).
2. Authorized staff (`consent:witness_attest`; nursing → NURSING_REPRESENTATIVE,
   patient_affairs → PATIENT_EXPERIENCE_REPRESENTATIVE) list tasks and claim/assign
   them (`POST .../witness-requirements`).
3. Witness signs via `POST .../witness-signature` using their institutional
   session (JWT/SSO — no SMS verification for staff).
4. Server enforces: RBAC role ↔ witness role; no self-witnessing by patient or
   clinician; no duplicate signatures; no same-person dual roles (unless policy
   allows); the witnessed signatory event exists; the presented document hash
   equals the current document hash (stale versions rejected); complete
   three-part attestation; idempotency key (replay returns the original record).
5. Each signature writes: `ConsentDocumentSignature` (role WITNESS, backward
   compatible) + independent `consent_witness_signatures` evidence record
   (user/employee/role/department/attestation version/signature ID/auth
   reference/KSA timestamp/document hash/IP+UA hashes/idempotency) + requirement
   status update + audit event `WITNESS_SIGNATURE_CAPTURED`.
6. Two-witness policies render and validate two independent records.
7. Patient e-authentication evidence and witness evidence are stored separately.

## 5. PDF calibration (IMC MR 1168, page 2)

- Renderer-driven overlay only; the approved source PDF is never altered.
- Normalized coordinates (origin top-left), bilingual divider at x = 0.5,
  safety inset 0.02; English rect in the left column (LTR), Arabic rect
  centered in the right column (RTL, `WathiqOverlayArabic`).
- Runtime bounds validation fails closed (`PDF_CALIBRATION_VIOLATION`) for:
  divider crossing, page-boundary crossing, witness-region escape, protected
  physician/guardian signature region overlap.
- Deterministic auto-fit typography (9pt → 6pt floor); overflow fails closed
  (`PDF_LABEL_OVERFLOW`) — never clips or truncates.
- Arabic shaping via the repository's existing Chromium overlay pipeline;
  NFC normalization + mojibake integrity assertions applied to every line.
- Routine path renders the bilingual electronic authentication record
  (genuine OTP challenge reference, masked mobile, signature ID, KSA signed-at,
  authentication reference; QR omitted because it does not fit safely);
  missing genuine evidence → `WITNESS_AUTH_LABEL_EVIDENCE_INCOMPLETE`.
- Human-witness path renders one bilingual witness label per completed witness
  signature; the no-witness label is never used as a substitute.
- Arabic visible text uses `رمز التحقق` / `مرجع رمز التحقق`; the Latin letters
  `OTP` are rejected in Arabic label text; secret codes and unmasked mobiles
  are rejected at construction and at render.

## 6. Tests

New tests: **42** (all passing):

- `witness-policy-service.test.ts` — policy matrix (spec items 1–8),
  determinism, fail-closed escalation, invalid config, satisfaction (9, 10),
  same-person/duplicate (12), stale hash (13), idempotency keys (14),
  trigger extraction, provenance round-trip.
- `witness-requirement-service.test.ts` — role authorization and RBAC grant
  (11), self-witnessing/duplicate/role-mismatch guards (12), attestation,
  KSA timestamps, IP/UA hashing.
- `patient-declarations-service.test.ts` — 7 declarations, versioning,
  incomplete/stale rejection (13), clinician attestation separation.
- `witness-auth-label.test.ts` — genuine-evidence label (15), witness label
  (16), secret/unmasked rejection (17), Arabic terminology/no-OTP (18),
  column containment (19), Arabic centering (20), divider crossing (21),
  overflow fail-closed (22), deterministic fixture + artifact generation.

Full suite (`npm test` equivalent: `tsx --test src/lib/server/*.test.ts
src/components/cases/*.test.ts`): **314 tests, 311 pass, 3 fail** — all 3
failures are pre-existing and unrelated (verified: none of their import
dependencies were modified):

1. `demo-account-access.test.ts` — demo access matrix (pre-existing data mismatch).
2. `modules-catalog-routing.test.ts` — `wathiqnote` vs `promissory-notes` (pre-existing catalog data).
3. `package1-idempotency.test.ts` — asserts migration 0030 content with `\n`;
   the file is checked out with CRLF on Windows (`core.autocrlf=true`), so the
   literal `\n` assertion fails on any Windows checkout of the base commit.

Secure-signing/idempotency suites otherwise pass unchanged (spec item 23).

TypeScript: `tsc --noEmit` — 70 errors, all pre-existing in untouched files
(production-workspace design-system components, pdfjs-dist declarations,
field-mapping `size` props); **zero new errors** in any feature file.
ESLint on touched files: no new errors (one pre-existing `prefer-const` error
in `documents/route.ts:1153`, plus pre-existing warnings).

## 7. Generated artifacts

- `apps/web/test-output/witness-auth-label-imc-mr-1168-page2.fixture.json` —
  deterministic IMC MR 1168 page-2 preview fixture, synthetic evidence marked
  `TEST ONLY - PREVIEW / NON-CLINICAL EVIDENCE`; directory git-ignored.

## 8. Risks & notes

- Documents signed outside the public OTP flow (no `challengeId`/masked-mobile
  evidence) fail closed at final PDF render for IMC MR 1168 — intended per
  spec, operationally visible.
- Staff SSO/MFA: the platform has JWT-cookie institutional sessions (no MFA
  machinery exists); witness signing reuses that session identity, per spec.
- `PublicSigningWorkflow.tsx` is currently orphaned (no page route imports it);
  declarations UI is wired there and the API enforces declarations
  server-side regardless of UI.
- Two witness slots fit the calibrated region; policy caps required roles at
  the two configured staff roles.

## 9. Deployment prerequisites

1. Apply migration `0031` (runs automatically via `scripts/run-sql-migrations.cjs`
   during `npm run build`; never via `prisma migrate deploy`).
2. `prisma generate` after schema change (part of build).
3. No new environment variables. No production variables modified.
4. Seed/template governance: to configure two-witness policies, set
   `ConsentTemplate.metadata.witnessPolicy` through the normal governance flow
   (approved template data was not mutated by this change).

## 10. Safety confirmation

No push, no deploy, no remote database mutation, no real signing endpoint
calls, no SMS/email/WhatsApp sends, no real patient data, no `.env`/secret
changes, no commit history rewrite. All evidence in tests/fixtures is
synthetic and explicitly marked.
