# IMC Pilot Hardening — Phase 1

Baseline source commit: `e8080437e94f6d7258753468e969a4520e72a931`

## Release decision

**NO-GO for production deployment.** This package closes the confirmed critical
application-layer gaps and adds a release gate. It must be applied to a new
branch and validated in Preview/UAT before any production promotion.

## Remediation completed

1. Protected page routing now verifies the HS256 signature, issuer, subject,
   and expiry of the session JWT. A cookie's mere presence is no longer enough.
2. Invalid session cookies are cleared and protected routes redirect to login.
3. Patient search no longer returns pilot patients when authentication or the
   database fails. Authentication errors are preserved; service failures return
   HTTP 503.
4. Approved-form, IMC-library, and content-mapping APIs now require authenticated
   informed-consent module access.
5. Internal API calls forward the authenticated cookie and do not silently
   downgrade to anonymous access.
6. Legacy `/cases` and `/dashboard` pages no longer expose hard-coded MRNs,
   diagnoses, physicians, or misleading case counts. They redirect to the
   canonical protected module routes.
7. Pilot patients, AI assistance, specialty prompts, knowledge-base retrieval,
   and webhooks default to disabled. Tenant/module isolation defaults to enabled.
8. The production environment template explicitly disables pilot data, real
   pilot sends, email overrides, public signup, admin bypasses, and temporary
   inactive-tenant bypasses.
9. Unsupported marketing/certification claims were replaced with controlled,
   evidence-based pilot wording.
10. Production security headers were strengthened and `unsafe-eval` removed
    from the production CSP.
11. Next.js, PDF.js, Nodemailer, and Puppeteer were upgraded to versions that
    address the high-severity advisories detected on the baseline. The vendored
    PDF.js worker was synchronized with the upgraded library.
12. TypeScript errors are no longer ignored by the production build.
13. The Python API no longer trusts platform-admin JWT claims when the user is
    absent from the database or the tenant does not match.
14. Python API CORS methods/headers were narrowed and security response headers
    were added.

## Verification performed

- 23 targeted authentication, tenant-isolation, timeline, template, and new
  edge-session tests passed.
- New edge-session tests reject tampered, expired, wrong-issuer, and missing-expiry
  tokens.
- Modified configuration and locale JSON parse successfully.
- Dependency audit findings reduced from 18 high-severity findings to 4.
- No private keys, AWS access keys, live Stripe keys, or literal hard-coded
  passwords were detected by the targeted source scan.

## Release blockers discovered

1. The repository contains substantial pre-existing TypeScript and lint debt.
   The earlier deployment hid this by setting `ignoreBuildErrors: true`.
2. Four high-severity dependency findings remain in Prisma/transitive tooling.
   The registry proposes a Prisma downgrade; this was not applied without
   database compatibility testing.
3. Microsoft Entra ID/MFA is not production-complete.
4. TrakCare/EMR integration, authoritative patient identity, and write-back are
   not validated in this source-only environment.
5. Production secrets, database migrations, backups/restore, monitoring, and
   retention/legal-hold operations require validation in IMC-controlled UAT.
6. The approved consent PDF binaries were intentionally excluded from the
   uploaded archive and must remain present in the source repository during UAT.
7. Formal IMC approvals remain required from Legal, Clinical, Quality, Privacy,
   Cybersecurity, and IT Operations.

## Safe application

Apply the supplied commit/patch to a branch created from the exact baseline:

```powershell
git fetch origin
git switch phase24-evidence-package-final
git pull --ff-only
git switch -c hardening/imc-pilot-phase1
git am C:\path\to\wathiqcare-imc-pilot-hardening-phase1.patch
npm ci
npm run prisma:generate
npm test -w apps/web
npm run build -w apps/web
```

Do not deploy if the baseline commit differs, the patch conflicts, the build
fails, or any production/pilot environment flag is not explicitly reviewed.
