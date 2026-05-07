# Controlled UAT Execution Record

## Status

- Phase: Controlled UAT Environment
- Baseline commit: `396cda6`
- Execution owner: ____________________
- Date: ____________________

## Environment Identity

- UAT environment URL: ____________________
- Web host: Vercel / other: ____________________
- API host: Railway / other: ____________________
- HTTPS confirmed: Yes / No
- SSL certificate issuer: ____________________
- SSL certificate expiry: ____________________
- Mixed-content warnings observed: Yes / No

## HTTPS Validation Record

Validation steps:

```bash
curl -Iv https://<uat-url>/login
curl -Iv https://<uat-url>/api/health
```

Required confirmation:

- all secure links resolve to `https://`
- browser console shows no mixed-content warnings on login and secure-link flows

Result:

- HTTPS status: Pass / Fail
- Notes: ____________________

## Database Validation Record

Target database: ____________________

Encoding verification query:

```sql
SELECT current_database() AS database_name, pg_encoding_to_char(encoding) AS encoding
FROM pg_database
WHERE datname = current_database();
```

Result:

- Database encoding confirmation: ____________________
- Backup location: ____________________
- Backup retention period: ____________________
- Daily backup schedule: ____________________
- Restore target database: ____________________

Backup test commands:

```bash
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="wathiqcare-uat-YYYYMMDD.dump"
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" "wathiqcare-uat-YYYYMMDD.dump"
```

Backup drill result:

- Test backup performed: Yes / No
- Test restore performed: Yes / No
- Backup policy summary: ____________________
- Restore procedure summary: ____________________
- Blockers: ____________________

## Monitoring And Logging Record

Required monitored signals:

- authentication failures
- OTP failures
- OTP replay attempts
- secure-link failures
- PDF generation failures
- legal-package generation failures
- audit write failures
- storage failures
- API 500 errors

Confirmed log access:

- Web log location: ____________________
- API log location: ____________________
- Search method: ____________________
- Logs timestamped: Yes / No
- Logs searchable: Yes / No

Monitoring summary:

- Auth failures visible: Yes / No
- OTP events visible: Yes / No
- Secure-link events visible: Yes / No
- PDF and legal package failures visible: Yes / No
- Audit failure visibility confirmed: Yes / No
- Notes: ____________________

## Controlled User List

Approved UAT accounts only:

| User | Email | Role | Dashboard | Status |
| --- | --- | --- | --- | --- |
| Legal Affairs | ____________________ | `legal_admin` | `/legal/dashboard` | Pending |
| Selected Physician 1 | ____________________ | `doctor` | `/doctor/dashboard` | Pending |
| Selected Physician 2 | ____________________ | `doctor` | `/doctor/dashboard` | Pending |
| Medical Director | ____________________ | `medical_director` | `/medical-director/dashboard` | Pending |
| Quality/Compliance | ____________________ | `compliance` or `quality` | `/compliance` plus permitted dashboard access | Pending |
| IT Support/Admin | ____________________ | `tenant_admin` or `it_admin` | `/tenant/dashboard` or approved admin surface | Pending |

Control confirmation:

- invite-only onboarding used: Yes / No
- `POST /api/auth/password/signup` blocked from public use: Yes / No
- open registration disabled at ingress or routing layer: Yes / No

## UAT Validation Result

Release gate command:

```bash
VALIDATION_BASE_URL="https://<uat-url>" node apps/web/scripts/prod-release-gate.cjs
```

Validation coverage:

- login
- password reset
- role dashboards
- case creation
- secure-link generation
- secure patient refusal flow
- OTP lifecycle
- audit trail
- Arabic PDF
- English PDF
- legal package generation
- logout and session cleanup

Result:

- UAT validation result: Pass / Fail
- Report artifact: ____________________
- Blockers, if any: ____________________

## Phase 1 Output Summary

- UAT environment URL: ____________________
- Database encoding confirmation: ____________________
- Backup policy summary: ____________________
- Monitoring/logging summary: ____________________
- Controlled users list: ____________________
- UAT validation result: ____________________
- Blockers: ____________________
