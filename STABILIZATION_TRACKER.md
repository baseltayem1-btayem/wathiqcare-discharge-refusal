# STABILIZATION TRACKER

**Phase:** 1.1 – Change Freeze
**Mode:** Production Stabilization Only
**Effective Date:** 2026-05-23
**Status:** ACTIVE

---

## Change Freeze Policy

All feature development is **HALTED**. The following are **prohibited** until this freeze is lifted:

- ❌ New AI features
- ❌ New templates
- ❌ New integrations
- ❌ Architecture refactors

**Allowed work:**

- ✅ Production stabilization fixes
- ✅ Bug fixes against tracked items below
- ✅ Observability / logging required to diagnose tracked items
- ✅ Security patches (CVE / credential rotation)
- ✅ Rollback / hotfix to restore production stability

Any change outside the allowed scope requires explicit approval and an exception entry at the bottom of this file.

---

## Tracked Stabilization Areas

Each area is tracked independently. Update the status, last verified timestamp, and notes as work progresses.

**Status legend:** 🟢 Stable · 🟡 Degraded / Monitoring · 🔴 Broken / Incident · ⚪ Not yet verified

---

### 1. Login

- **Owner:** _unassigned_
- **Status:** ⚪ Not yet verified
- **Last verified:** —
- **Scope:** Authentication entry points (credential login, magic link, session establishment, redirect behavior, login settings).
- **Known references:** `/memories/repo/login-auth-troubleshooting.md`, `/memories/repo/magic-link-auth.md`
- **Open issues:**
  - [ ] _add issue_
- **Recent fixes:**
  - _none_
- **Verification steps:**
  - [ ] Pilot user can log in via primary flow
  - [ ] Magic link flow issues and validates token
  - [ ] Session persists across reload
  - [ ] Logout clears session
- **Notes:**

---

### 2. Database

- **Owner:** _unassigned_
- **Status:** ⚪ Not yet verified
- **Last verified:** —
- **Scope:** Prisma schema integrity, migration state, connection pool health, tenant isolation, backup verification.
- **Known references:** `/memories/repo/secure-link-fallback-and-schema-drift.md`, `/memories/repo/nextjs16-turbopack-prisma-incompat.md`, `/memories/repo/platform-tenant-rescue.md`
- **Open issues:**
  - [ ] _add issue_
- **Recent fixes:**
  - _none_
- **Verification steps:**
  - [ ] `prisma migrate status` clean in production
  - [ ] No schema drift vs. live DB
  - [ ] Connection pool not saturated
  - [ ] Backups within RPO
- **Notes:**

---

### 3. Pilot Users

- **Owner:** _unassigned_
- **Status:** ⚪ Not yet verified
- **Last verified:** —
- **Scope:** IMC pilot user accounts, role assignments, tenant binding, access to assigned cases.
- **Known references:** `/memories/repo/imc-production-tenant-id-mismatch.md`, `ops_imc_real_pilot_assignment.csv`, `ops_imc_real_pilot_case_tracker.csv`
- **Open issues:**
  - [ ] _add issue_
- **Recent fixes:**
  - _none_
- **Verification steps:**
  - [ ] All pilot users present and active
  - [ ] Tenant IDs match production tenant
  - [ ] Each pilot user can reach their assigned cases
  - [ ] No orphaned / duplicate accounts
- **Notes:**

---

### 4. MRNs

- **Owner:** _unassigned_
- **Status:** ⚪ Not yet verified
- **Last verified:** —
- **Scope:** Medical Record Number lookup, uniqueness, tenant scoping, patient identification correctness on forms and PDFs.
- **Known references:** `/memories/repo/pdf-validation-authoritative-fields.md`
- **Open issues:**
  - [ ] _add issue_
- **Recent fixes:**
  - _none_
- **Verification steps:**
  - [ ] MRN lookup returns correct patient
  - [ ] MRN is unique within tenant
  - [ ] MRN renders correctly on generated PDFs
  - [ ] No cross-tenant MRN leakage
- **Notes:**

---

### 5. Consent Route

- **Owner:** _unassigned_
- **Status:** ⚪ Not yet verified
- **Last verified:** —
- **Scope:** Dynamic consent engine route, template rendering, signing flow, witness flow, secure link delivery.
- **Known references:** `/memories/repo/dynamic-consent-engine-complete.md`, `/memories/repo/discharge-workflow-active-path.md`, `/memories/repo/legal-witness-integrity-framework.md`, `/memories/repo/secure-link-fallback-and-schema-drift.md`
- **Open issues:**
  - [ ] _add issue_
- **Recent fixes:**
  - _none_
- **Verification steps:**
  - [ ] Consent route loads for authorized user
  - [ ] Template renders with correct patient data
  - [ ] Signature capture works end-to-end
  - [ ] Witness path completes and is recorded
  - [ ] Secure link fallback works when primary delivery fails
- **Notes:**

---

### 6. OTP

- **Owner:** _unassigned_
- **Status:** ⚪ Not yet verified
- **Last verified:** —
- **Scope:** OTP generation, SMS delivery, validation, expiry, rate limiting, retry behavior.
- **Known references:** `FINAL_LIVE_SMS_VALIDATION_REPORT.md`
- **Open issues:**
  - [ ] _add issue_
- **Recent fixes:**
  - _none_
- **Verification steps:**
  - [ ] OTP generated and delivered via SMS within SLA
  - [ ] OTP validates on first correct entry
  - [ ] Expired OTP rejected
  - [ ] Rate limit enforced on repeated requests
  - [ ] Resend works and invalidates prior code
- **Notes:**

---

### 7. Evidence Package

- **Owner:** _unassigned_
- **Status:** ⚪ Not yet verified
- **Last verified:** —
- **Scope:** Evidence bundle generation (signed PDF + audit trail + witness attestation + integrity hash), storage, retrievability, tamper-evidence.
- **Known references:** `/memories/repo/legal-witness-integrity-framework.md`, `/memories/repo/pdf-validation-authoritative-fields.md`, `/memories/repo/windows-puppeteer-ebusy-pdf-uat.md`, `PDF_BINARY_FIX_ROOT_CAUSE_REPORT.md`, `e2e-pdf-verification-report.json`
- **Open issues:**
  - [ ] _add issue_
- **Recent fixes:**
  - _none_
- **Verification steps:**
  - [ ] Evidence package generated on signed consent
  - [ ] PDF binary is valid and renders
  - [ ] Authoritative fields populated correctly
  - [ ] Integrity hash matches stored value
  - [ ] Package retrievable by case ID
- **Notes:**

---

## Daily Status Roll-Up

| Date | Login | Database | Pilot Users | MRNs | Consent Route | OTP | Evidence Package | Notes |
|------|-------|----------|-------------|------|---------------|-----|------------------|-------|
| 2026-05-23 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Tracker initialized. Awaiting first verification pass. |

---

## Freeze Exceptions Log

Record any approved deviation from the change freeze. Default state: empty.

| Date | Requested by | Approved by | Scope of exception | Justification | Linked PR/commit |
|------|--------------|-------------|--------------------|---------------|------------------|
| —    | —            | —           | —                  | —             | —                |

---

## Exit Criteria (to lift freeze)

The freeze remains in effect until **all** of the following are true:

1. All 7 tracked areas are 🟢 Stable for 5 consecutive verified days.
2. Zero open Sev-1 / Sev-2 incidents.
3. Evidence Package integrity verified on a fresh end-to-end pilot case.
4. Sign-off recorded here by the responsible operations owner.

**Lift approval:** _pending_
