# UAT Checklist

Execution guidance:
- Run with production-like roles and data.
- Record evidence (screenshot/log/request id) for every test.
- Mark each item as Pass/Fail with notes.

## Test Matrix

| ID | Scenario | Expected Result | Status | Notes |
|---|---|---|---|---|
| UAT-01 | User login with valid credentials | Session established and dashboard shown |  |  |
| UAT-02 | User login with invalid credentials | Access denied with safe error message |  |  |
| UAT-03 | Access cases list with authorized role | Case list loads successfully |  |  |
| UAT-04 | Access cases list with unauthorized role | Request denied by permission guard |  |  |
| UAT-05 | Open case details | Overview and tabs load according to permissions |  |  |
| UAT-06 | Execute allowed workflow transition | Case stage updates and timeline reflects transition |  |  |
| UAT-07 | Execute forbidden workflow transition | Transition blocked with authorization/business validation |  |  |
| UAT-08 | Complete task | Task status changes to COMPLETED |  |  |
| UAT-09 | Upload valid document type/size | Upload succeeds and appears in case documents |  |  |
| UAT-10 | Upload disallowed MIME type | Upload rejected with validation error |  |  |
| UAT-11 | Upload oversized file | Upload rejected with validation error |  |  |
| UAT-12 | Download allowed document | Download descriptor is returned and file accessible |  |  |
| UAT-13 | Download restricted document without permission | Access denied |  |  |
| UAT-14 | Create legal note LEGAL_ONLY | Visible to legal readers only |  |  |
| UAT-15 | Create legal note COMPLIANCE_ONLY without compliance rights | Creation denied |  |  |
| UAT-16 | Case audit retrieval by authorized user | Audit entries returned in descending time order |  |  |
| UAT-17 | OTP request/verify normal path | OTP flow succeeds when cache backend is healthy |  |  |
| UAT-18 | API readiness endpoint | /api/health/ready returns success when dependencies are up |  |  |
| UAT-19 | Frontend health endpoint | /api/health returns success |  |  |
| UAT-20 | Service restart resilience | System recovers with no schema/runtime drift |  |  |

## UAT Exit Criteria
- [ ] No high-severity failures remain open.
- [ ] All security and authorization tests pass.
- [ ] All critical workflow/document/legal paths pass.
- [ ] Operations confirms health/readiness checks and logs.

## Sign-off
- UAT Lead: ____________________
- Clinical Representative: ____________________
- Legal/Compliance Representative: ____________________
- Date: ____________________
