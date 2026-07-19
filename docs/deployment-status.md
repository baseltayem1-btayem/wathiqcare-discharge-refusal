# Deployment Status — Operational Note

## Status: NO-GO for Production Cutover

> **Effective Date:** 2026-03-20
> **Applies To:** All Railway and Vercel deployments of WathiqCare

---

## Current Deployment Classification

Current deployments to **Railway** (API) and **Vercel** (web frontend) are classified as:

- **Non-production validation environments**
- Used exclusively for **system integration testing** and **smoke checks**

These deployments **do NOT constitute a production release** and **do NOT override** the
"NO-GO for production cutover" decision.

---

## Production Release Gate

Production release is **blocked** until all of the following are resolved:

| Requirement | Status |
|---|---|
| ORM compatibility resolution | Pending |
| Full schema-app alignment | Pending |
| Controlled migration plan | Pending |
| Final legal/technical sign-off | Pending |

---

## Validation Environments

| Platform | Role | Scope |
|---|---|---|
| Railway | API smoke & integration | Non-production |
| Vercel | Frontend smoke & integration | Non-production |

Data in these environments must not be treated as production data. No patient or
clinical data should be entered into these environments until the production release
gate is cleared and formal go-live authorization is issued.

---

## Responsibilities

- **Engineering:** Ensure all ORM and schema alignment issues are resolved and
  a controlled migration plan is documented before requesting production sign-off.
- **Legal/Compliance:** Provide final legal/technical sign-off after reviewing
  the migration plan and schema-app alignment report.
- **Operations:** Do not promote any Railway or Vercel deployment to a production
  role until this document is updated to reflect "GO for production cutover."

---

## Related Documents

- [`docs/internal-soft-launch.md`](internal-soft-launch.md) — Internal soft launch runbook
- [`docs/discharge-legal-engine/runbook.md`](discharge-legal-engine/runbook.md) — Deployment runbook
