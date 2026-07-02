# IMC Surgery Physicians — Production Account Audit

**Audit date:** 2026-06-29  
**Auditor:** Enterprise Identity & Access Engineer — WathiqCare  
**Source of truth (IMC General Surgery roster):** `apps/web/src/components/informed-consents/production-workspace/lib/imc-doctors.ts`  
**Source URL:** https://www.imc.med.sa/ar/doctors (department filter: General Surgery)  
**Environment:** Production (`wathiqcare.online`)  
**Target tenant for provisioning:** `IMC Hospital` (tenant code: `imc`)

---

## 1. Scope

Audit the production database for login accounts matching the six (6) official IMC General Surgery physicians currently integrated in the Informed Consents production workspace.

Rules applied during this audit:
- No invented emails.
- No invented employee IDs.
- No invented passwords.
- No fake doctor accounts created.
- No deployments or promotions performed.

---

## 2. Production Database Snapshot

| Item | Value |
|------|-------|
| Database host | `ep-raspy-scene-a9hec4yg-pooler.gwc.azure.neon.tech` |
| Database name | `wathiqcare_prod_20260323093007` |
| Total tenants | 11 |
| Total users with `role = 'doctor'` | 5 |

### Tenants observed

- DEMO IMC Tenant (`demo-imc`)
- Default Tenant (`default`)
- Demo Hospital Group (`demo-hospital`)
- **IMC Hospital (`imc`)**
- Lina Groups (`LINA`)
- WathiqCare (`wathiqcare`)
- WathiqCare DEMO Platform (`wathiqcare-demo-platform`)
- WathiqCare IMC Pilot Tenant (`pilot-imc`)
- WathiqCare Platform (`platform`)
- WathiqCare Platform Internal (`platform-internal`)
- مستشفى الحياة العام @94 (`94`)

### Existing doctor-role users in production

| # | Full Name | Email | Tenant | Active | Has Password |
|---|-----------|-------|--------|--------|--------------|
| 1 | DEMO Doctor User | `demo.doctor@demo-imc.local` | `demo-imc` | Yes | Yes |
| 2 | Doctor Release Gate | `doctor.release@wathiqcare.online` | `wathiqcare` | Yes | Yes |
| 3 | Dr. Ahmed Al-Jeddah | `imc.jeddah.doctor1@imc.local` | `imc` | Yes | Yes |
| 4 | Dr. Ahmed Pilot Physician | `dr.ahmed@wathiqcare.med.sa` | `pilot-imc` | Yes | Yes |
| 5 | Smoke Physician | `smoke-physician@wathiqcare.test` | `demo-imc` | Yes | Yes |

> **Note:** None of the existing doctor accounts correspond to the six official IMC General Surgery physicians listed below. They are demo, pilot, smoke-test, or release-gate accounts.

---

## 3. IMC General Surgery Physician Account Matrix

| Doctor Name (EN) | Doctor Name (AR) | IMC Profile | Specialty | Department | Account Exists | Email Available | Employee ID Available | Role | Tenant | Active | Can Access `/modules/informed-consents` |
|------------------|------------------|-------------|-----------|------------|----------------|-----------------|-----------------------|------|--------|--------|------------------------------------------|
| Abdulaziz M. Saleem | عبد العزيز سليم | [Profile](https://www.imc.med.sa/ar/abdulaziz-m-saleem) | General Surgery & Colorectal Surgery Consultant | Department of Surgery | **No** | No | No | — | — | — | No |
| Abrar Youssef Nawawi | ابرار يوسف نواوي | [Profile](https://www.imc.med.sa/ar/abrar-youssef-nawawi) | General Surgery, Hepato-Pancreato-Biliary & Transplant Consultant | General Surgery Department | **No** | No | No | — | — | — | No |
| Ahmad Jan Mohammed | أحمد جان | [Profile](https://www.imc.med.sa/ar/ahmad-jan-mohammed) | General Surgery & Bariatric Surgery Consultant | Department of Surgery | **No** | No | No | — | — | — | No |
| Bashaer S. Albayhani | بشاير البيحاني | [Profile](https://www.imc.med.sa/ar/bashaer-s-albayhani) | General Surgery Senior Resident | Department of Surgery | **No** | No | No | — | — | — | No |
| Deena Hadedeya | دينا حديديه | [Profile](https://www.imc.med.sa/ar/deena-hadedeya) | Breast & Endocrine Tumors Surgery & General Surgery Consultant | Department of Surgery | **No** | No | No | — | — | — | No |
| Fahd Ali Binjoobah | فهد علي بن جوبح | [Profile](https://www.imc.med.sa/ar/fahd-binjoobah) | General Surgery Specialist | Department of Surgery | **No** | No | No | — | — | — | No |

---

## 4. Provisioning Status

- **Accounts created or updated:** 0
- **Accounts pending official identity data:** 6
- **Accounts rejected / not created due to missing data:** 6
- **Passwords set:** 0 (no permanent passwords assigned; first-login reset will be enforced once created)

### Why no accounts were created

The production `User` model does not contain an `employee_id` column, and — more importantly — **official IMC email addresses are not available in the codebase or database**. Per the provisioning rules, accounts are only created when official identity data is present. Therefore all six physicians remain in **Pending Identity Data** status.

---

## 5. Missing Identity Data

For each physician, the following fields are missing and must be supplied by IMC IT / HR:

- Official IMC email address
- Employee ID
- SCHS License Number
- Mobile Number
- Preferred Language (`ar` / `en`)
- Active / Inactive employment status

---

## 6. Next Action Required from IMC IT / HR

1. Fill in the CSV template: `docs/release/IMC_SURGERY_PHYSICIANS_PROVISIONING_TEMPLATE.csv`.
2. Return the completed CSV through the secure identity-provisioning channel (do **not** send via email or chat).
3. Once the CSV is validated, the Identity & Access Engineer will:
   - Create one `User` record per physician.
   - Assign `role = 'doctor'`.
   - Assign `tenantId` to the `IMC Hospital` (`imc`) tenant.
   - Set `isActive = true` only for rows marked **Active**.
   - Leave `hashedPassword` empty and force a password reset on first login.
   - Verify each account can access `/modules/informed-consents` (allowed roles include `doctor`).

---

## 7. Schema / Tenant Notes for Engineering

- The current `User` model does not store `employee_id`, `schs_license`, `mobile_number`, or `preferred_language`. These values should be tracked in the provisioning CSV and, if needed later, added to `TenantMembership.metadata` or a dedicated provider-identity extension table.
- `INFORMED_CONSENTS_ALLOWED_ROLES` in `apps/web/src/lib/modules/informed-consents-release.ts` already includes `doctor`, so a user with `role = 'doctor'` can access `/modules/informed-consents` once assigned to an active tenant.

---

## 8. Audit Method

- Production database queried read-only via `DATABASE_URL` from the local production env file.
- IMC physician roster imported from `apps/web/src/components/informed-consents/production-workspace/lib/imc-doctors.ts`.
- Matching performed by normalized name comparison (English and Arabic names).
- No writes, no password exposure, no account mutations.
