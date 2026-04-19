# SAFE ROLE UAT MODE - Case Workspace Clarity Assessment

**Date**: April 18, 2026  
**Objective**: Validate operationally-clear workflow for Doctor, Legal, and read-only (Signatory) roles  
**Scope**: Frontend UI clarity only - No backend/schema changes  

---

## ROLE MAPPING IN SYSTEM

Based on UI RBAC (`ui-rbac.ts`):

| Role | Case Permissions | Case Actions | Patient Decision | Legal Package | PDF Generation | Download Final |
|------|-----------------|--------------|------------------|---------------|-----------------|-----------------|
| **doctor** | update.medical, record.risk | ✅ Record medical info | ✅ Record decision | ❌ Hidden | ✅ Draft only | ✅ Yes |
| **legal_admin** | legal.review, approve.readiness | ✅ Review/approve | ✅ View decision | ✅ Generate package | ✅ Draft + Final | ✅ Yes |
| **nursing** | update.operational, add.witness | ✅ Add witness | ❌ N/A | ❌ Hidden | ❌ N/A | ✅ Yes |
| **quality/viewer** | audit.read, reports.read | ❌ Read only | ❌ View only | ❌ Hidden | ❌ N/A | ✅ Yes |

**Note**: System has no formal "Signatory" role. Testing will use **doctor** role (elevated signer) + **viewer** role (read-only observer).

---

## TEST SCENARIO 1: DOCTOR ROLE

### What Doctor Can Do:
- ✅ Record Presentation (Proof of Notice)
- ✅ Record Patient Decision (Accepted/Refused)
- ✅ Record Signature Outcome
- ✅ Record Witness (if also nursing)
- ✅ Generate Draft PDF
- ✅ Download Final Documents (if Legal approved)

### Critical UI Elements to Validate:

#### 1.1 Workflow Guidance Card
- [ ] **Clear?** Current stage status is immediately understandable
- [ ] **Clear?** Next action is unambiguous
- [ ] **Clear?** Why each section is blocked/enabled (blockedReason text)

#### 1.2 Legal Readiness Status
- [ ] **Clear?** Patient Decision badge shows in Legal Readiness card
- [ ] **Clear?** Follow-up text matches decision state (Accepted/Refused/Not Recorded)
- [ ] **Clear?** Color coding (green=accepted, red=refused, amber=not recorded)

#### 1.3 Patient Decision Section
- [ ] **Clear?** Button label: "Record Patient Decision"
- [ ] **Clear?** Disabled message explains role requirement
- [ ] **Clear?** Difference between "Decision Status" (Accepted/Refused) vs "Signature Outcome" (Signed/Refused to Sign/Unable)
- [ ] **Confusing?** Both radio groups might be redundant

#### 1.4 PDF Generation
- [ ] **Clear?** "Generate Draft PDF" is available
- [ ] **Clear?** "Generate Authorized Final PDF" is disabled (with reason)
- [ ] **Clear?** Reason text explains Legal approval is required

### Findings for Doctor Role:
| Item | Status | Comment |
|------|--------|---------|
| Workflow guidance | | |
| Patient Decision visibility | | |
| Next action clarity | | |
| Disabled action explanations | | |

---

## TEST SCENARIO 2: LEGAL ROLE

### What Legal Can Do:
- ✅ Review case and readiness
- ✅ View Patient Decision clearly
- ✅ Generate Legal Documentation Package
- ✅ Generate Draft PDF
- ✅ Generate Authorized Final PDF
- ✅ Download Final Documents

### Critical UI Elements to Validate:

#### 2.1 Legal Readiness Card
- [ ] **Clear?** Patient Decision row is prominent and readable
- [ ] **Clear?** Badge color indicates decision (success=accepted, destructive=refused, warning=not recorded)
- [ ] **Clear?** Follow-up text is actionable:
  - Refused → "Legal follow-up required" (red)
  - Accepted → "Discharge completion path" (green)
  - Not Recorded → "Record patient decision to continue legal readiness" (amber)

#### 2.2 Legal Package Section
- [ ] **Clear?** "Generate Legal Documentation Package" button is enabled
- [ ] **Clear?** Button purpose is obvious
- [ ] **Clear?** After generation, package shows version and download link

#### 2.3 PDF Generation
- [ ] **Clear?** Both Draft and Final PDF buttons are enabled
- [ ] **Clear?** "Authorized Final PDF" implies Legal signing
- [ ] **Clear?** Language selector (English/Arabic) is functional

#### 2.4 Case Summary vs Legal Readiness Relationship
- [ ] **Clear?** How Legal Readiness relates to Case Status
- [ ] **Clear?** What "Ready for Legal" status means

### Findings for Legal Role:
| Item | Status | Comment |
|------|--------|---------|
| Patient Decision visibility | | |
| Legal Readiness clarity | | |
| Package generation UX | | |
| PDF button purposes | | |

---

## TEST SCENARIO 3: SIGNATORY/READ-ONLY ROLE

### What Viewer Role Can Do:
- 🔍 View case and all data (read-only)
- ❌ No edits/actions
- ✅ Download Final Documents (if available)

### Critical UI Elements to Validate:

#### 3.1 Disabled Actions Feedback
- [ ] **Clear?** Why each button is disabled
- [ ] **Clear?** Role requirement message is specific
- [ ] **Clear?** Is message helpful vs frustrating?

#### 3.2 Patient Decision Visibility
- [ ] **Clear?** Can read Patient Decision even in read-only mode
- [ ] **Clear?** Badge + follow-up text are still visible

#### 3.3 Legal Readiness Overview
- [ ] **Clear?** Read-only user understands what's complete vs pending
- [ ] **Clear?** Checklist items (presentation, decision, witness, package) are understandable

#### 3.4 What's Missing/Confusing?
- [ ] **Confusing?** Why some sections are hidden (Legal Package not shown?)
- [ ] **Confusing?** No clear explanation of "next steps" for read-only observer
- [ ] **Confusing?** Button disabled states without context

### Findings for Read-Only/Signatory Role:
| Item | Status | Comment |
|------|--------|---------|
| Disabled action explanations | | |
| Patient Decision visibility | | |
| Readiness overview clarity | | |
| Role understanding | | |

---

## IDENTIFIED UX PATTERNS TO CHECK

1. **Disabled Button Clarity**: Does the message explain:
   - WHO can perform this action? (e.g., "Doctor role is required")
   - WHAT must happen first? (e.g., "Select accepted or refused before recording")

2. **Patient Decision Redundancy**: 
   - "Decision Status" (Accepted/Refused) vs "Signature Outcome" (Signed/Refused to Sign/Unable)
   - Are both necessary? Or can they be combined?

3. **Legal Readiness as workflow hub**:
   - Should it prominently show Patient Decision + Follow-up instructions?
   - Is the tone/color coding immediately obvious?

4. **Role-based sections**:
   - Should read-only roles see "Legal Package" section (which they can't generate)?
   - Or should it be hidden with a message explaining why?

---

## SAFE CLARITY FIXES TO APPLY (IF NEEDED)

### Candidate 1: Add Clear Role Context to Buttons
```
Before: "Record Patient Decision"  [disabled]
        "Doctor role is required to capture patient acknowledgment."

After:  "Record Patient Decision"  [disabled]
        "⚠️ Doctor role required. Assign attending physician to proceed."
```

### Candidate 2: Separate Read-Only and Editable Views
- Show "Read-Only Mode" badge for non-doctor users
- Hide edit controls for users without permission

### Candidate 3: Improve Disabled Reason Wording
- More action-oriented
- Example: "Legal approval needed - ask Legal Reviewer to approve readiness first"

### Candidate 4: Patient Decision Section Redesign
- Combine "Decision Status" and "Signature Outcome" into single choice set
- Reduce cognitive load

---

## CONCLUSION

Based on prior work:
✅ Patient Decision visibility: ADDED to Legal Readiness card
✅ Color-coded badge system: IMPLEMENTED
✅ Follow-up text: IMPLEMENTED (Refused/Accepted/Not Recorded)

**Remaining UAT Tasks:**
1. Verify Doctor sees clear "next action" in workflow guidance
2. Verify Legal sees Patient Decision + Follow-up prominently
3. Identify confusion points for read-only observer
4. Apply safe, targeted UX tweaks if needed
