# Pilot Production Account Register — IMC-JEDDAH

**Classification:** Internal – Restricted  
**Tenant:** International Medical Center – Jeddah (`imc-jeddah`)  
**Provisioning Script:** `apps/web/scripts/seed-pilot-users.ts`  
**Document Version:** 1.0  
**Effective Date:** 2026-05-09

---

## Purpose

This register documents the canonical pilot accounts provisioned for the WathiqCare
IMC-JEDDAH production pilot. It is the authoritative record of who has been granted
access, under which role, and with which module permissions.

**Passwords are NOT stored here.** Temporary first-login passwords are generated at
runtime by the provisioning script and must be distributed through a secure out-of-band
channel (encrypted message, password manager invitation, or in-person handover).

---

## IMC-JEDDAH Pilot Account Register

| # | Display Name | Username (email) | Assigned Role | Role Alias | Membership | Enabled Modules | First-Login Password Reset |
|---|---|---|---|---|---|---|---|
| 1 | Pilot Platform Administrator | `pilot.platform.admin@imc-jeddah.sa` | `platform_admin` | Platform Admin | ADMIN | Informed Consents, Promissory Notes, Discharge Refusal | ✅ Required |
| 2 | Pilot Legal Affairs Officer | `pilot.legal@imc-jeddah.sa` | `legal_admin` | Legal Affairs | ADMIN | Informed Consents, Promissory Notes, Discharge Refusal | ✅ Required |
| 3 | Pilot Medical Director | `pilot.medical.director@imc-jeddah.sa` | `medical_director` | Medical Director | OWNER | Informed Consents, Discharge Refusal | ✅ Required |
| 4 | Pilot Physician | `pilot.physician@imc-jeddah.sa` | `doctor` | Physician | MANAGER | Informed Consents, Discharge Refusal | ✅ Required |
| 5 | Pilot Nurse | `pilot.nurse@imc-jeddah.sa` | `nursing` | Nurse | MEMBER | Informed Consents, Discharge Refusal | ✅ Required |
| 6 | Pilot Quality & Compliance Officer | `pilot.quality@imc-jeddah.sa` | `compliance` | Quality / Compliance | VIEWER | Informed Consents, Promissory Notes, Discharge Refusal | ✅ Required |
| 7 | Pilot Finance Officer | `pilot.finance@imc-jeddah.sa` | `finance_officer` | Finance | ADMIN | Promissory Notes | ✅ Required |
| 8 | Pilot Risk Management Auditor | `pilot.risk@imc-jeddah.sa` | `auditor` | Risk Management | VIEWER | Informed Consents, Promissory Notes, Discharge Refusal | ✅ Required |
| 9 | Pilot Operations Coordinator | `pilot.operations@imc-jeddah.sa` | `patient_affairs` | Operations | MEMBER | Informed Consents, Discharge Refusal | ✅ Required |
| 10 | Pilot Executive Viewer | `pilot.executive@imc-jeddah.sa` | `read_only_manager` | Executive Viewer | VIEWER | Informed Consents, Promissory Notes, Discharge Refusal | ✅ Required |

---

## Module Access Summary

| Module | Roles with Access |
|---|---|
| **Informed Consents** | platform_admin, legal_admin, medical_director, doctor, nursing, compliance, auditor, patient_affairs, read_only_manager |
| **Promissory Notes** | platform_admin, legal_admin, compliance, finance_officer, auditor, read_only_manager |
| **Discharge Refusal** | platform_admin, legal_admin, medical_director, doctor, nursing, compliance, auditor, patient_affairs, read_only_manager |

---

## Provisioning Instructions

### Prerequisites

- `DATABASE_URL` environment variable must be set (production or pilot database).
- Run from the repository root or `apps/web` directory.

### Dry-Run (read-only preview)

```bash
npm run pilot:seed -w apps/web
```

Outputs the full list of accounts and their generated temporary passwords **without
writing to the database**. This is useful for previewing credentials before applying.

### Apply (write to database)

```bash
npm run pilot:seed:apply -w apps/web
```

- Creates or updates all 10 pilot accounts.
- Sets `password_reset_required = TRUE` for every account.
- Revokes any existing sessions.
- Prints the one-time temporary password for each account to stdout.
- **Copy the output immediately** — passwords cannot be recovered after the session ends.

---

## First-Login Flow

1. User receives temporary password through a secure out-of-band channel.
2. User navigates to `/login` and signs in with their email and temporary password.
3. The platform detects `password_reset_required = TRUE` and redirects to `/first-login`.
4. User sets a new compliant password (≥12 chars, upper, lower, digit, special character).
5. On success, the user is redirected to `/modules`.

---

## Security Controls

| Control | Implementation |
|---|---|
| Password hashing | bcrypt (12 rounds) via `apps/web/src/lib/server/password.ts` |
| No plaintext storage | Passwords hashed before DB write; plaintext appears only in stdout |
| Forced password change | `password_reset_required = TRUE` on all pilot accounts |
| Session revocation | `session_revoked_at` set on provisioning to invalidate prior sessions |
| Tenant isolation | All accounts scoped to `imc-jeddah` tenant |
| RBAC enforcement | Roles follow canonical aliases in `src/lib/server/roles.ts` |
| Idempotent execution | Script uses upsert patterns; safe to re-run |

---

## Rotation & Offboarding

- To rotate a pilot user's password, use:
  ```bash
  npm run admin:reset-password -w apps/web -- --username pilot.legal@imc-jeddah.sa --password <newPassword> --apply
  ```
- To disable a pilot account, set `is_active = FALSE` and `status = 'suspended'` via the
  platform admin panel or directly in the database.
- At pilot conclusion, all pilot accounts must be disabled or removed before general availability.

---

## Audit Trail

The provisioning script records the following for each run:

- Mode (dry-run / apply)
- Account email and role
- Action taken (created / updated)
- First-login required flag

For regulatory audit purposes, the script execution and credential distribution must be
logged in your operational change-management system.

---

*DO NOT store passwords in this document or in any version-controlled file.*
