# Pilot Production Account Register

**Tenant:** IMC-JEDDAH
**Environment Tag:** PILOT_PRODUCTION_IMC
**Domain:** imc.wathiqcare.online
**Platform:** WathiqCare Production — wathiqcare.online
**Document Status:** ACTIVE — Controlled Pilot

---

## Security Controls

- All pilot accounts are provisioned with **password reset required on first login**.
- Passwords are bcrypt-hashed (12 rounds). No plaintext is stored in the database.
- No fake or demo patient data has been created.
- Audit logging is enabled and preserved for all accounts.
- Public demo credentials have been removed from the public login UI.
- Passwords delivered through internal authorized channel only.

---

## Pilot User Register

| # | Display Name | Username | Email | Role | Allowed Modules | Validation Status | Password Delivery Status |
|---|---|---|---|---|---|---|---|
| 1 | WathiqCare Platform Admin | platform.admin | platform.admin@imc.wathiqcare.online | platform_superadmin | informed-consents, promissory-notes, discharge-refusal | Pending first-login validation | Shared securely through internal authorized channel. |
| 2 | Basel Tayem | legal.director | legal.director@imc.wathiqcare.online | legal_director | informed-consents, promissory-notes, discharge-refusal | Pending first-login validation | Shared securely through internal authorized channel. |
| 3 | Legal Officer 01 | legal.officer01 | legal.officer01@imc.wathiqcare.online | legal_officer | informed-consents, discharge-refusal | Pending first-login validation | Shared securely through internal authorized channel. |
| 4 | Medical Director IMC | medical.director | medical.director@imc.wathiqcare.online | medical_director | informed-consents, promissory-notes, discharge-refusal | Pending first-login validation | Shared securely through internal authorized channel. |
| 5 | Dr. Ahmed Pilot | doctor.ahmed | doctor.ahmed@imc.wathiqcare.online | doctor | informed-consents, discharge-refusal | Pending first-login validation | Shared securely through internal authorized channel. |
| 6 | Dr. Sara Pilot | doctor.sara | doctor.sara@imc.wathiqcare.online | doctor | informed-consents, discharge-refusal | Pending first-login validation | Shared securely through internal authorized channel. |
| 7 | Nurse Fatimah | nurse.fatimah | nurse.fatimah@imc.wathiqcare.online | nurse | informed-consents, discharge-refusal | Pending first-login validation | Shared securely through internal authorized channel. |
| 8 | Quality Compliance Officer | quality.compliance | quality.compliance@imc.wathiqcare.online | quality_compliance | informed-consents, promissory-notes, discharge-refusal, audit-review | Pending first-login validation | Shared securely through internal authorized channel. |
| 9 | Finance Admin | finance.admin | finance.admin@imc.wathiqcare.online | finance_admin | promissory-notes | Pending first-login validation | Shared securely through internal authorized channel. |
| 10 | Executive Viewer | executive.viewer | executive.viewer@imc.wathiqcare.online | executive_viewer | read-only dashboard, executive analytics | Pending first-login validation | Shared securely through internal authorized channel. |

---

## RBAC Role Resolution

The following pilot roles resolve to canonical system roles via the `canonicalizeUserRole` alias table:

| Pilot Role | Canonical Role | Module Access |
|---|---|---|
| platform_superadmin | platform_superadmin | All modules (platform-wide) |
| legal_director | legal_admin | informed-consents, promissory-notes, discharge-refusal |
| legal_officer | legal_admin | informed-consents, discharge-refusal |
| medical_director | medical_director | informed-consents, discharge-refusal |
| doctor | doctor | informed-consents, discharge-refusal |
| nurse | nursing | informed-consents, discharge-refusal |
| quality_compliance | compliance | informed-consents, promissory-notes, discharge-refusal, audit-review† |
| finance_admin | finance_officer | promissory-notes |
| executive_viewer | viewer | read-only (no standard module tiles) |

> † `audit-review` is provisioned as an intended access right for the Quality Compliance role. It is not a currently catalogued module tile and will not appear as a module card until the audit-review module is activated in the platform module catalog.

---

## Validation Checklist (Per User)

For each pilot account, confirm:

- [ ] Login works with provisioned email and temporary password
- [ ] Password reset is triggered on first login (redirect to `/first-login`)
- [ ] After password reset, redirect to `/modules` works
- [ ] Correct modules are visible per role
- [ ] Unauthorized modules are hidden
- [ ] Unauthorized routes are blocked (HTTP 401/403 or redirect to login)
- [ ] Logout and session cleanup works correctly

---

## Provisioning

Run from `apps/web`:

```bash
# Dry-run (preview only — no DB writes):
npm run pilot:seed

# Apply (provision to production DB):
npm run pilot:seed -- --apply
```

---

## Governance Notes

- This register is the single source of truth for IMC pilot account identities.
- Any changes to pilot users must be reflected here and provisioned via the controlled script.
- Password rotation must be performed through the platform admin panel or `npm run admin:reset-password`.
- Demo credentials (`demo.*@demo-imc.local`) have been removed from the public login UI as of this pilot activation.
- This document does not contain passwords. Passwords are delivered through internal authorized channels only.
