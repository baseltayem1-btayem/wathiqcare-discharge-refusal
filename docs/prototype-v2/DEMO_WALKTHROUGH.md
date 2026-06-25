# Demo Walkthrough: Prototype V2

## Start the Prototype

```bash
npm run dev -w apps/web
```

Open the hub in your browser:

```
http://localhost:3000/prototype
```

## 1. Prototype Hub

- The hub shows three prototype cards and a deliverables checklist.
- Confirm each card is labeled **Navigable**.
- Click into each surface to validate routing.

## 2. Approved Forms V2

**URL:** `/prototype/approved-forms-v2`

**Steps:**
1. Observe the stats cards: Templates, IMC Approved, High/Critical Risk, Categories.
2. Use the search box to search for "Cardiac" or "CABG".
3. Apply filters:
   - Category: `SURGICAL`
   - Risk: `CRITICAL`
   - Status: `IMC_APPROVED`
4. Click a template row to open the detail panel.
5. Verify the detail panel shows:
   - Bilingual title
   - Template code and version
   - Risk level badge
   - Requirement chips (Witness, Guardian, Interpreter, Separate consent)
   - Bilingual summary
   - "Preview only" disclaimer

**Expected result:** Filtering narrows the list; selected template details appear in the right panel.

## 3. Procedure Mapping Engine

**URL:** `/prototype/procedure-mapping-engine`

**Steps:**
1. Observe the stats cards: Mapped Procedures, Critical Risk, Requires Anesthesia, Education Assets.
2. Filter by Category: `SURGICAL`.
3. Filter by Specialty: `CARDIOTHORACIC_SURGERY`.
4. Click the **Coronary Artery Bypass Grafting (CABG)** row.
5. In the detail drawer, verify:
   - Category, Anesthesia, Risk cards
   - Recommended forms list
   - Mandatory disclosures
   - Common alternatives
   - Refusal consequences
   - Recommended education assets

**Expected result:** The matrix updates with filters and the drawer exposes the full mapping.

## 4. Doctor Workspace V2

**URL:** `/prototype/doctor-workspace-v2`

**Steps:**
1. Observe the KPI cards and the workflow stepper:
   - Patient → Recommend → Review → Simulate Send
2. Select the encounter for **Ahmad Al-Rashid** (CABG).
3. On the **Recommend** step, verify:
   - Patient and procedure context
   - Category: Surgical
   - Risk: CRITICAL
   - Anesthesia: General
   - Recommended forms: Cardiac Surgery, Anesthesia, Blood Transfusion
   - Mandatory disclosures
4. Click **Review Consent**.
5. On the **Review** step, verify:
   - Encounter summary grid
   - Selected forms with risk badges and requirement chips
   - Attached education assets
6. Click **Proceed to Send**.
7. On the **Simulate Send** step, read the simulation disclaimer.
8. Click **Simulate Patient Send**.
9. Verify the success state and the note that no PDF/OTP/SMS was generated.

**Expected result:** The workspace walks through the smart issuance flow end-to-end without invoking production services.

## 5. Content Mapping Service

**URL:** `/prototype/content-mapping-service`

**Steps:**
1. Observe the KPI cards: Mapped Procedures, With Education + Consent, Consent Only, Service Status.
2. Use the search box or click a procedure in the list.
3. Select **Abdominal Aortic Aneurysm** (or any procedure flagged as "Both").
4. Verify the result panel shows:
   - Procedure metadata (specialty, department, category, language, version)
   - Education Material card
   - Consent Form card
   - Visual flow: Procedure → Education Material → Consent Form
5. Click **Both: Education + Consent** quick example.
6. Click **Consent Only** quick example and verify the education material card is absent and a "Consent only" badge is shown.
7. Review the **Service Contract** panel at the bottom for input/output JSON shapes.

**Expected result:** The service resolves the correct consent form and optional education material directly from the approved-forms library.

## 6. Consent Journey

**URL:** `/prototype/consent-journey`

**Steps (Education + Consent example):**
1. Click **Example: Education + Consent**.
2. Verify the stepper advances to **Education**.
3. Confirm the procedure name, specialty, language, and version are displayed.
4. Check the **Patient has reviewed the education material** checkbox and click Continue.
5. On **Consent Preview**, review the consent form metadata and check **Physician confirms the consent form is correct**.
6. Click **Mark Ready for Signature**.
7. On **Ready for Signature**, review the summary and click **Simulate Send to Patient**.
8. Verify the simulated success state.

**Steps (Consent Only example):**
1. Click **Reset**.
2. Click **Example: Consent Only**.
3. Verify the stepper skips the Education step and goes directly to **Consent Preview**.
4. Confirm the consent form and complete the journey.

**Expected result:** The journey demonstrates the full informed-consent flow driven by the Approved Forms Library without invoking production signing services.

## 7. Reset and Try Another Encounter

1. Navigate to `/prototype/doctor-workspace-v2`.
2. Click **Reset** in the top-right corner.
3. Select **Fatima Al-Zahrani** (Total Knee Arthroplasty).
4. Confirm the recommendations reflect orthopedic surgery and regional anesthesia.

## 8. Screenshots

Screenshots for each surface are saved in:

```
docs/prototype-v2/screenshots/
├── prototype-hub.png
├── approved-forms-v2.png
├── procedure-mapping-engine.png
├── doctor-workspace-v2.png
├── content-mapping-service.png
└── consent-journey.png
```

They are generated by `scripts/prototype/capture-screenshots.mjs`.

## Validation Checklist

- [ ] `/prototype` hub loads.
- [ ] Approved Forms V2 supports search and filters.
- [ ] Procedure Mapping Engine supports filters and detail drawer.
- [ ] Doctor Workspace V2 completes patient → recommend → review → simulate flow.
- [ ] Content Mapping Service resolves consent form and education material for a procedure.
- [ ] Consent Journey completes procedure → mapping → education → preview → ready for signature.
- [ ] Consent Journey demonstrates both "Education + Consent" and "Consent Only" cases.
- [ ] No errors in browser console.
- [ ] No changes to existing WathiqNote workflows, OTP/SMS/PDF, or `main`.
