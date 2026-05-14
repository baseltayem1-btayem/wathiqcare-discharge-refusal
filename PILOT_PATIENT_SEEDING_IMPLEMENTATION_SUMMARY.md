# Pilot Patient Seeding System — Implementation Summary

**Created:** May 14, 2026  
**Status:** ✅ Complete & Ready for UAT  
**Location:** `/scripts` directory

## System Overview

A controlled pilot patient seeding system has been created for WathiqCare Online to support testing of discharge refusal, informed consent, and financial workflows.

The system generates **25 completely synthetic Saudi patients** with:
- Realistic but fake patient names (Arabic names in English)
- Properly formatted Saudi National IDs
- Demo medical record numbers (MRN) in hospital format
- Associated case files and scenarios
- Test promissory notes for financial testing

**All data is clearly marked as UAT/testing only and should NEVER be used with real patient information.**

---

## 📦 Deliverables

### Scripts

1. **`scripts/create-pilot-patients.mjs`** (450+ lines)
   - Main seeding script with full progress reporting
   - Creates 25 test patients with realistic data
   - Generates 15 discharge refusal + 10 general cases
   - Creates associated promissory notes
   - Colored output with status indicators

2. **`scripts/cleanup-pilot-patients.mjs`** (120+ lines)
   - Safe cleanup utility with confirmation
   - Removes all test data marked with `uatTestData: true`
   - Verification step ensures complete deletion
   - Requires `--confirm` flag for safety

3. **`scripts/patient-data-generators.mjs`** (350+ lines)
   - Reusable utility module for custom data generation
   - Classes:
     - `MrnGenerator` — Medical record numbers
     - `SaudiNationalIdGenerator` — Saudi National IDs
     - `PatientNameGenerator` — Patient names
     - `MedicalScenarioGenerator` — Medical data
     - `RoomNumberGenerator` — Hospital room numbers
     - `CaseNumberGenerator` — Case numbers
     - `PatientRecordGenerator` — Complete patient records

### Documentation

1. **`PILOT_PATIENT_SEEDING_GUIDE.md`** (500+ lines)
   - Comprehensive usage guide
   - Testing scenarios with step-by-step instructions
   - Database query examples
   - Troubleshooting section
   - Data privacy & compliance information
   - Integration with other pilot systems

2. **`PILOT_PATIENT_SEEDING_QUICK_REFERENCE.md`** (250+ lines)
   - Quick start guide
   - Common commands
   - Useful database queries
   - FAQ section
   - Quick troubleshooting tips

3. **This Summary** — Implementation overview

---

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure database is configured
export DATABASE_URL="postgresql://user:pass@localhost:5432/wathiqcare_dev"

# Ensure Prisma client is generated
npm run prisma:generate
```

### Create Test Patients

```bash
# Generate all 25 synthetic patients with test data
node scripts/create-pilot-patients.mjs

# Expected output:
# ✅ Creating CASE-2026-0001 — Mohammad Al-Dosari (MRN: IMC-2026-01001)
# ✅ Creating CASE-2026-0002 — Fatima Al-Hamdan (MRN: IMC-2026-01002)
# ... (total 25 patients created)
# 📊 Total patients created: 25/25
```

### Cleanup (Optional)

```bash
# Preview deletions
node scripts/cleanup-pilot-patients.mjs

# Actually delete
node scripts/cleanup-pilot-patients.mjs --confirm
```

---

## 📊 Generated Data Examples

### Patient Record

```json
{
  "caseNumber": "CASE-2026-0001",
  "patientName": "Mohammad Al-Dosari",
  "patientIdNumber": "1984053012345",
  "medicalRecordNo": "IMC-2026-01001",
  "roomNumber": "3-15",
  "caseType": "DISCHARGE_REFUSAL",
  "status": "OPEN",
  "metadata": {
    "uatTestData": true,
    "dataClassification": "TESTING_ONLY",
    "department": "Cardiology",
    "diagnosis": "Acute Coronary Syndrome",
    "admissionDate": "2026-05-04T10:30:00Z",
    "note": "This is synthetic test data. Not a real patient record."
  }
}
```

### Case Distribution

- **8 Discharge Refusal (Open)** — Test case initiation
- **7 Discharge Refusal (In Progress)** — Test approvals
- **5 General Cases (Open)** — Test case creation
- **5 General Cases (In Progress)** — Test case progression

### MRN Format

```
IMC-2026-01001
│    │    │
│    │    └─ Sequential ID (00001-02500)
│    └────── Year (2026)
└─────────── Hospital Code (IMC = Islamic Medical Center)
```

---

## 🔍 Database Queries

### View All Test Patients

```sql
SELECT 
  case_number,
  patient_name,
  medical_record_no,
  case_type,
  status
FROM cases
WHERE metadata->>'uatTestData' = 'true'
ORDER BY created_at DESC;
```

### Count by Type

```sql
SELECT case_type, status, COUNT(*) as count
FROM cases
WHERE metadata->>'uatTestData' = 'true'
GROUP BY case_type, status;
```

### View Promissory Notes

```sql
SELECT 
  note_number,
  debtor_name,
  amount,
  currency,
  due_date
FROM promissory_notes
WHERE metadata->>'uatTestData' = 'true'
ORDER BY created_at DESC;
```

---

## ✅ Data Quality Assurance

All generated data includes:

✅ **Clear Test Markers**
- `uatTestData: true` — Identifies test data
- `dataClassification: 'TESTING_ONLY'` — Data class
- Explicit test warnings in metadata
- Test tenant name includes "(UAT/Pilot)"

✅ **Realistic but Synthetic**
- Arabic names properly transliterated to English
- Saudi National IDs follow valid format (but are fake)
- Medical record numbers in hospital format
- Realistic medical scenarios and departments

✅ **Completely Safe**
- No real patient information
- No integration with external systems
- No real hospital data
- Suitable only for testing environments

---

## 🧪 Testing Scenarios

### Discharge Refusal Workflow

1. Login as pilot physician
2. Select test patient from case list
3. Initiate discharge refusal form
4. Fill patient acknowledgment (auto-populated)
5. Route for medical director review
6. Medical director approves
7. Route for legal affairs
8. Legal affairs documents refusal
9. Generate and sign PDF
10. Complete case with audit trail

### Informed Consent Testing

1. Create consent document
2. Select procedure (from test case)
3. Add risks and benefits
4. Add patient signature
5. Test digital signature workflow
6. Verify audit trail captured

### Promissory Note Testing

1. View financial section in case
2. Create promissory note
3. Set amount and due date
4. Test approval workflow
5. Generate financial report

---

## 🔌 Integration

### Works With Existing Pilot Infrastructure

- ✅ `create-pilot-users.mjs` — Creates pilot user accounts
- ✅ `staging-readiness-certification.mjs` — Staging validation
- ✅ Prisma schema — Case & PromissoryNote models
- ✅ PostgreSQL database — Proper schema support

### Can Extend

The utilities module (`patient-data-generators.mjs`) provides building blocks for:
- Custom data generation
- Batch operations
- Integration with other tools
- Advanced testing scenarios

---

## ⚠️ Important Notes

### DO ✅

- ✅ Use for UAT testing
- ✅ Use for workflow validation
- ✅ Use in development environments
- ✅ Use in isolated staging
- ✅ Extend using utilities module

### DON'T ❌

- ❌ Use real patient data
- ❌ Deploy to production
- ❌ Use in live patient systems
- ❌ Export to external systems
- ❌ Use as production test data

---

## 📝 Files Created/Modified

### New Files Created

1. `scripts/create-pilot-patients.mjs` — Main seeding script
2. `scripts/cleanup-pilot-patients.mjs` — Cleanup utility
3. `scripts/patient-data-generators.mjs` — Reusable utilities
4. `PILOT_PATIENT_SEEDING_GUIDE.md` — Complete documentation
5. `PILOT_PATIENT_SEEDING_QUICK_REFERENCE.md` — Quick reference

### Existing Files (Not Modified)

- Prisma schema — Already supports all required models
- Database — PostgreSQL with proper tables
- Pilot users system — Existing & compatible

---

## 🎯 Next Steps

### For UAT Team

1. Run the seeding script: `node scripts/create-pilot-patients.mjs`
2. Follow testing scenarios in the guide
3. Test workflows (discharge refusal, consent, etc.)
4. Report any issues or improvements

### For Developers

1. Use utilities module for custom data generation
2. Extend testing scenarios as needed
3. Integrate with CI/CD if desired
4. Add new generators as needed

### For DevOps

1. Can add to automation scripts
2. Can integrate with staging deployment
3. Consider cleanup as part of reset procedures

---

## 📞 Support Resources

- `PILOT_PATIENT_SEEDING_GUIDE.md` — Comprehensive guide
- `PILOT_PATIENT_SEEDING_QUICK_REFERENCE.md` — Quick answers
- Inline script comments — Implementation details
- `patient-data-generators.mjs` — Code documentation

---

## Version History

| Version | Date | Status |
|---------|------|--------|
| 1.0 | May 14, 2026 | ✅ Complete |

---

**Status:** Ready for UAT Testing  
**Approved for:** Development, Staging, UAT Environments  
**Not Approved for:** Production Use  
**Last Updated:** May 14, 2026
