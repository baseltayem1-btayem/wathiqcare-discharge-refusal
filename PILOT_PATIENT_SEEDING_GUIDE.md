# WathiqCare Online — Pilot Patient Seeding System

**Status:** UAT/Testing Only  
**Version:** 1.0  
**Created:** May 2026  
**Purpose:** Controlled synthetic patient data generation for testing WathiqCare workflows

---

## ⚠️ CRITICAL NOTICE

```
DO NOT use real patient information in this system.
DO NOT deploy this seeding data to production.
All generated data is SYNTHETIC and for TESTING ONLY.
```

This system generates **completely fake Saudi patient data** suitable for:
- Workflow testing
- User acceptance testing (UAT)
- Discharge refusal process validation
- Informed consent workflow testing
- Digital signature testing
- Case management testing

---

## Overview

### What This System Does

The pilot patient seeding system creates:

1. **25 Synthetic Saudi Patients**
   - Realistic but fake patient names (Arabic names translated to English)
   - Fake Saudi National IDs (10-digit format, Saudi ID numbering system)
   - Realistic medical record numbers (MRN) in format: `IMC-YYYY-XXXXX`

2. **Test Cases**
   - 15 discharge refusal cases (various statuses)
   - 10 general medical cases (various statuses)
   - Associated case metadata (department, diagnosis, admission date)

3. **Associated Test Data**
   - Promissory notes for financial testing
   - Case status tracking
   - Workflow metadata for testing

### Data Quality Standards

All generated data:
- ✅ Is clearly marked as `uatTestData: true` in metadata
- ✅ Includes `dataClassification: 'TESTING_ONLY'`
- ✅ Contains explicit test markers
- ✅ Follows realistic Saudi naming conventions
- ✅ Includes realistic medical scenarios
- ✅ Is suitable only for UAT/testing environments

---

## Usage

### Prerequisites

```bash
# Ensure you're in the project root
cd /path/to/wathiqcare-discharge-refusal

# Install dependencies
npm install

# Configure database connection
export DATABASE_URL="postgresql://user:pass@localhost:5432/wathiqcare_dev"

# Generate Prisma client
npm run prisma:generate
```

### Running the Seeding Script

```bash
# Simple execution (uses default/first pilot tenant)
node scripts/create-pilot-patients.mjs

# With specific tenant ID
node scripts/create-pilot-patients.mjs --tenant-id=tenant-abc123

# Dry-run mode (shows what would be created, doesn't actually create)
node scripts/create-pilot-patients.mjs --dry-run
```

### Expected Output

```
╔════════════════════════════════════════════════════════════════════════╗
║                    ⚠️  UAT/TESTING DATA ONLY ⚠️                        ║
║                                                                        ║
║  This script generates SYNTHETIC patient data for testing purposes.    ║
║  DO NOT use real patient information.                                 ║
║  DO NOT deploy to production with this data.                          ║
╚════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════
WATHIQCARE ONLINE — PILOT PATIENT SEEDING SYSTEM
═══════════════════════════════════════════════════════════════════════════

▶ Finding or creating pilot tenant
  ✅ Using existing tenant: Islamic Medical Center (UAT/Pilot)

▶ Creating Pilot Test Patients
  ▶ Discharge Refusal Cases (Open)
    ✅ [1] Mohammad Al-Dosari | MRN: IMC-2026-01001 | Case: CASE-2026-0001
    ✅ [2] Ahmed Al-Hamdan | MRN: IMC-2026-01002 | Case: CASE-2026-0002
    ...

📊 Total patients created: 25/25
```

---

## Generated Patient Data

### Patient Naming Format

All patients have realistic but **completely synthetic** names:
- **First Names:** Arabic names (Mohammad, Ahmed, Fatima, Layla, etc.)
- **Last Names:** Saudi family names (Al-Dosari, Al-Hamdan, Al-Rashid, etc.)
- **Full Names:** Translated to English format (e.g., "Mohammad Al-Dosari")

### Medical Record Number (MRN) Format

```
IMC-2026-01001
│    │    │
│    │    └─ Sequential ID (00001-02500)
│    └────── Year (2026)
└─────────── Hospital Code (IMC = Islamic Medical Center)
```

### Patient ID Number Format

Follows Saudi National ID structure:
```
1 YYMM DD SSS CC
│ ││── ││ └─ Check digits
│ ││── └───── Day of birth
│ ││───────── Month of birth
│ └────────── Year of birth (last 2 digits)
└──────────── 1 = Saudi national
```

### Case Type Distribution

| Type | Count | Status | Purpose |
|------|-------|--------|---------|
| Discharge Refusal (Open) | 8 | OPEN | Test refusal workflow initiation |
| Discharge Refusal (In Progress) | 7 | IN_PROGRESS | Test refusal workflow approvals |
| General Cases (Open) | 5 | OPEN | Test general case management |
| General Cases (In Progress) | 5 | IN_PROGRESS | Test case progression |

---

## Testing Scenarios

### Scenario 1: Discharge Refusal Workflow

1. **Patient:** Mohammad Al-Dosari (MRN: IMC-2026-01001)
2. **Case Status:** OPEN
3. **Test Steps:**
   - Login as physician
   - Navigate to case IMC-2026-01001
   - Create discharge refusal form
   - Add patient acknowledgment
   - Route for medical director review
   - Add legal review comments
   - Generate signed PDF
   - Mark case as completed

### Scenario 2: Informed Consent Testing

1. **Patient:** Fatima Al-Hamdan (MRN: IMC-2026-01005)
2. **Case Type:** GENERAL
3. **Test Steps:**
   - Create informed consent document
   - Select procedure/treatment
   - Add risk disclosures
   - Route for patient signature
   - Test digital signature workflow
   - Verify audit trail

### Scenario 3: Promissory Note Testing

1. **Case:** CASE-2026-0001
2. **Patient:** Mohammad Al-Dosari
3. **Test Steps:**
   - Create promissory note (SAR 15,000 example)
   - Set payment due date (60 days)
   - Route for signatures
   - Test financial tracking

---

## Database Queries

### View All Test Patients

```sql
SELECT 
  c.case_number,
  c.patient_name,
  c.medical_record_no,
  c.patient_id_number,
  c.case_type,
  c.status,
  c.metadata->>'department' as department,
  c.metadata->>'diagnosis' as diagnosis
FROM cases c
WHERE c.metadata->>'uatTestData' = 'true'
ORDER BY c.created_at DESC;
```

### View Discharge Refusal Cases

```sql
SELECT 
  c.case_number,
  c.patient_name,
  c.medical_record_no,
  c.status,
  c.created_at
FROM cases c
WHERE c.case_type = 'DISCHARGE_REFUSAL'
  AND c.metadata->>'uatTestData' = 'true'
ORDER BY c.created_at DESC;
```

### View Patient MRNs

```sql
SELECT 
  c.medical_record_no,
  c.patient_name,
  c.patient_id_number,
  c.room_number
FROM cases c
WHERE c.metadata->>'uatTestData' = 'true'
ORDER BY c.created_at ASC;
```

### View Promissory Notes

```sql
SELECT 
  pn.note_number,
  pn.debtor_name,
  pn.amount,
  pn.currency,
  pn.due_date,
  pn.status
FROM promissory_notes pn
WHERE pn.metadata->>'uatTestData' = 'true'
ORDER BY pn.created_at DESC;
```

---

## Cleanup & Reset

### Remove All Test Patient Data

```bash
# Via PowerShell
$tenantId = "your-tenant-id"
npx prisma db execute --stdin << EOF
DELETE FROM cases WHERE metadata->>'uatTestData' = 'true';
DELETE FROM promissory_notes WHERE metadata->>'uatTestData' = 'true';
EOF
```

### Cleanup Script (Optional)

```bash
# Create a cleanup script if needed
node scripts/cleanup-pilot-patients.mjs
```

---

## Data Privacy & Compliance

### Important Safeguards

✅ **All data is completely synthetic**
- Patient names are AI-generated combinations
- IDs do not correspond to real people
- Medical diagnoses are generic examples
- No real patient data is ever used

✅ **Clear test markers**
- `uatTestData: true` in metadata
- `dataClassification: 'TESTING_ONLY'`
- Test tenant name includes "(UAT/Pilot)"
- Explicit test data warnings

✅ **Environment isolation**
- Should only run in development/staging
- Never connects to production databases
- All generated data is non-recoverable from patients

✅ **No PI/PII Leakage**
- No real social security numbers
- No real medical histories
- No real contact information
- No integration with real hospital systems

---

## Troubleshooting

### Script Fails with "Tenant not found"

**Solution:** The script will automatically create a test tenant
```bash
# Or manually create one first
npm run prisma -- db execute --stdin << EOF
INSERT INTO tenants (id, name, slug, status)
VALUES ('tenant-test', 'Islamic Medical Center (UAT)', 'imc-uat', 'ACTIVE');
EOF
```

### MRNs Not Generating Correctly

**Check:** Validate that `prisma:generate` was run
```bash
npm run prisma:generate
node scripts/create-pilot-patients.mjs
```

### Script Timeout

**Solution:** Increase Node.js timeout or run with more memory
```bash
node --max-old-space-size=4096 scripts/create-pilot-patients.mjs
```

### Permission Denied

**Solution:** Ensure script is executable and DATABASE_URL is set
```bash
chmod +x scripts/create-pilot-patients.mjs
export DATABASE_URL="postgresql://..."
```

---

## Integration with Other Pilots

### With Platform Admin UAT

```bash
# Run platform admin setup first
npm run scripts/create-platform-admin-roles.mjs

# Then run patient seeding
npm run scripts/create-pilot-patients.mjs
```

### With Pilot Users

```bash
# Create pilot users
npm run scripts/create-pilot-users.mjs

# Create associated patients
npm run scripts/create-pilot-patients.mjs
```

---

## Maintenance & Updates

### Adding More Test Patients

Edit the `PATIENT_COUNT` variable:
```javascript
const PATIENT_COUNT = 25;  // Change to 50, 100, etc.
```

### Adding Custom Diagnoses

Add to `DIAGNOSES` array:
```javascript
const DIAGNOSES = [
  'Hypertension',
  'Your Custom Diagnosis',  // Add here
  ...
];
```

### Customizing Department Distribution

Modify `DEPARTMENTS` array:
```javascript
const DEPARTMENTS = [
  'Internal Medicine',
  'Your Custom Department',  // Add here
  ...
];
```

---

## Support & Questions

- **Issue:** Patient data looks unrealistic?
  - **Response:** This is intentional. Data is synthetic and designed to be obviously different from real records.

- **Issue:** How do I know this is test data?
  - **Response:** Look for `uatTestData: true` in database metadata; patient names are obviously synthetic combinations

- **Issue:** Can I export this to production?
  - **Response:** Never. All data includes explicit test markers and should never be deployed outside of testing environments.

---

## Appendix: Sample Patient Records

### Example 1: Discharge Refusal Patient

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

### Example 2: General Case Patient

```json
{
  "caseNumber": "CASE-2026-0020",
  "patientName": "Fatima Al-Hamdan",
  "patientIdNumber": "1992123456789",
  "medicalRecordNo": "IMC-2026-01020",
  "roomNumber": "2-08",
  "caseType": "GENERAL",
  "status": "IN_PROGRESS",
  "metadata": {
    "uatTestData": true,
    "dataClassification": "TESTING_ONLY",
    "department": "Pediatrics",
    "diagnosis": "Community-Acquired Pneumonia"
  }
}
```

---

## Related Documentation

- [Pilot Users Setup](./create-pilot-users.mjs)
- [Platform Admin Setup](./PLATFORM_ADMIN_VERIFICATION.md)
- [UAT Testing Guide](../docs/UAT_TESTING_GUIDE.md)
- [Data Classification Policy](../docs/DATA_CLASSIFICATION.md)

---

**Last Updated:** May 2026  
**Maintained By:** WathiqCare Development Team  
**Status:** Active
