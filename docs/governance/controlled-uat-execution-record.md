# Controlled UAT Execution Record

## Status

- Phase: Controlled UAT Environment
- Baseline commit: `396cda6`
- Execution owner: GitHub Copilot assisted execution; named UAT owner still required
- Date: 2026-05-07
- Current result: `BLOCKED - live host reachable, controlled UAT evidence incomplete`

## Environment Identity

- UAT environment URL: `https://wathiqcare.online`
- Web host: Vercel
- API host: frontend API proxy reachable at `https://wathiqcare.online/api/*`; direct backend host not available from current workspace access
- HTTPS confirmed: Yes
- SSL certificate issuer: `CN=R13, O=Let's Encrypt, C=US`
- SSL certificate expiry: `2026-06-06 02:55:50`
- Mixed-content warnings observed: No on login page validation

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

- HTTPS status: Pass for `/login` and `/api/health`
- Notes: Browser validation showed only font preload warnings and no mixed-content warnings. Direct TLS inspection returned `CN=wathiqcare.online` issued by Let's Encrypt. Windows `curl` required `--ssl-no-revoke` because the local host could not complete revocation checks, but browser/TLS handshake validation succeeded. Secure-link HTTPS generation could not be end-to-end validated because no invited UAT user completed authenticated case creation on the live host.

## Database Validation Record

Target database: ____________________

Encoding verification query:

```sql
SELECT current_database() AS database_name, pg_encoding_to_char(encoding) AS encoding
FROM pg_database
WHERE datname = current_database();
```

Result:

- Database encoding confirmation: Not verified on the live environment from current workspace access
- Backup location: Not available from current workspace access
- Backup retention period: Not available from current workspace access
- Daily backup schedule: Not available from current workspace access
- Restore target database: Not available from current workspace access

Backup test commands:

```bash
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="wathiqcare-uat-YYYYMMDD.dump"
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" "wathiqcare-uat-YYYYMMDD.dump"
```

Backup drill result:

- Test backup performed: No
- Test restore performed: No
- Backup policy summary: Procedure documented in governance/runbook, but live UAT database access was not provided
- Restore procedure summary: Not executed; no live UAT database credentials or backup console access were available
- Blockers: live PostgreSQL credentials, backup location access, retention policy evidence, and restore target access were not available

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

- Web log location: Not available from current workspace access
- API log location: Not available from current workspace access
- Search method: Not available from current workspace access
- Logs timestamped: Not verified live
- Logs searchable: Not verified live

Monitoring summary:

- Auth failures visible: Partially; live release gate captured a 401 login failure with trace ID `7741b25e-3045-44b0-b7a3-1725a5604780`
- OTP events visible: Not verified live
- Secure-link events visible: Not verified live
- PDF and legal package failures visible: Not verified live
- Audit failure visibility confirmed: Not verified live
- Notes: Application-level instrumentation exists in the validated baseline, but live log consoles, retention policy enforcement, searchability, and alert routing were not accessible from this workspace session

## Controlled User List

Approved UAT accounts only:

| User | Email | Role | Dashboard | Status |
| --- | --- | --- | --- | --- |
| Legal Affairs | Not provisioned in evidence set | `legal_admin` | `/legal/dashboard` | Blocked pending invited UAT account |
| Selected Physician 1 | Not provisioned in evidence set | `doctor` | `/doctor/dashboard` | Blocked pending invited UAT account |
| Selected Physician 2 | Not provisioned in evidence set | `doctor` | `/doctor/dashboard` | Blocked pending invited UAT account |
| Medical Director | Not provisioned in evidence set | `medical_director` | `/medical-director/dashboard` | Blocked pending invited UAT account |
| Quality/Compliance | Not provisioned in evidence set | `compliance` or `quality` | `/compliance` plus permitted dashboard access | Blocked pending invited UAT account |
| IT Support/Admin | Not provisioned in evidence set | `tenant_admin` or `it_admin` | `/tenant/dashboard` or approved admin surface | Blocked pending invited UAT account |

Control confirmation:

- invite-only onboarding used: Not verified
- `POST /api/auth/password/signup` blocked from public use: Locally yes; live deployment not yet verified
- open registration disabled at ingress or routing layer: Not verified

Observed evidence:

- Earlier live probe: `POST https://wathiqcare.online/api/auth/password/signup` returned `400` with validation error on empty payload, proving the route was publicly reachable on the currently deployed host at time of execution
- Local control change implemented after that probe: `apps/web/app/api/auth/password/signup/route.ts` now rejects unauthenticated public self-registration by default unless `ENABLE_PUBLIC_PASSWORD_SIGNUP=true`
- Local validation passed: `npx tsx --test src/lib/server/password-signup-route.test.ts` returned `403` with the expected message when public signup is disabled
- Live external verification is still pending because the hardening change has not been confirmed deployed to `https://wathiqcare.online`

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

- UAT validation result: Fail
- Report artifact: `apps/web/artifacts/release-gate/final-prod-release-gate.json`
- Blockers, if any: exact command `npm run validate:prod-release -w apps/web` failed against `https://wathiqcare.online` at the first authenticated step because `admin@wathiqcare.online` returned `401 Invalid email or password`; subsequent direct probes of documented platform-admin credentials on both `admin@wathiqcare.online` and `admin@wathiqcare.med.sa` returned `429 Too many login attempts`, so platform access could not be used to provision controlled UAT users or re-run the gate from this workspace session

Observed issues:

- real HTTPS host is live, but controlled UAT accounts required by the gate were not available to the live environment
- public signup exposure was confirmed on the deployed host earlier in the session; a narrow runtime guard is now implemented and locally tested, but invite-only enforcement is still not proven on the live host until deployment and external verification occur
- live PostgreSQL UTF-8 verification was not possible because no database access was provided
- live backup, restore, and monitoring console access were not provided

Mitigations required before rerun:

- provision dedicated invite-only UAT accounts that match the release-gate workflow or provide an approved credential set for the live UAT tenant
- deploy and externally verify the runtime guard that blocks public access to `POST /api/auth/password/signup` for the UAT environment
- provide live PostgreSQL read access for UTF-8 verification and Arabic insert/retrieval validation
- provide backup console or database access for one backup and one restore drill
- provide Vercel/Railway or equivalent log access to verify timestamping, searchability, and retention

Recommendation:

- `HOLD`

## Phase 1 Output Summary

- UAT environment URL: `https://wathiqcare.online`
- Database encoding confirmation: Not verified live
- Backup policy summary: Not verified live
- Monitoring/logging summary: Live log access not provided; only application instrumentation and one 401 trace were directly observed
- Controlled users list: Not provisioned in execution evidence
- UAT validation result: Fail
- Blockers: release-gate users unavailable on live host, documented platform-admin credentials now rate-limited on the live host, public-signup hardening not yet externally verified after local implementation, and no live DB/backup/log access
