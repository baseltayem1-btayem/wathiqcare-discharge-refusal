# Governance Test Report

Generated: 2026-06-26T10:54:55.230Z
Tenant: tenant-cke-verification

✅ PASS

- **Published packages:** 243

| Transition | Allowed | Result |
|---|---|---|
| Seeded packages are auto-published | Yes | ✅ |
| Published packages are not auto-archived/deleted by seed | No | ✅ |
| DRAFT → UNDER_REVIEW | Yes | ✅ |
| DRAFT → ARCHIVED | Yes | ✅ |
| DRAFT → REJECTED | Yes | ✅ |
| UNDER_REVIEW → MEDICALLY_APPROVED | Yes | ✅ |
| UNDER_REVIEW → LEGALLY_APPROVED | Yes | ✅ |
| UNDER_REVIEW → REJECTED | Yes | ✅ |
| UNDER_REVIEW → ARCHIVED | Yes | ✅ |
| MEDICALLY_APPROVED → LEGALLY_APPROVED | Yes | ✅ |
| MEDICALLY_APPROVED → UNDER_REVIEW | Yes | ✅ |
| LEGALLY_APPROVED → PUBLISHED | Yes | ✅ |
| LEGALLY_APPROVED → UNDER_REVIEW | Yes | ✅ |
| PUBLISHED → SUPERSEDED | Yes | ✅ |
| PUBLISHED → ARCHIVED | Yes | ✅ |
| SUPERSEDED → ARCHIVED | Yes | ✅ |
| REJECTED → ARCHIVED | Yes | ✅ |
| PUBLISHED → DRAFT | No | ✅ |
| PUBLISHED → UNDER_REVIEW | No | ✅ |
| ARCHIVED → PUBLISHED | No | ✅ |
| REJECTED → PUBLISHED | No | ✅ |
| DRAFT → PUBLISHED | No | ✅ |
