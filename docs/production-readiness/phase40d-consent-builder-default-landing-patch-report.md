# Phase 40D — Consent Builder Default Landing Patch

**Date:** 2026-06-01
**Branch:** `phase24-evidence-package-final` (Phase 40 candidate branch, **not pushed**, no merge to `main`)
**Worktree:** `c:\work\wathiqcare-discharge-refusal-main`
**Scope:** Single-line behavioral fix to correct the rejected Phase 40 default landing screen.
**Final classification:** **READY FOR USER VISUAL APPROVAL — CONSENT BUILDER DEFAULT ACTIVE**

---

## 1. Background

- Phase 40 ported the OneDrive Figma export into `apps/web/src/components/informed-consents/final-ui/` and mounted `FinalInformedConsentsModule` at `/modules/informed-consents`. ✅ Visually identical to the OneDrive source. **Rejected by user** because the SPA defaulted to the Dashboard screen, not the Consent Builder.
- Phase 39F ([report](./phase39f-correct-visual-target-identification-report.md)) identified the user's actual target as the 8-step Consent Builder shown in `C:\Users\basel\OneDrive\Desktop\رحلة الطبيب\` (Physician Journey). User confirmed: same source, wrong entry screen.
- Phase 40D corrects only the default screen and re-verifies build + visuals. No other change.

---

## 2. Patch

**Single-file, single-line change.** No new dependencies, no route changes, no fixture changes, no API changes, no signing-flow changes.

### File modified
- [apps/web/src/components/informed-consents/final-ui/App.tsx](../../apps/web/src/components/informed-consents/final-ui/App.tsx#L24)

### Diff
```diff
 export default function App() {
-  const [screen, setScreen] = useState<Screen>('dashboard');
+  const [screen, setScreen] = useState<Screen>('consent-builder');
   const [lang, setLang] = useState<'en' | 'ar'>('en');
```

### Why this is safe
- `Screen` is a TypeScript union `'dashboard' | 'search' | 'consent-builder' | 'status'` — `'consent-builder'` is already an allowed value, used elsewhere (`handleViewConsent`, `handlePatientSelected`).
- The `ConsentBuilder` component takes a single `lang` prop and is self-contained with `defaultValidation` + per-step mock fixtures. It does not require a pre-selected patient or encounter to render.
- All four nav entries (Dashboard / Patient Search / Consent Builder / Status Tracking) remain reachable via the left sidebar — the Dashboard is preserved, just no longer the entry surface.

---

## 3. Routes & surfaces — unchanged

| Surface | Wiring | Phase 40D action |
| --- | --- | --- |
| `/modules/informed-consents` | `FinalInformedConsentsModule` (Phase 40 wrapper → `App.tsx`) | **Default screen now Consent Builder** (Step 1 / Patient) |
| `/modules/informed-consents/create` | Legacy Approved creation stepper | Unchanged |
| `/modules/informed-consents/{id}/…`, `/list`, `/archive`, `/templates`, `/governance`, etc. | Existing routes from Phase 36/35E | Unchanged |
| `/sign/[token]/workflow` | `ApprovedPatientWorkflow` patient signing journey | **Untouched** (per user constraint) |
| `/api/sign/[token]/verify-otp`, `/api/public-signing/**`, `/api/auth/**` | Public signing + OTP + session APIs | **Untouched** (per user constraint) |
| Production deployment, `main` branch, Vercel, Neon migrations, SMS | — | **No action** (per user constraint) |

---

## 4. Build & type validation

### `npx next build --webpack`
```
▲ Next.js 16.2.4 (webpack)
- Environments: .env.local, .env.production
  Creating an optimized production build ...
✓ Compiled successfully in 43s
  Skipping validation of types
  Collecting page data using 1 worker ...
✓ Generating static pages using 1 worker (106/106) in 14.1s
  Finalizing page optimization ...
  Collecting build traces ...
[exit 0]
```

Route table confirmed `/modules/informed-consents` and `/modules/informed-consents/create` both built ƒ (dynamic, server-rendered on demand). Full log in `__phase40d_build.log` at repo root.

### `npx tsc --noEmit`
- Pre-existing, unrelated errors (Prisma enum widening) in `app/api/**` routes — same set as before Phase 40D, **none touch `final-ui/`** or any Phase 40D file.
- Filter `npx tsc --noEmit 2>&1 | Select-String 'final-ui|informed-consents/final|FinalInformedConsents'` → **0 matches** (Phase 40D area is type-clean).

---

## 5. Authenticated localhost screenshot capture

**Server:** `npx next start` on `http://localhost:3000` against built `.next/` output, with live `wathiqcare_prod_20260323093007` Neon DB.
**Auth:** `POST /api/auth/password/login` with pilot physician `dr.ahmed@wathiqcare.med.sa` → cookie `wathiqcare_access_token` (HTTP 200, role `doctor`, tenant `efe052b7-a8ac-4962-a021-8c01931514a7`). Verified in server log `LOGIN_SUCCESS` events.
**Tool:** Playwright `chromium` headless, viewport 1440×900, `waitUntil: 'networkidle'`.
**Output:** [`docs/production-readiness/phase40d-screenshots/`](./phase40d-screenshots/) + metadata JSON.

| # | File | URL | Action | Bytes | Verifies |
| --- | --- | --- | --- | --- | --- |
| 1 | [01_modules_informed-consents_default_landing.png](./phase40d-screenshots/01_modules_informed-consents_default_landing.png) | `/modules/informed-consents` | (none — default) | 159 123 | **Default landing = Consent Builder Step 1 Patient.** "Consent Builder" highlighted in sidebar; 8-step stepper visible; "Patient Identity Confirmation" heading; Mohammed Ibrahim Al-Rashidi / MRN-2024-0847; COMPLETENESS CHECK panel (7 Critical / 5 Warning / 4 Ready). Matches user target `الخطوة 1.png`. |
| 2 | [02_step1_patient.png](./phase40d-screenshots/02_step1_patient.png) | `/modules/informed-consents` | click stepper Patient | 159 123 | Step 1 reachable after explicit click (idempotent — same as default). |
| 3 | [03_step2_procedure.png](./phase40d-screenshots/03_step2_procedure.png) | `/modules/informed-consents` | click stepper Procedure | 167 875 | **Step 2 Procedure** — Procedure & Consent Selection (Laparoscopic Cholecystectomy / Upper GI Endoscopy). Matches user target `2 - الخطوة .png`. |
| 4 | [04_step7_validation.png](./phase40d-screenshots/04_step7_validation.png) | `/modules/informed-consents` | click stepper Validation | 156 554 | **Step 7 Validation** — Completeness Validation summary. Matches user target `7- جاهزية الارسال - تقرير فحص.png`. |
| 5 | [05_step8_send.png](./phase40d-screenshots/05_step8_send.png) | `/modules/informed-consents` | click stepper Send | 160 600 | **Step 8 Send Secure Consent Link** — Patient Contact Details, OTP Signing Method (SMS / Email / SMS+Email), Consent Language (EN / AR / Bilingual), Link Expiry & Limits, Physician Final Confirmation. Matches user target `ارسال الرابط الامن .png`. |
| 6 | [06_arabic_mode.png](./phase40d-screenshots/06_arabic_mode.png) | `/modules/informed-consents?lang=ar` | (none) | 159 447 | Arabic mode (`lang=ar`) — sidebar labels `لوحة التحكم` / `البحث عن مريض` / `بناء الموافقة` / `متابعة الحالة` render; bilingual validation panel intact. |
| 7 | [07_modules_informed-consents_create.png](./phase40d-screenshots/07_modules_informed-consents_create.png) | `/modules/informed-consents/create` | (none) | 112 540 | **Preserved legacy creation stepper unchanged** — "INTERNAL PILOT — TEST DATA ONLY" banner, 8-step `Patient Search → Encounter Selection → … → Finalization`. Phase 40D did not touch this surface. |
| 8 | [08_modules.png](./phase40d-screenshots/08_modules.png) | `/modules` | (none) | 82 719 | Module catalog with Informed Consents (`الموافقات المستنيرة`) and Discharge Refusal Platform tiles. |

Capture script: [`__phase40d_capture.cjs`](../../__phase40d_capture.cjs)
Metadata: [`phase40d-screenshots/phase40d-screenshots-metadata.json`](./phase40d-screenshots/phase40d-screenshots-metadata.json)

---

## 6. Comparison vs. user's `رحلة الطبيب` target

| User target screenshot | Phase 40D capture | Match? |
| --- | --- | --- |
| `الخطوة 1.png` (Step 1 Patient) | `01_modules_informed-consents_default_landing.png` / `02_step1_patient.png` | ✅ Same 8-step stepper, same patient (Mohammed Al-Rashidi MRN-2024-0847), same allergies (Penicillin / NSAIDs), same Linked Encounter (ENC-2024-1847 Pre-Operative 28 May 2026), same right-panel "COMPLETENESS CHECK" with bilingual EN+AR labels |
| `2 - الخطوة .png` (Step 2 Procedure) | `03_step2_procedure.png` | ✅ Procedure & Consent Selection panel rendered |
| `7- جاهزية الارسال - تقرير فحص.png` (Step 7 Validation) | `04_step7_validation.png` | ✅ Completeness Validation summary |
| `ارسال الرابط الامن .png` (Step 8 Send) | `05_step8_send.png` | ✅ All four sections present: Patient Contact Details / OTP Signing Method / Consent Language / Link Expiry & Limits + Physician Final Confirmation |
| `شاشة المريض .png` (patient OTP) | (out of scope — current production `/sign/[token]/verify-otp`) | ✅ Confirmed by user in Phase 39F to be a reference capture, not a redesign target |

---

## 7. Preservation guarantees (unchanged since Phase 40 rejection)

- `main` HEAD: `83f3880` — unchanged.
- `origin/main`: unchanged, **no push performed**.
- **No Vercel deploy.**
- **No migrations run.**
- **No SMS enabled.**
- **No OTP / signing / token / session / public-signing / patient-journey code modified.**
- `/sign/[token]/workflow` patient journey: untouched.
- Phase 40 candidate files at `apps/web/src/components/informed-consents/final-ui/` preserved; Phase 40D modifies one line in `App.tsx` on the same `phase24-evidence-package-final` branch.

---

## 8. Final classification

**READY FOR USER VISUAL APPROVAL — CONSENT BUILDER DEFAULT ACTIVE**

Next step is user visual review of the 8 screenshots in [`docs/production-readiness/phase40d-screenshots/`](./phase40d-screenshots/) against `C:\Users\basel\OneDrive\Desktop\رحلة الطبيب\`. On approval, the next phase will:
1. Commit the 1-line change.
2. Define wiring strategy for real APIs replacing the Phase 40 mock fixtures.
3. Await separate user approval before any push, merge to `main`, or deploy.

**No push, no merge, no deploy will occur without explicit user sign-off on this screenshot set.**
