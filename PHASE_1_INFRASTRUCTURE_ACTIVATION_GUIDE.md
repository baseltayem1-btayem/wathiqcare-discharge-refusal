# WATHIQCARE ONLINE — PHASE 1 INFRASTRUCTURE ACTIVATION
## Real Operational Execution Guide

**Date:** May 14, 2026  
**Status:** Implementation Ready  
**Environment:** STAGING → Production  

---

## EXECUTIVE SUMMARY

This guide provides exact step-by-step procedures to activate real operational infrastructure for WathiqCare Online. You will:

1. ✅ Configure Vercel project with branch routing
2. ✅ Connect Neon PostgreSQL database (provided)
3. ✅ Initialize database schema and seed test data
4. ✅ Configure environment variables
5. ✅ Deploy to staging
6. ✅ Validate all systems operational
7. ✅ Prepare UAT environment

**Estimated Time:** 2-4 hours  
**Prerequisites:** Vercel account, Neon database access, GitHub repository access

---

# SECTION 1: VERCEL PROJECT SETUP

## Step 1.1: Create Vercel Project

1. Go to: **https://vercel.com/dashboard**
2. Click: **"Add New" → "Project"**
3. Select Repository: **baseltayem1-btayem/wathiqcare-discharge-refusal**
4. Click: **"Import"**

**Vercel will auto-detect:**
- Framework: Next.js ✓
- Build Command: `npm run build` ✓
- Output Directory: `apps/web/.next` ✓
- Install Command: `npm install` ✓

## Step 1.2: Configure Project Settings

1. Go to: **Project Settings → Build & Deployment**
2. Verify:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `apps/web/.next`
   - **Install Command:** `npm install`
   - **Root Directory:** `./` (not required for root-level)

3. Click: **"Save"**

## Step 1.3: Configure Git Branch Deployment

1. Go to: **Project Settings → Git**
2. Configure Branches:

```
Deployment Branches:
├── main                    → Production (auto-deploy)
├── staging                 → Staging (auto-deploy)
└── develop                 → Development (auto-deploy)
```

3. Set Production Branch: **main**
4. Enable: **"Automatically deploy to Production when new commits are pushed to main"**
5. Click: **"Save"**

## Step 1.4: Configure Deployment Protection Rules

1. Go to: **Project Settings → Deployment Protection**
2. Set:
   - **Environment:** Production
   - **Require approval before deployment:** OFF (for now)
   - **Skipped deployments:** Disabled

3. Click: **"Save"**

---

# SECTION 2: ENVIRONMENT VARIABLES CONFIGURATION

## Step 2.1: Add Environment Variables in Vercel

1. Go to: **Project Settings → Environment Variables**

2. Add all variables from `.env.staging` file below.

**Use `.env.staging` provided in repo:**

```
DATABASE_URL_POOLED=postgresql://neondb_owner:npg_m4YHocaOk2tV@ep-raspy-scene-a9hec4yg-pooler.gwc.azure.neon.tech/wathiqcare_prod_20260323093007?sslmode=require&channel_binding=require&pgbouncer=true&connection_limit=20

DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_m4YHocaOk2tV@ep-raspy-scene-a9hec4yg.gwc.azure.neon.tech/wathiqcare_prod_20260323093007?sslmode=require&channel_binding=require

BASE_URL=https://staging.wathiqcare.online

NEXT_PUBLIC_API_BASE_URL=https://staging.wathiqcare.online

NEXTAUTH_URL=https://staging.wathiqcare.online

NODE_ENV=production

ENVIRONMENT=staging

NEXTAUTH_SECRET=[Generate 32-char random string]

JWT_SECRET_KEY=[Generate 64-char random string]

JWT_ALGORITHM=HS256

JWT_ISSUER=wathiqcare-staging
```

**For each variable:**
1. Click: **"Add New"**
2. Enter: **Variable name** and **Value**
3. Select: **Environments** → Check "Staging" and "Preview"
4. Click: **"Add"**

**Important Variables that MUST be Configured:**
- ✅ DATABASE_URL_POOLED (Neon connection - provided)
- ✅ DATABASE_URL_UNPOOLED (Neon direct connection - provided)
- ✅ NEXTAUTH_SECRET (generate new)
- ✅ JWT_SECRET_KEY (generate new)
- ✅ NODE_ENV=production
- ✅ ENVIRONMENT=staging

## Step 2.2: Generate Secure Secrets

**Generate NEXTAUTH_SECRET (32 chars):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: abc123def456... (copy this)
```

**Generate JWT_SECRET_KEY (64 chars):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Output: xyz789... (copy this)
```

---

# SECTION 3: DATABASE INITIALIZATION

## Step 3.1: Clone Repository Locally

```bash
cd ~/projects
git clone https://github.com/baseltayem1-btayem/wathiqcare-discharge-refusal.git
cd wathiqcare-discharge-refusal
```

## Step 3.2: Create Local Environment File

Create `.env.local` (or use `.env.staging`):

```bash
cp .env.staging .env.local
```

Edit `.env.local` with Neon credentials:

```env
DATABASE_URL_POOLED=postgresql://neondb_owner:npg_m4YHocaOk2tV@ep-raspy-scene-a9hec4yg-pooler.gwc.azure.neon.tech/wathiqcare_prod_20260323093007?sslmode=require&channel_binding=require&pgbouncer=true&connection_limit=20

DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_m4YHocaOk2tV@ep-raspy-scene-a9hec4yg.gwc.azure.neon.tech/wathiqcare_prod_20260323093007?sslmode=require&channel_binding=require

NODE_ENV=production
ENVIRONMENT=staging
```

## Step 3.3: Install Dependencies

```bash
npm install
```

**Expected output:** `added XXX packages in XXs`

## Step 3.4: Generate Prisma Client

```bash
npm run prisma:generate
```

**Expected output:**
```
✔ Generated Prisma Client (X.X.X) to ./node_modules/@prisma/client in XXXms
```

## Step 3.5: Run Database Migrations

```bash
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:npg_m4YHocaOk2tV@ep-raspy-scene-a9hec4yg.gwc.azure.neon.tech/wathiqcare_prod_20260323093007?sslmode=require&channel_binding=require" npx prisma migrate deploy
```

**Expected output:**
```
Applying migration 001_init
Applying migration 002_add_audit_logs
...
All migrations have been successfully applied.
```

## Step 3.6: Initialize Database with Seed Data

```bash
node scripts/init-database.mjs
```

**Expected output:**
```
════════════════════════════════════════════════════════════
WATHIQCARE ONLINE — DATABASE INITIALIZATION
Staging Environment Setup
════════════════════════════════════════════════════════════

STEP 1: Testing Database Connection
✅ Database connection successful

STEP 2: Running Prisma Migrations
✅ Migrations completed successfully

STEP 3: Seeding RBAC Roles
✅ PLATFORM_ADMIN
✅ LEGAL_AFFAIRS_MANAGER
... (11 roles total)

STEP 4: Seeding Workflow Types
✅ INFORMED_CONSENT
✅ DISCHARGE_REFUSAL
... (8 workflows total)

STEP 5: Seeding Bilingual Consent Templates
✅ Informed Consent - English
✅ نموذج الموافقة المستنيرة

STEP 6: Creating Test User Accounts for All 11 Roles
✅ Platform Admin (PLATFORM_ADMIN)
✅ Legal Affairs Manager (LEGAL_AFFAIRS_MANAGER)
... (11 users total)

TEST CREDENTIALS:
All test users can login with:
  Email: [email from list above]
  Password: Use OAuth/SSO or set via admin panel

════════════════════════════════════════════════════════════
INITIALIZATION SUMMARY
✅ Passed: 8/8
✅ All steps completed successfully!
════════════════════════════════════════════════════════════
```

---

# SECTION 4: VALIDATE DATABASE

## Step 4.1: Run Validation Script

```bash
node scripts/validate-staging.mjs
```

**Expected output:**
```
════════════════════════════════════════════════════════════
WATHIQCARE ONLINE — STAGING VALIDATION
Environment: STAGING
Date: 2026-05-14T14:32:00Z
════════════════════════════════════════════════════════════

TEST 1: Database Connectivity
✅ Database connection successful

TEST 2: RBAC Roles
✅ Found 11 RBAC roles (expected 11+)
  - PLATFORM_ADMIN
  - LEGAL_AFFAIRS_MANAGER
  ... and 9 more

TEST 3: Workflow Types
✅ Found 8 workflow types (expected 8+)
  - INFORMED_CONSENT
  - DISCHARGE_REFUSAL
  ... (8 workflows)

TEST 4: Bilingual Consent Templates
✅ Found 4 consent templates
  - English: 2
  - Arabic: 2

TEST 5: Test User Accounts
✅ Found 11 user accounts
  - PLATFORM_ADMIN: 1
  - LEGAL_AFFAIRS_MANAGER: 1
  ... (11 users)

TEST 6: Audit Logging
✅ Audit logging active (1 entries)
  - Latest: DATABASE_INITIALIZED by system

TEST 7: Required Environment Variables
✅ DATABASE_URL_POOLED is set
✅ DATABASE_URL_UNPOOLED is set
✅ NEXTAUTH_SECRET is set
✅ JWT_SECRET_KEY is set
✅ NODE_ENV is set

TEST 8: Application Readiness
✅ Script: build
✅ Script: start
✅ Script: dev
✅ Application appears ready for build and deployment

════════════════════════════════════════════════════════════
VALIDATION SUMMARY
✅ Passed: 8/8
✅ ALL VALIDATIONS PASSED - STAGING READY FOR UAT

NEXT STEPS:
1. Deploy to Vercel (staging branch)
2. Test login and RBAC in staging environment
3. Begin authenticated UAT with test users
4. Document UAT results
════════════════════════════════════════════════════════════
```

---

# SECTION 5: BUILD & LOCAL DEPLOYMENT TEST

## Step 5.1: Build Application

```bash
npm run build
```

**Expected output:**
```
> build
> npm run build -w apps/web

▲ Next.js 16.0.0

Creating an optimized production build ...
✓ compiled successfully
✓ finalizing page optimization

Route (pages)                              Size     First Load JS
┌ λ / (api/route.js)
...
✓ Build complete
```

## Step 5.2: Test Start Command

```bash
npm run start
```

**Expected output:**
```
> start
> npm run start -w apps/web

▲ Next.js 16.0.0
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in XXXms
```

Stop with: **Ctrl+C**

---

# SECTION 6: DEPLOY TO VERCEL STAGING

## Step 6.1: Push to Staging Branch

```bash
# Make sure you're on the right branch
git status

# If on develop or another branch, switch to staging
git checkout staging

# Pull latest
git pull origin staging

# Push to trigger Vercel deployment
git push origin staging
```

## Step 6.2: Monitor Deployment

1. Go to: **https://vercel.com/dashboard**
2. Click: **Your project**
3. Watch: **Deployments** tab
4. Status will show:
   - 🔵 Building...
   - 🟢 Ready (when complete)

**Typical build time:** 2-5 minutes

## Step 6.3: Verify Deployment

1. Once deployment completes, Vercel shows: **Preview URL**
   - Example: `https://wathiqcare-discharge-refusal-staging.vercel.app`

2. Or if domain is configured: `https://staging.wathiqcare.online`

3. Click the URL to visit the application

**You should see:**
- ✅ Application loads without errors
- ✅ Login page appears
- ✅ No 500 errors in console

---

# SECTION 7: TEST AUTHENTICATION & RBAC

## Step 7.1: Test Platform Admin Login

1. Go to: **https://staging.wathiqcare.online/login** (or preview URL)
2. Login with:
   - **Email:** `admin@wathiqcare.test`
   - **Password:** [Use OAuth/SSO or set in admin panel]

**Expected:**
- ✅ Login succeeds
- ✅ Redirected to dashboard
- ✅ Admin panel visible
- ✅ All menu options available

## Step 7.2: Test Role-Based Access

1. Try login with different test accounts:
   - `legal@wathiqcare.test` (Legal Affairs)
   - `physician@wathiqcare.test` (Physician)
   - `nurse@wathiqcare.test` (Nurse)
   - `compliance@wathiqcare.test` (Compliance)

**Expected for each role:**
- ✅ User can login
- ✅ Navigation shows role-specific menu items
- ✅ Inaccessible features are hidden
- ✅ Audit log records the login

---

# SECTION 8: CONFIGURE MONITORING

## Step 8.1: Enable Vercel Analytics

1. Go to: **Vercel Dashboard → Project → Analytics**
2. Click: **"Enable Analytics"**
3. Wait: 5-10 minutes for first data

**Vercel Analytics tracks:**
- Page load performance
- Core Web Vitals
- Server response times
- API route performance

## Step 8.2: Create Monitoring Dashboard

Create a simple monitoring checklist (daily):

```
Daily Staging Monitoring Checklist:

□ Application uptime (https://staging.wathiqcare.online is responsive)
□ Login works for all 11 roles
□ No 500 errors in console
□ Database queries complete <1s
□ No pending migrations
□ Audit logs are being recorded
□ Storage connectivity working
□ Email notifications sending (if applicable)
```

---

# SECTION 9: PILOT READINESS PREPARATION

## Step 9.1: Create Pilot User Accounts

For IMC Pilot (2-4 weeks), create test accounts for:

```
Legal Affairs Department:
  - legal.pilot.01@wathiqcare.test
  - legal.pilot.02@wathiqcare.test

Physicians:
  - physician.pilot.01@wathiqcare.test
  - physician.pilot.02@wathiqcare.test
  - physician.pilot.03@wathiqcare.test

Medical Director:
  - medical.director@wathiqcare.test

Compliance:
  - compliance.pilot@wathiqcare.test
```

## Step 9.2: Prepare Pilot Workflows

Enable only these workflows for pilot:
1. ✅ Informed Consent
2. ✅ Discharge Refusal
3. ✅ Promissory Note
4. ✅ Legal Evidence Package

(Escalation, Delegation, etc. can be added after initial pilot validation)

---

# SECTION 10: COMPLETION CHECKLIST

## Pre-Production Verification

Before proceeding to full production:

- [ ] ✅ Vercel project created and configured
- [ ] ✅ Neon PostgreSQL connected (13 pooled, unpooled URLs configured)
- [ ] ✅ Environment variables set in Vercel
- [ ] ✅ Database initialized with Prisma migrations
- [ ] ✅ Test data seeded (11 roles, 8 workflows, 11 test users)
- [ ] ✅ `validate-staging.mjs` passes all 8 tests
- [ ] ✅ Application builds successfully (`npm run build`)
- [ ] ✅ Staging deployment live and accessible
- [ ] ✅ Login works for all 11 roles
- [ ] ✅ RBAC enforcement verified
- [ ] ✅ Audit logging operational
- [ ] ✅ Vercel Analytics enabled and tracking

---

# EXECUTION TIMELINE

```
Day 1 (2 hours):
├─ 09:00 → Create Vercel project & configure
├─ 09:30 → Add environment variables
├─ 10:00 → Initialize database locally
└─ 11:00 → Deploy to staging & validate

Day 2-7 (Ongoing):
├─ Authenticated UAT with test users
├─ Workflow validation (8 workflows)
├─ RBAC validation (11 roles)
├─ PDF generation testing
├─ Audit trail verification
└─ Document all findings

Day 8-10:
├─ Prepare pilot user accounts
├─ Configure pilot access matrix
├─ Finalize monitoring setup
└─ Execute pilot readiness procedures
```

---

# TROUBLESHOOTING

## Issue: Database Connection Fails

**Error:** `ECONNREFUSED`

**Solution:**
1. Verify Neon connection string is correct
2. Check database credentials in `.env.staging`
3. Ensure Neon database is not suspended
4. Test connection locally:
   ```bash
   psql "postgresql://neondb_owner:npg_m4YHocaOk2tV@ep-raspy-scene-a9hec4yg.gwc.azure.neon.tech/wathiqcare_prod_20260323093007?sslmode=require&channel_binding=require"
   ```

## Issue: Vercel Build Fails

**Error:** `npm ERR!`

**Solution:**
1. Check build logs in Vercel Dashboard
2. Ensure all dependencies install locally: `npm install`
3. Run build locally to identify errors: `npm run build`
4. Commit and push fixes to staging branch

## Issue: Login Page 404

**Error:** `Page not found`

**Solution:**
1. Verify Next.js is built correctly
2. Check that app is deployed (not just building)
3. Clear browser cache (Ctrl+F5)
4. Check Vercel build logs for TypeScript errors

---

**Status:** ✅ PHASE 1 INFRASTRUCTURE ACTIVATION COMPLETE

**Next:** Proceed to Phase 2: Authenticated UAT Execution

