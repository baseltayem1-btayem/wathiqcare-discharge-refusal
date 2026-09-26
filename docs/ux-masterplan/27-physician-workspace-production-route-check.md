# 27 — Physician Workspace Production Route Check

## Question

Is the migrated Design System Physician Workspace (`/prototype/clinical-workspace-2`) connected to the real pilot/production physician route?

## Short Answer

**PROTOTYPE ONLY — NOT CONNECTED**

`/prototype/clinical-workspace-2` remains an isolated development prototype. The canonical physician route for the Internal IMC Pilot is `/modules/informed-consents`, and it does **not** use the migrated Design System workspace UI.

## Canonical Physician Route

| Route | Component | Status | Notes |
|-------|-----------|--------|-------|
| `/modules/informed-consents` | `FinalInformedConsentsModule` → `PhysicianConsentWorkflow` | **Canonical / Live** | Advertised in `apps/web/src/lib/modules/catalog.ts` as the module `href`; requires auth and module access |
| `/modules/informed-consents/v2/workspace` | `DoctorWorkspaceV2` | Hidden / feature-flagged | Behind `useClinicalContentFlags`; not advertised in module catalog |
| `/prototype/clinical-workspace-2` | Migrated DS workspace | **Prototype only** | Redirects to `/modules/informed-consents` in `production`; uses mock data; no auth integration |

Evidence from existing deliverables:

- `docs/ux-masterplan/13-pilot-ux-remediation-plan.md` states the decision: *“Promote the visual language and interaction model of `/prototype/clinical-workspace-2` as the canonical physician workspace. Strip its prototype banner and mock data, then wire it to real APIs.”*
- `docs/ux-masterplan/14-pilot-ux-remediation-results.md` confirms the outcome: *“`/modules/informed-consents` remains the canonical physician workspace entry point, served by `PhysicianConsentWorkflow`.”*
- `apps/web/src/app/prototype/clinical-workspace-2/README.md` states: *“Isolated interactive prototype … This route is not production code and uses only mock, in-memory data.”*

## Does `/modules/informed-consents` Use the Migrated DS UI?

**No.**

The production route renders `PhysicianConsentWorkflow` (`apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx`), a 4,000+ line hand-written component. A grep for Design System imports in the component and its directory returns no matches:

```bash
$ grep -r "@/components/design-system" apps/web/src/components/informed-consents/enterprise-workflow/
# no output
```

The same is true for `DoctorWorkspaceV2` and its `clinical-content` subtree:

```bash
$ grep -r "@/components/design-system" apps/web/src/components/clinical-content/
# no output
```

`ModuleShell` (used by `DoctorWorkspaceV2`) also has no Design System imports.

## What Is Required to Make the Migrated Workspace the Real Pilot Physician Workspace?

Based on the prior UX masterplan decisions and the current code state, the following work is required **before** `/prototype/clinical-workspace-2` can replace the canonical route. This is a scoping checklist, not an implementation plan.

### 1. Replace mock data with real API integration

The prototype uses in-memory mock patients, encounters, procedures, and assemblies. The canonical workspace must integrate with:

- Patient search API (e.g., TrakCare or cached local patient index)
- Encounter resolution API
- Clinical Knowledge Engine `/api/modules/clinical-content/assemble` or `/api/modules/clinical-knowledge/assembly`
- Approved IMC consent catalog / template mapping
- Real physician context (name, license, specialty, department) from auth claims, not hard-coded values

### 2. Remove prototype artifacts

- Delete or conditionally hide the yellow `Prototype — Clinical Workspace 2.0. Not for clinical use.` banner.
- Remove mock-only components such as the task-efficiency simulator (or make it an opt-in analytics overlay).
- Replace deterministic mock scenarios with real search/selection UX.

### 3. Wire patient-journey panels to production signing pipeline

The patient-journey panels under `components/patient/*` are currently out of scope and use mock signing. For a real pilot they must:

- Use the canonical patient signing route (`/sign/[token]` or equivalent).
- Integrate with secure link + OTP flow (`/api/public/secure-links/[token]/otp`, etc.).
- Persist signatures, decisions, and audit events to the backend.
- Render real PDF previews and final documents.

### 4. Align auth, permissions, and tenancy

- Convert the page from static prototype to dynamic, authenticated route (use `requirePageAuthClaimsOrRedirect`).
- Enforce `canAccessModule("informed-consents", …)`.
- Bind all API calls to the authenticated tenant and physician.

### 5. Deprecate or redirect competing surfaces

Per `docs/ux-masterplan/13-pilot-ux-remediation-plan.md`:

- Deprecate `PhysicianConsentWorkflow` (current `/modules/informed-consents`).
- Deprecate or hide `DoctorWorkspaceV2` (`/modules/informed-consents/v2/workspace`).
- Replace the module catalog `href` or redirect `/modules/informed-consents` to the new workspace.

### 6. Preserve enterprise capabilities

`PhysicianConsentWorkflow` supports additional sections that the prototype does not expose:

- Consent library search
- Collaboration / review team
- Status & audit
- Support & settings
- Enterprise support settings panel

A production migration must either port these sections or explicitly defer them with product approval.

### 7. Re-validate with real data

- End-to-end pilot flow with real tenant + SMTP/SMS gateway.
- RTL, mobile, accessibility audit.
- Performance with real patient/encounter search latency.
- Security review of patient data handling.

## Final Verdict

**PROTOTYPE ONLY — NOT CONNECTED**

The VE-03 Design System migration successfully upgraded the visual layer of `/prototype/clinical-workspace-2`, but that route is deliberately isolated and uses mock data. The Internal IMC Pilot’s canonical physician workspace remains `/modules/informed-consents` (`PhysicianConsentWorkflow`), which is not built with the Design System and is not the same UI as the migrated prototype.

Connecting the migrated workspace to production would require a separate, substantial engineering effort scoped around real APIs, auth/tenancy, patient-journey signing persistence, deprecation of competing surfaces, and enterprise feature parity.
