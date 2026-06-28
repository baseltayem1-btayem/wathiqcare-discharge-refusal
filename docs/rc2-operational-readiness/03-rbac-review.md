# 03 — RBAC Review

## 1. Role Model

### 1.1 Platform roles

| Role | Scope |
|------|-------|
| `platform_superadmin` | Full platform access |
| `platform_admin` | Full platform access (wildcard in `userRoleAllows`) |

### 1.2 Tenant administrative roles

| Role | Notes |
|------|-------|
| `tenant_owner` | Mapped to `OWNER` membership |
| `tenant_admin` | Mapped to `ADMIN` membership; `admin`/`owner` aliases also grant tenant admin consent permissions |
| `legal_admin` | Mapped to `ADMIN` membership |

### 1.3 Consent-module roles (`informed-consents-rbac.ts`)

| Role | Key Permissions |
|------|-----------------|
| `platform_admin` | All permissions |
| `subscriber_admin` | Template + consent management |
| `consent_admin` | Template + consent management |
| `consent_physician` | Create, review, approve, send signature |
| `consent_legal_reviewer` | Legal approval, wording, governance view |
| `consent_medical_reviewer` | Medical approval, wording, governance view |
| `consent_compliance_reviewer` | Compliance approval, wording, governance view |
| `consent_viewer` | Read-only evidence |
| `tenant_admin` | Same as subscriber admin |

### 1.4 Operational role bridge

`OPERATIONAL_CONSENT_ROLE_MAP` (`informed-consents-rbac.ts:136-146`) maps:

| Operational role | Consent role |
|------------------|--------------|
| doctor / nursing / nurse | `consent_physician` |
| medical_director | `consent_medical_reviewer` |
| legal_admin / legal | `consent_legal_reviewer` |
| compliance | `consent_compliance_reviewer` |
| auditor / quality | `consent_viewer` |

There is **no patient login role**. Patients authenticate via opaque secure
link + OTP, not via a user account.

## 2. Permission Summary by Required Actor

| Actor | Can Log In | Create Consent | Send for Signature | View Evidence | Finalize | Notes |
|-------|------------|----------------|--------------------|---------------|----------|-------|
| Patient | No (link-based) | No | No (receives link) | Own consent only via link | No | N/A |
| Physician | Yes | Yes | Yes | Yes (own + tenant) | No | `consent_physician` |
| Nurse | Yes | Yes (mapped to physician) | Yes | Yes | No | Mapped to `consent_physician` |
| Interpreter | No role | No | No | No | No | Not implemented |
| Witness | No role | No | No | No | No | Not implemented |
| Legal | Yes | No | No | Yes | No | `consent_legal_reviewer` |
| Compliance | Yes | No | No | Yes | No | `consent_compliance_reviewer` |
| Administrator | Yes | Yes | Yes | Yes | Yes | `tenant_admin` / `consent_admin` |
| System | N/A | N/A | N/A | N/A | N/A | Service-to-service via internal secrets |

## 3. Findings

### 3.1 Platform admins bypass all role checks

- **Description:** `userRoleAllows` (`roles.ts:108-111`) returns `true` for any
  `platform_superadmin` or `platform_admin`, regardless of the requested
  allowed-roles list. This is used as a wildcard across route guards.
- **Severity:** Medium
- **Operational Impact:** A compromised platform admin account can access any
  tenant consent, evidence, or audit data.
- **Clinical Impact:** Potential unauthorized access to patient consent records
  across tenants.
- **Recommendation:** Require explicit tenant membership + scoped permission
  checks even for platform admins; use the wildcard only for platform-level
  endpoints (billing, tenant provisioning).
- **Estimated Effort:** 1–2 days.
- **Owner:** Security + Engineering.

### 3.2 Tenant inactive bypass flag exists

- **Description:** `requireAuth` reads `TEMP_TENANT_ADMIN_INACTIVE_BYPASS`. When
  enabled, a tenant admin whose tenant is inactive is still allowed to log in
  (`auth.ts:224-235`).
- **Severity:** Medium
- **Operational Impact:** If the flag is accidentally enabled in production,
  deactivated tenants remain accessible.
- **Clinical Impact:** Inactive tenant data may be viewed or modified.
- **Recommendation:** Audit production environment variables before go-live;
  ensure `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` is unset/0. Add an alert if the
  flag is detected as `true`.
- **Estimated Effort:** 30 minutes.
- **Owner:** Platform SRE.

### 3.3 No multi-factor authentication

- **Description:** Staff authentication is single-factor (password + session
  cookie). No MFA/TOTP/WebAuthn enforcement observed.
- **Severity:** Medium
- **Operational Impact:** Stolen credentials grant full account access.
- **Clinical Impact:** Unauthorized physician or admin actions could be
  attributed to a legitimate user.
- **Recommendation:** Enable MFA for `tenant_admin`, `legal_admin`, and platform
  roles before controlled production release.
- **Estimated Effort:** 2–5 days.
- **Owner:** Security + Engineering.

### 3.4 No granular consent ownership

- **Description:** Any physician/nurse mapped to `consent_physician` can create
  and send consents within the tenant. There is no check that the creator is
  the assigned physician for the case.
- **Severity:** Low
- **Operational Impact:** Risk of misattributed dispatch actions.
- **Clinical Impact:** Low if clinical SOP assigns cases to named physicians.
- **Recommendation:** Add case-level physician assignment check or document SOP
  that case assignment is validated at the EHR level.
- **Estimated Effort:** 1 day.
- **Owner:** Engineering + Clinical Operations.

### 3.5 Patient public signer is not an RBAC user

- **Description:** Patients authenticate via token + OTP, not a user account.
  This is correct for the public signing flow but means revocation of a single
  patient link does not revoke the patient as a user.
- **Severity:** Low (positive design note)
- **Operational Impact:** N/A
- **Clinical Impact:** N/A
- **Recommendation:** Continue to treat public signers as ephemeral sessions;
  document link revocation as the control.
- **Estimated Effort:** N/A.
- **Owner:** N/A.
