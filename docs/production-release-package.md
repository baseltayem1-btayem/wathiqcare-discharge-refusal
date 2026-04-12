<!-- markdownlint-disable MD022 MD031 MD032 MD034 MD040 MD058 MD060 -->

# WathiqCare — Production Release Package

**Prepared:** 2026-03-22  
**Branch:** `main` | **Latest commit:** `391a4ca` — "Fix web build and Prisma metadata typing"  
**Domain:** <https://wathiqcare.online>  
**Stack:** Next.js 16.1.6 / FastAPI (Python 3.11) / PostgreSQL (Prisma 6.19.2) / Railway (backend) + Vercel (frontend)

---

## 1. Release Checklist

### 1.1 Security & Auth

| # | Check | Owner | Status |
| --- | --- | --- | --- |
| S-01 | `JWT_SECRET_KEY` is a strong random string (≥32 chars), NOT "change-me" | DevOps | ⬜ |
| S-02 | Same `JWT_SECRET_KEY` value set on both Vercel (Next.js) AND Railway (Python backend) | DevOps | ⬜ |
| S-03 | `AUTH_COOKIE_SAME_SITE=lax` and `NODE_ENV=production` confirmed → `secure: true` cookie flag enforced | DevOps | ⬜ |
| S-04 | `AUTH_COOKIE_DOMAIN` unset (auto-detected as `.wathiqcare.online`) or explicitly set to `.wathiqcare.online` | DevOps | ⬜ |
| S-05 | `PUBLIC_LINK_TOKEN_PEPPER` set to a non-empty random string (HMAC pepper for secure-link hashing) | DevOps | ⬜ |
| S-06 | `CORS_ALLOW_ORIGINS` set to `https://wathiqcare.online` only (no wildcards) | DevOps | ⬜ |
| S-07 | Rate limiting active on `/auth/`, `/otp/`, `/secure-links/` (verified `SENSITIVE_ROUTE_RATE_LIMIT_PER_MIN` is appropriate, e.g. 20–60) | DevOps | ⬜ |
| S-08 | Backend login brute-force: 5-attempt lock per email in 5-minute window confirmed active | QA | ⬜ |
| S-09 | CSP header delivered on production responses (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) | QA | ⬜ |
| S-10 | Password hashing uses bcrypt (not MD5/SHA); verified in `passlib` config | Dev | ✅ |
| S-11 | Raw secure-link tokens are NOT stored in DB (only `token_hash`); confirmed via DB schema | Dev | ✅ |
| S-12 | OTP stored only as SHA-256 hash (`otp_code_hash`); plaintext never persisted | Dev | ✅ |
| S-13 | No `.env` file (with real secrets) committed to git; `.env` in `.gitignore` | Dev | ⬜ |
| S-14 | HTTPS enforced on Vercel (`force_ssl: true` in vercel.json or platform setting) | DevOps | ⬜ |
| S-15 | Platform superadmin password hash (`PLATFORM_ADMIN_PASSWORD_HASH`) set to non-demo/non-default value | DevOps | ⬜ |

---

### 1.2 Workflow & Automation

| # | Check | Owner | Status |
| --- | --- | --- | --- |
| W-01 | All 9 workflow stages reachable in staging: `nurse_draft → pending_physician_order → pending_patient_signature → accepted_discharge_execution → patient_relations_review → social_work_review → finance_review → legal_escalation → closed` | QA | ⬜ |
| W-02 | SLA timers fire correctly per stage (doctor: 6h, nursing: 8h, patient_affairs: 6h, finance: 8h, legal: 12h) | QA | ⬜ |
| W-03 | Escalation auto-triggers when SLA breached; `escalation_triggered` event recorded in `caseStepEvent` | QA | ⬜ |
| W-04 | Operations inbox queues load for all 9 departments; inbox route (`/api/operations/inbox/[department]`) responds < 3s | QA | ⬜ |
| W-05 | Assign / step / escalate quick-actions in inbox rows submit without leaving queue view | QA | ⬜ |
| W-06 | Role-gating enforced: viewer role sees "View only" label; cannot submit assign/step/escalate | QA | ⬜ |
| W-07 | Workload-aging chart and 7-day breach trend chart render on `/operations/inboxes` | QA | ⬜ |
| W-08 | Integration scheduler enabled/disabled via `INTEGRATION_SCHEDULER_ENABLED` env var; does not error on startup if disabled | DevOps | ⬜ |
| W-09 | `ensureOperationStateForCase` called correctly on case creation (no 500 errors on POST /api/cases) | QA | ✅ (fixed 391a4ca) |
| W-10 | Notification delivery (IN_APP and EMAIL) on workflow transitions confirmed in staging | QA | ⬜ |

---

### 1.3 SaaS Admin & Billing

| # | Check | Owner | Status |
| --- | --- | --- | --- |
| B-01 | Prisma migrations fully applied on production DB (`prisma migrate deploy` completed, no pending migrations) | DevOps | ⬜ |
| B-02 | Subscription plans seeded (STARTER / PROFESSIONAL / ENTERPRISE) in `SubscriptionPlan` table | DevOps | ⬜ |
| B-03 | Platform superadmin account created and password known only to authorized personnel | DevOps | ⬜ |
| B-04 | First tenant ("demo-hospital" or pilot tenant) created with owner account and ACTIVE subscription | DevOps | ⬜ |
| B-05 | `PAYMENT_PROVIDER` set correctly: `stripe` for production (or `hyperpay` if Saudi gateway); `mock` only acceptable for internal pilot | DevOps | ⬜ |
| B-06 | Stripe webhook endpoint registered and `STRIPE_WEBHOOK_SECRET` configured (if using Stripe) | DevOps | ⬜ |
| B-07 | Subscription trial period (`trialEndsAt`) set correctly for pilot tenants (14 days per seed config) | DevOps | ⬜ |
| B-08 | Admin panel (`/admin`) accessible by platform_superadmin; inaccessible to tenant staff (403 tested) | QA | ⬜ |
| B-09 | Tenant suspension (isActive=false) blocks all auth for that tenant's users; verified | QA | ⬜ |
| B-10 | Seat limit enforcement tested: STARTER plan (10 seats) blocks >10 user invitations | QA | ⬜ |

---

### 1.4 Tests & QA

| # | Check | Owner | Status |
| --- | --- | --- | --- |
| T-01 | Backend pytest suite passes: `cd apps/api && pytest -v` — target 60+ tests pass, 0 failures | Dev | ⬜ |
| T-02 | Frontend TypeScript build clean: `npx tsc --noEmit` — 0 errors | Dev | ✅ (391a4ca) |
| T-03 | Frontend production build passes: `npm run build` — 0 errors, 57+ static pages compiled | Dev | ✅ (391a4ca) |
| T-04 | Frontend lint clean: `npm run lint` — 0 errors (warnings acceptable) | Dev | ⬜ |
| T-05 | `./check_all.sh` passes from project root | Dev | ⬜ |
| T-06 | Secure-link tests: 14 scenarios in `test_secure_discharge_links.py` all pass | Dev | ⬜ |
| T-07 | Signature proof tests: `test_signature_proof_engine.py` all pass | Dev | ⬜ |
| T-08 | Workflow automation tests: `test_workflow_automation_service.py` (119 lines) all pass | Dev | ⬜ |
| T-09 | No `console.error` stack traces on happy-path flows (browser devtools check) | QA | ⬜ |
| T-10 | Lighthouse accessibility score ≥ 70 on `/login`, `/cases`, `/operations/inboxes` | QA | ⬜ |

---

### 1.5 Environment Variables

| # | Check | Owner | Status |
| --- | --- | --- | --- |
| E-01 | `DATABASE_URL` set on Railway backend pointing to production PostgreSQL | DevOps | ⬜ |
| E-02 | `DATABASE_URL` set on Vercel (Next.js) pointing to same production database | DevOps | ⬜ |
| E-03 | `DIRECT_URL` set on Vercel for Prisma direct connection (needed for migrations via Vercel) | DevOps | ⬜ |
| E-04 | `JWT_SECRET_KEY` identical on both Vercel and Railway | DevOps | ⬜ |
| E-05 | `NEXT_PUBLIC_API_BASE_URL` set to `https://api.wathiqcare.online` (Vercel-hosted frontend/API-proxy alias) or the direct Railway backend URL | DevOps | ⬜ |
| E-06 | `BACKEND_URL` / `BACKEND_API_BASE_URL` set on Vercel for server-side proxy | DevOps | ⬜ |
| E-07 | `APP_BASE_URL` set to `https://wathiqcare.online` | DevOps | ⬜ |
| E-08 | Microsoft Graph email: `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_SENDER_EMAIL` all set | DevOps | ⬜ |
| E-09 | SMS provider: `SMS_PROVIDER=taqnyat`; `SMS_BASE_URL`, `SMS_BEARER_TOKEN`, `SMS_SENDER` set; `SMS_ENABLED=true`; `WATHIQ_SMS_STUB_MODE` is NOT set (or set to false) | DevOps | ⬜ |
| E-10 | `PUBLIC_LINK_TOKEN_PEPPER` — unique, random, ≥32 chars; documented in password vault | DevOps | ⬜ |
| E-11 | `SMS_SENDER` set to registered sender name | DevOps | ⬜ |
| E-12 | `PLATFORM_ADMIN_PASSWORD_HASH` set (bcrypt hash of initial superadmin password) | DevOps | ⬜ |
| E-13 | `DEMO_OWNER_PASSWORD_HASH` set if seeding demo tenant; otherwise unset | DevOps | ⬜ |
| E-14 | `SHC_COMPLIANCE_MODULE=true` to activate Shareable Health Certificate module | DevOps | ⬜ |
| E-15 | `REDIS_URL` set if background tasks require Redis; `localhost:6379` is NOT valid in production | DevOps | ⬜ |
| E-16 | `SENTRY_DSN` set for production error monitoring | DevOps | ⬜ |
| E-17 | Review `apps/web/.env.example` and `.env.example` — every required (non-optional) variable confirmed set | DevOps | ⬜ |

Note: `api.wathiqcare.online` currently points to the Vercel frontend deployment and can serve Next.js API/proxy routes. It is not the direct Railway backend origin. Validate backend readiness on the backend service origin as well as through the frontend proxy.

Decision: Option A is approved for the current release. Keep `api.wathiqcare.online` as the Vercel-hosted frontend/API-proxy alias, keep current DNS unchanged, use Vercel proxying for browser-facing API traffic, and revisit dedicated backend-domain separation only if webhook handling or direct backend routing becomes necessary.

---

### 1.6 Post-Deploy Verification

| # | Check | Owner | Status |
| --- | --- | --- | --- |
| P-01 | Root `https://wathiqcare.online/` serves public landing page (not redirected to `/dashboard`) | QA | ⬜ |
| P-02 | `Enter System` CTA routes to `/login` | QA | ⬜ |
| P-03 | Login with pilot tenant credentials succeeds; JWT cookie set with `httpOnly, secure, SameSite=Lax` | QA | ⬜ |
| P-04 | `/dashboard` loads within 3s post-login | QA | ⬜ |
| P-05 | Case creation flow completes end-to-end: create → assign → workflow step → generate document → signature | QA | ⬜ |
| P-06 | Secure link generated, emailed to test address, token valid, decision captured, audit entry logged | QA | ⬜ |
| P-07 | SMS OTP delivered to test phone number (NOT stub mode) | QA | ⬜ |
| P-08 | Audit log (`/audit-log`) loads and displays events from the test flows above | QA | ⬜ |
| P-09 | Railway backend `/health` (or system inspect) returns 200 | DevOps | ⬜ |
| P-10 | No Sentry errors from post-deploy smoke test within first 30 minutes | DevOps | ⬜ |
| P-11 | Database backup confirmed (Railway/Neon automatic backups active) | DevOps | ⬜ |
| P-12 | Rollback plan confirmed: previous Vercel deployment accessible via dashboard; Railway rollback command known | DevOps | ⬜ |

---

## 2. Commit Plan

All changes committed to `main` as of `391a4ca`. The plan below groups logical units for a clean audit trail. **Execute in order (each commit must build clean).**

### Group 1 — Security & Auth

```
feat(auth): add server-side JWT issuer claim and algorithm enforcement
  - apps/api/backend/core/security.py: add JWT_ISSUER env claim, cap TTL at 30min
  - apps/web/src/lib/server/sessionCookie.ts: verify secure+httpOnly flags

fix(auth): enforce 403 on operations assign/step routes for unauthorized roles
  - apps/web/app/api/operations/cases/[caseId]/assign/route.ts
  - apps/web/app/api/operations/cases/[caseId]/step/route.ts
  Source: src/lib/operations/permissions.ts (hasOperationsAssignmentPermission, etc.)

feat(auth): add shared client-safe operations permission helpers
  - apps/web/src/lib/operations/permissions.ts (new)
  Functions: hasOperationsAssignmentPermission, hasOperationsStepPermission,
             hasOperationsEscalationPermission
  Role sets: ASSIGNMENT_ROLES, STEP_ACTION_ROLES, ESCALATION_ROLES
```

### Group 2 — Workflow & Automation

```
feat(workflow): extend inbox API with analytics and department assignment labels
  - apps/web/app/api/operations/inbox/[department]/route.ts
  Adds: agingBuckets, breachTrend (7-day), assignedDepartmentLabel per item

feat(operations): add department inbox UI with quick-action rows and charts
  - apps/web/app/operations/inboxes/page.tsx (major update)
  Adds: inline assign/step panels, one-click escalate, workload aging chart,
        7-day breach trend chart, auth/me role detection, "View only" fallback

feat(operations): add role-aware controls on case detail page
  - apps/web/app/cases/[id]/page.tsx
  Adds: parallel auth/me fetch, canAssign/canRunSteps/canEscalate memos,
        conditional Reassignment and Step Action form rendering

fix(operations): move ensureOperationStateForCase inside POST handler scope
  - apps/web/app/api/cases/route.ts
  Root cause: call was at module scope, causing tenantId/auth undefined errors
  Fixed in: 391a4ca

fix(types): cast Prisma metadata fields to InputJsonValue
  - apps/web/src/lib/server/operations.ts
  Adds Prisma namespace import; casts metadata to Prisma.InputJsonValue | undefined
  Fixed in: 391a4ca
```

### Group 3 — SaaS Admin & Billing

```
feat(billing): add subscription plans API and billing invoices route
  - apps/web/app/api/billing/plans/route.ts (new — 94 lines)
  - apps/web/app/api/billing/invoices/route.ts
  Plans: STARTER ($99/mo), PROFESSIONAL ($299/mo), ENTERPRISE ($999/mo)

feat(admin): update admin panel with tenant/subscription management
  - apps/web/app/admin/page.tsx (104-line update)

feat(seed): add platform superadmin and demo tenant seeding
  - prisma/seed.js: PLATFORM_ADMIN_PASSWORD_HASH, DEMO_OWNER_PASSWORD_HASH env-gated seeding
  - apps/api/backend/seed_data.py: pilot tenant user fixtures
```

### Group 4 — Tests & QA

```
test(secure-links): add 14-scenario secure discharge link test suite
  - apps/api/tests/test_secure_discharge_links.py (87 lines added)
  Covers: generation, access, expiry (410), revocation (404), decision capture,
          audit trail, IP logging, token hash isolation

test(workflow): add workflow automation service test suite
  - apps/api/tests/test_workflow_automation_service.py (119 lines)
  Covers: SLA tracking, escalation triggers, step transitions, automation events

test(signature): extend signature proof engine tests
  - apps/api/tests/test_signature_proof_engine.py
  - apps/api/tests/test_phase2_workflow_hardening.py

test(system): add system inspect health check tests
  - apps/api/tests/test_system_inspect.py (51 lines)

test(sms): add SMS OTP provider unit tests
  - apps/api/backend/signature/providers/sms_otp_provider.py (74 lines added)
  Covers: stub mode, real provider selection, mask_phone_number, verify_otp hash
```

---

## 3. Production Environment Prerequisites

### 3.1 JWT

| Variable | Required | Production Value |
|----------|----------|-----------------|
| `JWT_SECRET_KEY` | **REQUIRED** | Random string ≥ 32 chars (e.g. `openssl rand -hex 32`). Must be identical on Vercel + Railway. |
| `JWT_ALGORITHM` | Optional | `HS256` (only supported algorithm; leave default) |
| `JWT_ISSUER` | Optional | `wathiqcare` (default is fine; must match both services if customized) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | `30` recommended for production (backend caps at 30 regardless) |

**Action:** Generate once, store in shared password vault (1Password / AWS Secrets Manager), set on both platforms before deploy.

---

### 3.2 SMS Provider

| Variable | Required | Notes |
|----------|----------|-------|
| `SMS_PROVIDER` | **REQUIRED** | `taqnyat` (production contract) |
| `SMS_BASE_URL` | **REQUIRED** | Taqnyat API base URL (for example: `https://api.taqnyat.sa`) |
| `SMS_BEARER_TOKEN` | **REQUIRED** | Bearer token from Taqnyat dashboard |
| `SMS_SENDER` | **REQUIRED** | Registered sender name (must be pre-approved by provider) |
| `SMS_ENABLED` | **REQUIRED** | Must be `true` in production |
| `WATHIQ_SMS_STUB_MODE` | Must be **unset** or `false` | If set to `true`, real SMS is suppressed — do NOT set in production |

**Prerequisites:**
1. Create account with Taqnyat (https://taqnyat.sa)
2. Register sender ID "WathiqCare" (approval takes 1–3 business days in Saudi Arabia)
3. Top up SMS credit balance for pilot volume
4. Test with real phone number in staging before production cutover

---

### 3.3 Microsoft Email (Graph API)

| Variable | Required | Source |
|----------|----------|--------|
| `MICROSOFT_TENANT_ID` | **REQUIRED** | Azure Portal → Entra ID → Tenant ID |
| `MICROSOFT_CLIENT_ID` | **REQUIRED** | Azure Portal → App registrations → App ID |
| `MICROSOFT_CLIENT_SECRET` | **REQUIRED** | App registrations → Certificates & secrets → add new secret |
| `MICROSOFT_SENDER_EMAIL` | **REQUIRED** | From-address (e.g. `noreply@wathiqcare.online`); must be a licensed M365 mailbox or shared mailbox |

**Azure App Registration Setup:**
1. Entra ID → App registrations → New registration
2. Supported account type: `Accounts in this organizational directory only`
3. API permissions: `Mail.Send` (Application permission, not delegated)
4. Grant admin consent for the tenant
5. Create client secret (note expiry — set calendar reminder to rotate before expiry)
6. Set `MICROSOFT_SENDER_EMAIL` to a mailbox reachable from tenant's Exchange/M365

---

### 3.4 Admin / Superuser Passwords

**Platform Superadmin:**
```bash
# Generate bcrypt hash using Python
python3 -c "from passlib.context import CryptContext; ctx = CryptContext(schemes=['bcrypt']); print(ctx.hash('YOUR_STRONG_PASSWORD'))"
```
Set as `PLATFORM_ADMIN_PASSWORD_HASH` on Railway backend.

**Pilot Tenant Owner:**
```bash
python3 -c "from passlib.context import CryptContext; ctx = CryptContext(schemes=['bcrypt']); print(ctx.hash('TENANT_OWNER_PASS'))"
```
Set as `DEMO_OWNER_PASSWORD_HASH` on Railway; this seeds `owner@demo.wathiqcare.local` into the demo tenant.

**Password Policy Requirements:**
- Minimum 16 characters
- Mix of uppercase, lowercase, digits, symbols
- Store in password vault, not in environment files
- Rotate after first successful login

---

### 3.5 SaaS Subscription & Admin Setup (Deployment Order)

Execute in this exact sequence:

```
STEP 1 — Apply database migrations
  cd apps/web && npx prisma migrate deploy
  (or: railway run npx prisma migrate deploy)

STEP 2 — Seed subscription plans
  cd apps/web && npx prisma db seed
  (seeds STARTER/PROFESSIONAL/ENTERPRISE plans in SubscriptionPlan table)

STEP 3 — Create platform superadmin
  Run seed or use admin API with PLATFORM_ADMIN_PASSWORD_HASH set

STEP 4 — Create pilot tenant
  POST /api/admin/tenants with superadmin auth:
  { "code": "pilot-hospital", "name": "Pilot Hospital", "billingEmail": "...", "country": "SA" }

STEP 5 — Activate subscription for pilot tenant
  POST /api/admin/tenants/{tenantId}/subscription:
  { "planId": "<STARTER plan UUID>", "status": "ACTIVE", "billingInterval": "MONTHLY" }

STEP 6 — Invite pilot users (with role assignment)
  POST /api/admin/tenants/{tenantId}/users for: doctor, nursing, patient_affairs, legal_admin, viewer

STEP 7 — Verify via admin panel
  Login as superadmin → /admin → confirm tenant + subscription + users visible
```

---

## 4. Production UAT Script

**Environment:** https://wathiqcare.online  
**Duration:** ~2.5 hours  
**Testers:** 1 × Platform Admin, 1 × Clinical Lead (Doctor), 1 × Nurse, 1 × Legal Officer  
**Pre-Requisite:** Steps 1–7 in Section 3.5 completed; real SMS credit and email configured

---

### UAT-01 — Admin Login & Platform Access

**Role:** Platform Superadmin  
**Steps:**
1. Navigate to https://wathiqcare.online
2. Verify bilingual public landing page renders (Arabic RTL + English LTR toggle)
3. Click "Enter System" → verify redirect to `/login`
4. Login with superadmin credentials
5. Verify redirect to `/dashboard`
6. Navigate to `/admin`
7. Verify pilot tenant appears in tenant list with status ACTIVE
8. Inspect tenant subscription: plan = STARTER, status = ACTIVE, seats used = 0

**Expected:** All steps succeed; no 401/403/500 errors; JWT cookie has `httpOnly; Secure; SameSite=Lax`  
**Severity if blocked:** Sev 1

---

### UAT-02 — Tenant Creation

**Role:** Platform Superadmin  
**Steps:**
1. From `/admin`, create a second test tenant: name = "UAT Test Hospital", code = `uat-test`
2. Add a subscription (PROFESSIONAL plan, TRIALING, 14-day trial)
3. Invite a tenant owner user: `testowner@uat.test`
4. Verify owner receives invitation email (check Microsoft Graph delivery)
5. Tenant owner accepts invite, sets password, logs in

**Expected:** Tenant visible in admin panel; owner reaches dashboard; subscription shows TRIALING  
**Severity if blocked:** Sev 1

---

### UAT-03 — Subscription Activation

**Role:** Platform Superadmin  
**Steps:**
1. Navigate to admin → UAT Test Hospital → Subscription
2. Upgrade trial to ACTIVE (simulate payment confirmation)
3. Verify subscription status changes from TRIALING → ACTIVE
4. Verify `SubscriptionEvent` record created (PLAN_CHANGED / PAYMENT_SUCCEEDED)
5. Attempt to exceed seat limit (invite 51st user to PROFESSIONAL plan) → expect error

**Expected:** Status upgrade succeeds; seat overflow blocked with clear error  
**Severity if blocked:** Sev 2

---

### UAT-04 — Role Assignment

**Role:** Tenant Admin  
**Steps:**
1. Login as tenant owner for pilot hospital
2. Navigate to user management
3. Assign roles to test users:
   - User A → `doctor`
   - User B → `nursing`
   - User C → `patient_affairs`
   - User D → `legal_admin`
   - User E → `viewer`
4. Verify each user can login and sees role-appropriate navigation
5. Verify `viewer` role sees no assign/step/escalate controls in `/operations/inboxes`

**Expected:** Role assignments persist; RBAC gating confirmed for viewer role  
**Severity if blocked:** Sev 1 (auth gating critical)

---

### UAT-05 — Case Creation

**Role:** Doctor (User A)  
**Steps:**
1. Login as doctor
2. Navigate to `/cases` → Create New Case
3. Fill required fields: patient MRN, name, diagnosis, date of birth
4. Submit → verify case created with status `nurse_draft`
5. Verify case appears in doctor's case list
6. Verify Operations Control panel visible on case detail page
7. Verify `ensureOperationStateForCase` ran: case appears in CASE_MANAGEMENT inbox at `/operations/inboxes`

**Expected:** Case created; operation state initialized; no 500 errors  
**Severity if blocked:** Sev 1

---

### UAT-06 — Secure Link Generation

**Role:** Doctor (User A)  
**Steps:**
1. Open the case created in UAT-05
2. Navigate to Secure Links section
3. Click "Generate Link" → enter patient email `patient@test.com`
4. Verify link generated with expiry timestamp
5. Verify email received at `patient@test.com` with link
6. Copy raw URL; verify it cannot be reverse-engineered to expose case data
7. Open link in incognito browser (no auth required)
8. Verify case summary displays (name masked, clinical summary shown)
9. Verify raw token is NOT present in any database field (only `token_hash`)

**Expected:** Link generated; email received; public page renders; DB stores only hash  
**Severity if blocked:** Sev 1

---

### UAT-07 — Patient OTP / Sign Flow

**Role:** Patient (via secure link) + Nurse (User B) for in-person OTP  
**Steps:**
1. Patient opens secure link from UAT-06
2. Select "I refuse discharge" option
3. Type full name in name field
4. Check "I acknowledge the risks" checkbox
5. Click Submit Refusal
6. Verify decision captured: decision_type=refuse, timestamp, IP address, user_agent stored
7. **OTP Flow (in-person signing):** Nurse opens case → Acknowledgment → select SMS OTP method
8. Enter patient phone number → click Send OTP
9. Patient receives SMS (verify real delivery in production, or check stub debug code in staging)
10. Enter OTP code → verify accepted
11. Signature captured; verify `signature_hash` stored (SHA-256)
12. Verify audit entry: category=signature, action=verified, outcome=SUCCESS

**Expected:** Decision captured; OTP delivered and verified; signature hash recorded; no PII in audit log  
**Severity if blocked:** Sev 1 (core clinical workflow)

---

### UAT-08 — Escalation

**Role:** Doctor → Legal Admin (User D)  
**Steps:**
1. Open case from UAT-05
2. In Operations Control panel: click Escalate
3. Select escalation reason: "Patient refused and SLA breached"
4. Submit escalation
5. Verify case stage transitions to `legal_escalation`
6. Verify Legal Admin (User D) receives in-app notification
7. Login as Legal Admin → navigate to `/operations/inboxes?department=LEGAL`
8. Verify case appears in LEGAL department inbox with SLA status = BREACHED (or AT_RISK)
9. Verify breach trend chart on inbox page updates within next analytics refresh

**Expected:** Escalation transitions case; notification delivered; LEGAL inbox shows case; charts reflect escalation  
**Severity if blocked:** Sev 2

---

### UAT-09 — Audit Verification

**Role:** Tenant Admin / Compliance Officer  
**Steps:**
1. Login as tenant admin
2. Navigate to `/audit-log`
3. Filter by resource_id = case ID from UAT-05
4. Verify the following entries exist (in order):
   - `discharge_case / created / SUCCESS`
   - `secure_link / generated / SUCCESS`
   - `secure_link / accessed / SUCCESS`
   - `secure_link / decision_submitted / SUCCESS` (decision_type=refuse)
   - `signature / initiated / SUCCESS`
   - `signature / verified / SUCCESS`
   - `discharge_case / escalated / SUCCESS`
5. Verify NO PII in `details` field (no email, no name, only opaque IDs)
6. Verify audit chain integrity (hash chain unbroken — entries in sequential hash order)

**Expected:** All 7+ events present; no PII; hash chain valid  
**Severity if blocked:** Sev 1 (PDPL/HIPAA compliance)

---

### UAT-10 — Session Security Validation

**Role:** Any authenticated user  
**Steps:**
1. Login and verify JWT cookie properties in browser DevTools:
   - Name: `wathiqcare_access_token`
   - `HttpOnly: true` (not accessible via `document.cookie`)
   - `Secure: true` (HTTPS only)
   - `SameSite: Lax`
2. Copy JWT value, decode payload (jwt.io), verify `exp` ≈ 30 minutes from now
3. Logout → verify cookie deleted
4. Attempt to re-use old JWT in Authorization header → expect 401
5. Attempt login with wrong password 6 times → expect 429 Too Many Requests after 5th

**Expected:** All cookie flags correct; expiry correct; replay blocked; rate limit active  
**Severity if blocked:** Sev 1

---

## 5. Go / No-Go Recommendation

### Automated Build Status
| Check | Result |
|-------|--------|
| TypeScript compilation (`tsc --noEmit`) | ✅ 0 errors |
| Production build (`npm run build`) | ✅ 57 static pages + all dynamic routes |
| Latest commit | ✅ `391a4ca` — clean build fix |

### Current Go/No-Go: **CONDITIONAL GO**

**Rationale:**

The codebase is architecturally complete and build-clean. Core security patterns are sound (JWT with secret validation, bcrypt passwords, httpOnly cookies, token hashing, RBAC gating, rate limiting). All primary workflows — case creation, secure link, OTP signature, escalation, audit — are implemented with proper server-side enforcement.

**Conditions that must be met before full production go-live:**

| Priority | Blocker |
|----------|---------|
| **P0 — Must fix before deploy** | Set `JWT_SECRET_KEY` identical on both Vercel + Railway (S-01, S-02) |
| **P0 — Must fix before deploy** | Set `PUBLIC_LINK_TOKEN_PEPPER` to a strong secret (S-05) |
| **P0 — Must fix before deploy** | Confirm `NODE_ENV=production` on Vercel → `secure: true` cookie (S-03) |
| **P0 — Must fix before deploy** | Apply Prisma migrations to production DB (B-01) |
| **P0 — Must fix before deploy** | Run `npx prisma db seed` for subscription plans on production DB (B-02) |
| **P1 — Required for clinical use** | SMS provider configured with real credentials, sender ID registered (E-09) |
| **P1 — Required for clinical use** | Microsoft Graph email configured (E-08) |
| **P1 — Required for clinical use** | `WATHIQ_SMS_STUB_MODE` is unset or false in production |
| **P1 — Before tenant onboarding** | Platform superadmin password set and stored in vault (B-03, E-12) |
| **P2 — Before billing goes live** | Payment provider (`STRIPE_SECRET_KEY` or `HYPERPAY`) + webhook configured (B-05, B-06) |
| **P2 — Recommended** | Sentry DSN configured for error monitoring (E-16) |

**Known risks to document before launch:**
1. **CSP `unsafe-inline`:** Present in Next.js config; standard for Next.js but noted. Migrate to nonce-based CSP in a follow-up sprint.
2. **Test coverage gap on billing/subscription routes:** No automated tests for `/api/billing/**`. Cover with UAT-03 manually.
3. **Backend pytest not in CI pipeline:** Tests run manually. Add `pytest` step to `.github/workflows/main_wathiqcare-api.yml` as follow-up.
4. **Frontend test coverage:** Only 1 Jest test file exists (`workflowTreeState.test.ts`). Adequate coverage depends on UAT; add unit tests in next sprint.

**Recommended deployment sequence:**
1. Set all P0 env vars on both platforms simultaneously
2. Apply DB migrations + seed
3. Deploy backend (Railway) → confirm `/health` returns 200
4. Deploy frontend (Vercel) → confirm root `/` serves landing page
5. Execute UAT script against production (Sections UAT-01 through UAT-10)
6. Set P1 env vars (SMS, email) and verify UAT-06 + UAT-07
7. Declare GO after 0 Sev-1 issues in UAT results
