# WathiqCare Patient Seeding — Quick Reference

## 📦 What's Included

### Scripts Created

1. **`create-pilot-patients.mjs`** — Main seeding script
   - Generates 25 synthetic Saudi patients
   - Creates discharge refusal and general cases
   - Associates promissory notes
   - Full progress reporting

2. **`cleanup-pilot-patients.mjs`** — Cleanup utility
   - Safely removes all test data
   - Verification after deletion
   - Confirmation flag for safety

3. **`patient-data-generators.mjs`** — Reusable utilities
   - `MrnGenerator` — Creates medical record numbers
   - `SaudiNationalIdGenerator` — Generates Saudi IDs
   - `PatientNameGenerator` — Creates realistic names
   - `MedicalScenarioGenerator` — Generates medical data
   - And more utilities for other generators

### Documentation

- **`PILOT_PATIENT_SEEDING_GUIDE.md`** — Complete guide with testing scenarios, database queries, troubleshooting

---

## 🚀 Quick Start

### 1. Setup (One-time)

```bash
# Navigate to project
cd /path/to/wathiqcare-discharge-refusal

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Set database connection
export DATABASE_URL="postgresql://user:pass@localhost:5432/wathiqcare_dev"
```

### 2. Create Test Patients

```bash
# Generate all 25 synthetic patients
node scripts/create-pilot-patients.mjs

# Expected output: 15 discharge refusal + 10 general cases
```

### 3. Run UAT Tests

```bash
# Login to staging with a pilot user
# Navigate to case management
# Filter for your test cases
# Test workflows (discharge refusal, consent, etc.)
```

### 4. Cleanup (Optional)

```bash
# Preview what will be deleted
node scripts/cleanup-pilot-patients.mjs

# Actually delete (with confirmation flag)
node scripts/cleanup-pilot-patients.mjs --confirm
```

---

## 📊 Generated Data Examples

### Patient Example

```
Name: Mohammad Al-Dosari
ID:   1984053012345
MRN:  IMC-2026-01001
Room: 3-15
Case: CASE-2026-0001
Dept: Cardiology
```

### Case Breakdown

- **8 Discharge Refusal (Open)** — Test case initiation
- **7 Discharge Refusal (In Progress)** — Test approvals
- **5 General (Open)** — Test general management
- **5 General (In Progress)** — Test case progression

---

## 🔍 Useful Database Queries

### View All Test Patients

```sql
SELECT patient_name, medical_record_no, case_type, status
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

### Find Specific MRN

```sql
SELECT * FROM cases
WHERE medical_record_no = 'IMC-2026-01001';
```

---

## ⚠️ Important Notes

### Data Classification

All generated data is marked as:
```json
{
  "uatTestData": true,
  "dataClassification": "TESTING_ONLY",
  "note": "This is synthetic test data. Not a real patient record."
}
```

### Never Use With

- ❌ Real patient data
- ❌ Production databases
- ❌ Live patient systems
- ❌ External systems integration

### Only Use With

- ✅ Development databases
- ✅ Staging environments
- ✅ UAT testing
- ✅ Workflow validation
- ✅ Isolated testing networks

---

## 🧩 Using the Utilities Module

### Generate Custom Patient Data

```javascript
import {
  MrnGenerator,
  SaudiNationalIdGenerator,
  PatientNameGenerator,
  PatientRecordGenerator,
} from './scripts/patient-data-generators.mjs';

// Generate MRNs
const mrnGen = new MrnGenerator();
console.log(mrnGen.next());      // IMC-2026-01001
console.log(mrnGen.next());      // IMC-2026-01002

// Generate IDs
const id = SaudiNationalIdGenerator.generate();
console.log(id);                 // 1984053012345

// Generate Names
const name = PatientNameGenerator.generate();
console.log(name);               // Mohammad Al-Dosari

// Generate Complete Record
const record = PatientRecordGenerator.generate(0, 'tenant-123');
console.log(record);             // { tenantId, caseNumber, ... }
```

---

## 📋 Testing Scenarios

### Discharge Refusal Workflow

```
1. Login as Physician
2. Navigate to CASE-2026-0001
3. Click "Initiate Discharge Refusal"
4. Fill form (patient name auto-populated from test data)
5. Route to Medical Director
6. Medical Director reviews
7. Route to Legal Affairs
8. Legal Affairs approves
9. Generate signed PDF
10. Complete case
```

### Informed Consent

```
1. Login as Physician
2. Select test patient (e.g., Mohammad Al-Dosari)
3. Create Informed Consent
4. Add procedure (from CASE-2026-0002)
5. Add risks
6. Send for signature
7. Patient signs
8. Verify audit trail
```

### Promissory Note

```
1. Case with promissory note created (check DB)
2. Navigate to financial section
3. View promissory note (SAR amount)
4. Review payment schedule
5. Test approval workflow
```

---

## 🐛 Troubleshooting

### Script Won't Run

```bash
# Check permissions
chmod +x scripts/create-pilot-patients.mjs

# Check dependencies
npm run prisma:generate

# Check database connection
echo $DATABASE_URL
```

### No Data Created

```bash
# Verify tenant exists
SELECT * FROM tenants WHERE name LIKE '%IMC%';

# Check for errors in script output
# Usually tells you what went wrong

# Try with more detail
node --trace-warnings scripts/create-pilot-patients.mjs
```

### Data Not Visible in UI

```bash
# Verify data in database
SELECT COUNT(*) FROM cases WHERE metadata->>'uatTestData' = 'true';

# Check Prisma cache
rm -rf node_modules/.prisma

# Regenerate Prisma
npm run prisma:generate
```

---

## 📞 Support

### Common Questions

**Q: Is this real patient data?**  
A: No. All data is completely synthetic and generated for testing only.

**Q: Can I use this in production?**  
A: Absolutely not. This is for testing only and should never be deployed to production.

**Q: How do I know this is test data?**  
A: Look for `uatTestData: true` in the database metadata. All records are clearly marked.

**Q: How do I remove this data?**  
A: Run `node scripts/cleanup-pilot-patients.mjs --confirm`

**Q: Can I modify the generated data?**  
A: Yes, use the utilities in `patient-data-generators.mjs` to create custom data.

---

## 📦 Related Scripts

- `create-pilot-users.mjs` — Creates pilot user accounts (legal, physicians, etc.)
- `init-database.mjs` — Initializes database schema
- `staging-readiness-certification.mjs` — Certifies staging environment

## 📖 Full Documentation

See `PILOT_PATIENT_SEEDING_GUIDE.md` for comprehensive guide including:
- Detailed usage instructions
- Database query examples
- Integration guides
- Data privacy & compliance
- Advanced customization

---

**Status:** Ready for UAT Testing  
**Version:** 1.0  
**Last Updated:** May 2026
