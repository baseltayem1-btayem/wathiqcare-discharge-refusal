# WathiqCare UAT Pilot Physician Setup — Complete

**Status:** ✅ Complete & Ready for Testing  
**Date:** May 14, 2026  
**Build Status:** ✅ Success (exit 0)

---

## 📋 Summary

A simplified pilot physician setup has been created for WathiqCare Online UAT testing. The system includes:

- ✅ **1 pilot physician account** created
- ✅ **25 UAT patient cases** linked to physician
- ✅ **Summary report** generated
- ✅ **Build verification** passed
- ✅ **Cleanup script** provided

---

## 👨‍⚕️ Pilot Physician Details

| Field | Value |
|-------|-------|
| **Email** | `dr.ahmed@wathiqcare.med.sa` |
| **English Name** | Dr. Ahmed Al-Salmi |
| **Arabic Name** | د. أحمد السالمي |
| **User ID** | `23c54c07-295c-4822-9077-829391ab4b34` |
| **Role** | PHYSICIAN |
| **Specialty** | Internal Medicine / Emergency Medicine |
| **Status** | Active |
| **Environment** | UAT/Staging (Neon DB) |
| **Data Classification** | TESTING_ONLY |

---

## 🔗 Linked Cases

All 25 synthetic UAT patient cases are linked to the pilot physician:

### Case Distribution (25 Total)

| Type | Count | MRN Range | Status |
|------|-------|-----------|--------|
| Discharge Refusal | 15 | IMC-2026-02000 to IMC-2026-02014 | Mixed |
| General | 10 | IMC-2026-02015 to IMC-2026-02024 | Mixed |

### Sample Linked Cases

```
1. Najib الفلاح | MRN: IMC-2026-02000 | Case: CASE-2026-0001
2. Najib الجمعة | MRN: IMC-2026-02001 | Case: CASE-2026-0002
3. Noor الجمعة | MRN: IMC-2026-02002 | Case: CASE-2026-0003
...
25. Hana المطيري | MRN: IMC-2026-02024 | Case: CASE-2026-0025
```

**Full list available in:** `artifacts/pilot-physician-seeding-summary.json`

---

## 📁 Files Created

### Scripts

| File | Purpose |
|------|---------|
| `scripts/create-pilot-physician.mjs` | Creates physician and links cases |
| `scripts/cleanup-pilot-physician.mjs` | Removes physician and unlinks cases |

### Reports

| File | Content |
|------|---------|
| `artifacts/pilot-physician-seeding-summary.json` | Complete setup summary with all MRNs |

### Documentation

This file: Comprehensive setup guide and reference

---

## 🚀 Quick Start

### Run Once (Already Done)

```bash
# This has already been executed:
node scripts/create-pilot-physician.mjs

# Result: ✅ 25 cases linked to pilot physician
```

### Verify Setup

```bash
# Check database (SQL)
SELECT * FROM users WHERE email = 'dr.ahmed@wathiqcare.med.sa';

# View linked cases
SELECT patient_name, medical_record_no, createdByUserId 
FROM cases 
WHERE createdByUserId = '23c54c07-295c-4822-9077-829391ab4b34' 
  AND metadata->>'uatTestData' = 'true';
```

### Cleanup (When Done)

```bash
# Preview what will be deleted
node scripts/cleanup-pilot-physician.mjs

# Confirm deletion
node scripts/cleanup-pilot-physician.mjs --confirm
```

---

## ✅ Build Verification

**Build Command:** `npm run build`  
**Build Output:** Success  
**Exit Code:** 0  
**Build Time:** ~51 seconds  
**Routes Generated:** 121  

### Build Output Summary

```
✓ Compiled successfully in 51s
✓ Finished TypeScript in 68s
✓ Collecting page data using 7 workers in 27.6s
✓ Generating static pages (121/121) in 928ms
✓ Finalizing page optimization
```

✅ **Build Status: READY FOR DEPLOYMENT**

---

## 📊 Physician Metadata

All physician metadata includes:

```json
{
  "uatTestData": true,
  "dataClassification": "TESTING_ONLY",
  "environment": "UAT",
  "source": "create-pilot-physician",
  "canSignConsents": true,
  "canApproveWorkflow": true,
  "canAppearInPdf": true
}
```

---

## 🔒 Environment Protection

The setup includes multiple safeguards:

✅ **Production Detection**
- Detects `NODE_ENV=production`
- Rejects pure production databases
- Allows staging/UAT databases (Neon)

✅ **Idempotency**
- Script is idempotent (safe to run multiple times)
- Won't create duplicate physician
- Updates existing physician if already created

✅ **Data Isolation**
- All data marked with `uatTestData: true`
- Can be safely cleaned up
- Separate from production data

✅ **Environment Variables**
- Loads from `.env.local` if not in environment
- Validates DATABASE_URL before proceeding
- No credentials exposed in logs

---

## 🧩 Integration Points

### Physician Appears In

✅ Informed Consent preview  
✅ Discharge Refusal workflow  
✅ PDF output  
✅ Secure Signing flow  
✅ Audit trail  
✅ Case metadata  
✅ User dashboards  

### Case Metadata Updates

Each linked case includes:

```json
{
  "assignedPhysicianId": "23c54c07-295c-4822-9077-829391ab4b34",
  "assignedPhysicianEmail": "dr.ahmed@wathiqcare.med.sa",
  "assignedPhysicianNameEn": "Dr. Ahmed Al-Salmi",
  "assignedPhysicianNameAr": "د. أحمد السالمي",
  "physicianSpecialty": "Internal Medicine / Emergency Medicine",
  "physicianAssignedAt": "2026-05-14T02:20:32.064Z"
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Discharge Refusal Workflow

1. Login as pilot physician
2. Navigate to case: `IMC-2026-02000` (Najib الفلاح)
3. Create discharge refusal form
4. Verify physician appears in document
5. Test workflow approvals
6. Generate signed PDF with physician signature

### Scenario 2: Informed Consent

1. Select case: `IMC-2026-02005` (Ali الدوسري)
2. Create informed consent document
3. Verify physician listed as care provider
4. Add procedure and risks
5. Test digital signature with physician

### Scenario 3: Audit Trail

1. View case audit log
2. Verify physician appears as case creator
3. Check all modifications show physician assignment
4. Verify timestamps are correct

### Scenario 4: Case Management

1. View case list
2. Filter by physician assignment
3. Should show all 25 cases
4. Verify metadata matches

---

## 📊 Summary Report Reference

**File:** `artifacts/pilot-physician-seeding-summary.json`

Contains:
- Physician account details
- Tenant information
- Complete list of all 25 linked cases
- MRNs and case numbers
- Case types and statuses
- Setup metadata
- Timestamp

---

## 🔄 Idempotency & Safety

**Script is idempotent** — safe to run multiple times:

```bash
# First run: Creates physician and links cases
node scripts/create-pilot-physician.mjs
# Result: ✅ 25 cases linked

# Second run: Updates physician, re-links cases
node scripts/create-pilot-physician.mjs
# Result: ✅ Physician updated, 25 cases re-linked

# No duplicates created
# No data lost
# Safe to retry
```

---

## 🛠️ Troubleshooting

### "DATABASE_URL appears to be production database"

**Solution:** This is a safety check. Only Neon staging databases are allowed.

```bash
# Verify you're using staging database
echo $DATABASE_URL
# Should contain: neon.tech or neondb
```

### "Pilot physician not found" (Cleanup)

**Meaning:** Physician has already been deleted or was never created.

```bash
# This is normal — no action needed
```

### Cases not linked

**Solution:** Verify test cases exist:

```sql
-- Check for UAT test cases
SELECT COUNT(*) FROM cases 
WHERE metadata->>'uatTestData' = 'true';
-- Should return: 25
```

### Physician not visible in UI

**Solution:** 
1. Refresh browser (clear cache)
2. Check physician email: `dr.ahmed@wathiqcare.med.sa`
3. Verify user has PHYSICIAN role

---

## 📝 Database Queries

### Verify Physician Created

```sql
SELECT id, email, full_name, role, status 
FROM users 
WHERE email = 'dr.ahmed@wathiqcare.med.sa';
```

### Count Linked Cases

```sql
SELECT COUNT(*) as total_linked_cases
FROM cases 
WHERE createdByUserId = '23c54c07-295c-4822-9077-829391ab4b34';
```

### View All Linked Cases

```sql
SELECT 
  case_number,
  patient_name,
  medical_record_no,
  case_type,
  status,
  metadata->>'assignedPhysicianEmail' as physician_email,
  metadata->>'physicianAssignedAt' as assigned_at
FROM cases 
WHERE createdByUserId = '23c54c07-295c-4822-9077-829391ab4b34'
  AND metadata->>'uatTestData' = 'true'
ORDER BY created_at ASC;
```

### Check Physician Metadata

```sql
SELECT 
  id,
  email,
  full_name,
  status,
  created_at,
  updated_at
FROM users 
WHERE email = 'dr.ahmed@wathiqcare.med.sa';
```

---

## ✨ Features Enabled

The pilot physician account includes all required capabilities:

✅ **Can create informed consent documents**  
✅ **Can appear in PDF outputs**  
✅ **Can sign discharge refusal forms**  
✅ **Can approve workflow steps**  
✅ **Can be assigned to cases**  
✅ **Full audit trail support**  
✅ **Secure signing enabled**  
✅ **Visible in legal package workflows**  

---

## 🎯 Next Steps

### For Testing

1. ✅ **Build verified** → Proceed to testing
2. **Login** with any pilot user account
3. **Navigate** to case management
4. **Select** any case from IMC-2026-02000 to IMC-2026-02024
5. **Test** workflows (discharge refusal, consent, etc.)
6. **Verify** physician appears correctly
7. **Generate** PDFs and check signature

### For Cleanup

When testing is complete:

```bash
# Option 1: Preview
node scripts/cleanup-pilot-physician.mjs

# Option 2: Execute
node scripts/cleanup-pilot-physician.mjs --confirm

# Result: Physician deleted, all 25 cases unlinked
```

### For Deployment

1. ✅ Build passes → Ready for staging deployment
2. All test data clearly marked
3. Can be safely deployed to staging
4. **NOT** for production use

---

## 📋 Checklist

- ✅ Pilot physician created
- ✅ 25 cases linked to physician
- ✅ Summary report generated
- ✅ Build verified (exit 0)
- ✅ Cleanup script provided
- ✅ Documentation complete
- ✅ Environment protection enabled
- ✅ Idempotency verified
- ✅ Database queries documented
- ✅ Testing scenarios provided

---

## 📞 Reference Information

| Item | Value |
|------|-------|
| Physician Email | `dr.ahmed@wathiqcare.med.sa` |
| Physician ID | `23c54c07-295c-4822-9077-829391ab4b34` |
| Tenant | IMC Hospital |
| Total Cases | 25 |
| MRN Range | IMC-2026-02000 to IMC-2026-02024 |
| Environment | UAT/Staging (Neon) |
| Setup Date | May 14, 2026 |
| Build Status | ✅ Pass |

---

## 📚 Related Documentation

- Patient Seeding: `PILOT_PATIENT_SEEDING_GUIDE.md`
- Patient Data Generators: `scripts/patient-data-generators.mjs`
- Build Configuration: `apps/web/next.config.js`
- Prisma Schema: `apps/web/prisma/schema.prisma`

---

**Last Updated:** May 14, 2026  
**Status:** ✅ Production Ready for UAT  
**Build:** ✅ Verified & Passing
