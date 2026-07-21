# Conditional Witness Policy & Electronic Authentication Label — Implementation Report

Branch: `feature/conditional-witness-auth`
Starting HEAD: `a9e52897a99ceb92f23b5206860f1922b5b45919`
Scope: `apps/web` (the live Next.js + Prisma stack). No other apps touched.

## 1. Architecture

The feature is implemented as new server modules plus surgical enforcement hooks
in the existing consent pipeline:

| Module | Responsibility |
|---|---|
| `src/lib/server/witness-policy-service.ts` | Typed, versioned, deterministic witness policy engine (`evaluateWitnessPolicy`), satisfaction evaluation (`evaluateWitnessSatisfaction`/`assertWitnessSatisfied`), template policy config parsing (fail-closed), trigger-fact extraction, stored-decision provenance |
| `src/lib/server/witness-policy-profiles.ts` | Governed, code-controlled registry profiles (IMC MR 1168 v2018-02). Exact templateCode + version gate; fail-closed on ambiguity; explicit `GOVERNED_CODE_PROFILE` provenance |
| `src/lib/server/patient-declarations-service.ts` | Versioned patient declaration records (7 declarations) and the **separate** clinician attestation record, both bound to the exact document content hash; stale evidence rejected |
| `src/lib/server/witness-requirement-service.ts` | Independent witness requirement records, task assign/claim, complete witness signature capture (RBAC, self-witnessing and duplicate protections, attestation, hash binding, idempotency, KSA timestamps, IP/UA hashing, audit), send-gate helper |
| `src/lib/server/witness-auth-label.ts` | IMC MR 1168 page-2 calibration (normalized coordinates), fail-closed bounds validation, deterministic auto-fit typography, bilingual label content builders, content-safety assertions, deterministic preview fixture |
| `src/lib/server/imc-approved-pdf-template-engine.ts` | Renderer-driven overlay pipeline; exports overlay helpers reused by the preview generator |
| `src/lib/server/conditional-witness-preview-generator.ts` | Local preview artifact generator using the approved source PDF + actual overlay/Arabic pipeline |

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
- `apps/web/src/lib/server/witness-policy-profiles.ts`
- `apps/web/src/lib/server/witness-requirement-service.ts`
- `apps/web/src/lib/server/patient-declarations-service.ts`
- `apps/web/src/lib/server/witness-auth-label.ts`
- `apps/web/src/lib/server/conditional-witness-preview-generator.ts`
- `apps/web/src/lib/server/public-signing-sign-body.ts`
- `apps/web/src/components/approved-design/patient/PatientDeclarationsPanel.tsx`
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/witness-signature/route.ts`
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/witness-requirements/route.ts`
- `apps/web/src/components/enterprise/consent/WitnessSigningWorkspace.tsx`
- `apps/web/prisma/migrations/0031_conditional_witness_auth.sql`
- Tests: `witness-policy-service.test.ts`, `witness-policy-profiles.test.ts`,
  `witness-requirement-service.test.ts`, `patient-declarations-service.test.ts`,
  `witness-auth-label.test.ts`, `conditional-witness-acceptance.test.ts`,
  `conditional-witness-preview.test.ts`, `migration-0031-contract.test.ts`,
  `patient-declarations-panel.test.ts`

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
- `apps/web/src/lib/server/imc-approved-pdf-template-engine.ts` — bilingual authentication label overlay (IMC MR 1168 page 2); overlay helpers exported for preview generator
- `apps/web/src/lib/modules/informed-consents-rbac.ts` — `consent:witness_attest` permission + witness role grants (nursing, patient_affairs)
- `apps/web/src/lib/server/idempotency-core.ts` — `WITNESS_REQUIREMENT_CREATE`, `WITNESS_SIGNATURE_CAPTURE` operations
- `apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx` — wires `PatientDeclarationsPanel` into the public-signing journey
- `apps/web/src/components/approved-design/patient/PatientSignatureStep.tsx` — renders declarations panel and enforces completeness before submit
- `apps/web/src/app/api/public-signing/document/[token]/sign/route.ts` — uses `mapPublicSignRequestBody` to forward declarations
- `apps/web/src/components/modules/public-signing/PatientLandingV11.tsx` — stale `PublicSigningWorkflow` comment updated
- `apps/web/.gitignore` — `apps/web/test-output/`

**Deleted**
- `apps/web/src/components/modules/PublicSigningWorkflow.tsx` — removed; no executable import/dynamic import/JSX reference remains

## 3. Component path & page-route status

- Patient declarations UI component path:
  `apps/web/src/components/approved-design/patient/PatientDeclarationsPanel.tsx`
- The panel is wired through `ApprovedPatientWorkflow` → `PatientSignatureStep`
  → `POST /api/public-signing/document/[token]/sign` → `public-signing-signature-service`.
- The declarations are required before the patient can submit on the routine
  electronic path; the server authoritative service rejects incomplete sets.
- The branch has **no page-level `/sign` route**. Component-level integration is
  complete; the absence of a dedicated page route is a known branch state and is
  not introduced by this change.

## 4. Policy behaviour (matrix)

`witnessMode` / `requiredWitnessCount` outcomes (policy versions `1.0.0` and
`1.1.0`, source of truth `evaluateWitnessPolicy`):

| Scenario | Mode | Count | Source |
|---|---|---|---|
| Competent patient, complete e-evidence, no triggers | NONE | 0 | DEFAULT_ROUTINE |
| Substitute decision-maker / lacks capacity / cannot read or use journey / communication barrier / disputed / refusal-AMA | REQUIRED | 1 (configurable) | trigger code recorded |
| Template policy `REQUIRED` (clinical/research/legal rule) | REQUIRED | configured (1–2) | TEMPLATE_METADATA |
| Template policy `NONE`, no triggers | NONE | 0 | TEMPLATE_METADATA |
| Template policy `NONE` **with** a fired trigger | REQUIRED | 1 | fail-closed escalation |
| Template policy `CONDITIONAL`, no triggers | CONDITIONAL | 0 | TEMPLATE_METADATA / GOVERNED_CODE_PROFILE |
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

## 5. IMC MR 1168 governed profile

Registry profile (`witness-policy-profiles.ts`):

- `templateCode`: `imc-adenotonsillectomy`
- `templateFormReference`: `IMC MR 1168`
- `templateVersion`: `2018-02`
- `policyVersion`: `1.1.0`
- `policySource`: `GOVERNED_CODE_PROFILE`
- `effectiveState`: `PREVIEW_ACTIVE`
- `policy.witnessMode`: `CONDITIONAL`
- `policy.requiredWitnessCount`: `0`
- `policy.requiredWitnessRoles`: `["NURSING_REPRESENTATIVE", "PATIENT_EXPERIENCE_REPRESENTATIVE"]`
- `policy.allowSamePersonMultipleRoles`: `false`

Precedence:
1. Explicit `ConsentTemplate.metadata.witnessPolicy` wins.
2. Exact `templateCode` + version gate applies the profile.
3. Version present-but-mismatched → profile NOT applied (fail closed).
4. Version absent/unknown → only `PREVIEW_ACTIVE` profile applies.
5. Otherwise fall through to legacy/default behaviour.

## 6. Human-witness workflow

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

## 7. PDF calibration (IMC MR 1168, page 2)

- Renderer-driven overlay only; the approved source PDF is never altered.
- Normalized coordinates (origin top-left), bilingual divider at x = 0.5,
  safety inset 0.02; English rect in the left column (LTR), Arabic rect
  centered in the right column (RTL, `WathiqOverlayArabic`).
- Aspect-ratio-safe overlay mapping: the 1190 × 1684 px overlay viewport is
  uniformly scaled to fit the 612 × 792 pt source page (`scale =
  min(scaleX, scaleY) = 0.47030878859857483`) and centered; no non-uniform
  stretching is applied.
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

## 8. Migration review

Migration `apps/web/prisma/migrations/0031_conditional_witness_auth.sql`:

- Additive only: two `CREATE TABLE IF NOT EXISTS` + two `CREATE INDEX IF NOT EXISTS`.
- No `DROP`, `TRUNCATE`, `UPDATE`, `DELETE`, `ALTER COLUMN`, `RENAME`, type changes.
- Tenant-scoped unique constraints/indexes leading with `tenant_id`.
- CHECK constraints pin `required_role`/`witness_role` and `status` to known value sets.
- FK `ON DELETE`: tenant/document → `CASCADE`; witness_requirement → `RESTRICT`
  (signature evidence survives requirement deletion).
- Bootstrap DDL in `documents/route.ts` mirrors the migration SQL exactly.
- `migration-0031-contract.test.ts` validates order, additive-only, idempotency,
  name/column alignment, constraint/index names, tenant scoping, FK behaviour,
  and SQL/bootstrap equivalence without opening a database connection.

## 9. Tests

Focused new tests pass:

- `conditional-witness-acceptance.test.ts` — routine path (complete evidence,
  7 declarations, clinician attestation, CONDITIONAL/0 witnesses,
  electronic-auth label, exact hash preserved); conditional path (trigger,
  requirement issued, blocked before witness, valid nursing/patient-experience
  witnesses, stale hash/duplicate/wrong role/self-witness rejected, human-witness
  label selected).
- `conditional-witness-preview.test.ts` — artifact generation, page count/dimensions,
  rectangle containment, divider clearance, protected-region clearance, Arabic
  centering, min font region, test watermark, no secret, masked mobile, no
  mojibake, no Arabic OTP.
- `witness-policy-profiles.test.ts` — registry integrity, exact code+version match,
  metadata precedence, other templates unaffected, legacy flags preserved,
  trigger escalation, fail-closed version gate, provenance round-trip.
- `patient-declarations-panel.test.ts` — panel keys match service, bilingual labels,
  completeness logic, payload building, route body mapper integration.
- `migration-0031-contract.test.ts` — migration contract (see section 8).

Full suite (`npm test`): **382 tests, 379 pass, 3 fail** — all 3 failures are
pre-existing at `a9e52897` and unrelated to touched files:

1. `demo-account-access.test.ts` — demo access matrix data mismatch.
2. `modules-catalog-routing.test.ts` — `wathiqnote` vs `promissory-notes` catalog data.
3. `package1-idempotency.test.ts` — literal `\n` assertion vs CRLF checkout.

TypeScript: `npx tsc --noEmit` reports many pre-existing errors in untouched
files; **zero new errors** in any touched feature file.

ESLint on touched files: **0 errors** (only pre-existing warnings in unchanged
portions of `ApprovedPatientWorkflow.tsx`, `consent-document-create-service.ts`,
`consent-library-service.ts`, `imc-approved-pdf-template-engine.ts`).

`git diff --check`: clean.

`DATABASE_URL=postgresql://dummy npx prisma validate --schema=./prisma/schema.prisma`: valid.

## 10. Generated artifacts (Package C)

Local preview artifacts under `apps/web/test-output/` (git-ignored):

| Artifact | SHA-256 |
|---|---|
| `IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY.pdf` | `ca4dae8753f7f94d68cb128f8b96acb8bf866e76487d0d7133fdf5ad771c6be4` |
| `IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY_PAGE_2.png` | `d34fa0b93881b32c7f1b48bd427f5cc25f6a64e7db140b4adaeb8028dba33e31` |
| `IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY.manifest.json` | `2fd2668dd450b491090b05c0768adc52595880da6239427e5afda68a1ffd1be0` |

Source PDF: `apps/web/public/approved-consent-forms/adenotonsillectomy.pdf`
(sha256 `64a91e732171d3a4da1c1b6149e37d06618ddc2c1069cb55356dcff626a01029`).

The page-2 PNG is a genuine composed raster of the final generated PDF page 2
(rendered at 2× source scale: 1224 × 1584 px), not a transparency-only
overlay. The overlay is drawn onto the 612 × 792 pt source page with a uniform,
aspect-ratio-safe scale (`scale = min(scaleX, scaleY) = 0.47030878859857483`)
and centered horizontally; no non-uniform stretching is applied.

All artifacts are synthetic, non-clinical, and carry the marker
`TEST ONLY - PREVIEW / NON-CLINICAL EVIDENCE`.

## 11. Risks & notes

- Documents signed outside the public OTP flow (no `challengeId`/masked-mobile
  evidence) fail closed at final PDF render for IMC MR 1168 — intended per
  spec, operationally visible.
- Staff SSO/MFA: the platform has JWT-cookie institutional sessions (no MFA
  machinery exists); witness signing reuses that session identity, per spec.
- `PublicSigningWorkflow.tsx` was deleted. No executable import/dynamic import/JSX
  reference remains; `PublicSigningWorkflowPayload` type was intentionally not
  renamed.
- Two witness slots fit the calibrated region; policy caps required roles at
  the two configured staff roles.

## 12. Deployment prerequisites

1. Apply migration `0031` (runs automatically via `scripts/run-sql-migrations.cjs`
   during `npm run build`; never via `prisma migrate deploy`).
2. `prisma generate` after schema change (part of build).
3. No new environment variables. No production variables modified.
4. Seed/template governance: to configure two-witness policies, set
   `ConsentTemplate.metadata.witnessPolicy` through the normal governance flow
   (approved template data was not mutated by this change).
5. For production activation of the IMC MR 1168 governed profile, the normal
   clinical-governance approval workflow is required; the registry remains
   `PREVIEW_ACTIVE` until then.

## 13. Safety confirmation

No push, no deploy, no remote database mutation, no real signing endpoint
calls, no SMS/email/WhatsApp sends, no real patient data, no `.env`/secret
changes, no commit history rewrite. All evidence in tests/fixtures is
synthetic and explicitly marked.
