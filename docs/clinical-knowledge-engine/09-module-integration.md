# Clinical Knowledge Engine — Module Integration

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Integration Principle

Every WathiqCare module consumes clinical-legal content through a single contract: the **Clinical Knowledge Assembly**. No module queries knowledge tables directly. No module duplicates content logic.

```
┌─────────────────┐     ┌─────────────────────────────┐     ┌─────────────────┐
│ Informed Consent│     │                             │     │  Discharge      │
│    Module       │────►│   Clinical Knowledge API    │◄────│   Refusal       │
└─────────────────┘     │                             │     │   Module        │
┌─────────────────┐     │  Procedures                 │     └─────────────────┘
│   WathiqNote    │────►│  Packages                   │     ┌─────────────────┐
│   Module        │     │  Forms                      │     │  Home Healthcare│
└─────────────────┘     │  Rules                      │     │   Module        │
                        │  Assembly                   │◄────└─────────────────┘
                        └─────────────────────────────┘
```

---

## 2. Shared Contract: KnowledgeAssembly

Every module receives the same DTO:

```typescript
interface KnowledgeAssembly {
  assemblyId: string;
  tenantId: string;
  procedureId: string;
  packageId: string;
  packageVersion: string;
  consentForms: ConsentForm[];
  educationMaterials: EducationMaterial[];
  riskDisclosures: RiskDisclosure[];
  alternativeTreatments: AlternativeTreatment[];
  requiredParticipants: RequiredParticipant[];
  suggestions: Suggestion[];
  blockers: Blocker[];
  assembledAt: string;
}
```

Each module uses the subset it needs.

---

## 3. Module-Specific Consumption

### 3.1 Informed Consent Module

**Uses:**

- `consentForms` → primary legal document.
- `educationMaterials` → pre-signature patient education.
- `riskDisclosures` + `alternativeTreatments` → physician disclosure inputs.
- `requiredParticipants` → witness/interpreter/guardian checks.
- `blockers` → prevent dispatch until resolved.

**Workflow:**

```
Physician selects procedure
        ↓
POST /api/v1/knowledge/assembly
        ↓
System returns package + blockers
        ↓
Physician resolves blockers
        ↓
Patient views education + form
        ↓
Patient signs
        ↓
Consent record stores assemblyId + packageVersion + snapshot
```

**Module-Specific Extension:** None. Informed Consent is the reference consumer.

---

### 3.2 WathiqNote (Promissory Notes) Module

**Uses:**

- `consentForms` → promissory note template.
- `requiredParticipants` → guardian for minors, witness for high-value notes.
- `decision rules` → financial risk thresholds.

**Workflow:**

```
Finance selects note type (linked to a procedure-like entity)
        ↓
POST /api/v1/knowledge/assembly
        ↓
System returns note template + required signers
        ↓
Debtor signs
        ↓
Note record stores assemblyId + packageVersion + snapshot
```

**Module-Specific Extension:**

- New `ConsentFormType = PROMISSORY_NOTE`.
- New decision rule: `HIGH_VALUE_NOTE_REQUIRES_WITNESS`.

---

### 3.3 Discharge Refusal Module

**Uses:**

- `consentForms` → discharge refusal acknowledgment form.
- `riskDisclosures` → risks of leaving against medical advice.
- `alternativeTreatments` → alternatives offered to patient.
- `requiredParticipants` → witness, interpreter.
- `decision rules` → escalation timers based on capacity and risk.

**Workflow:**

```
Physician records discharge decision
        ↓
Patient refuses
        ↓
POST /api/v1/knowledge/assembly (procedure = discharge_refusal)
        ↓
System returns refusal form + risks + required participants
        ↓
Patient signs refusal acknowledgment
        ↓
Case escalates per rules
```

**Module-Specific Extension:**

- New `ClinicalProcedure` category: `DISCHARGE_REFUSAL`.
- New `ConsentFormType = DISCHARGE_REFUSAL_ACKNOWLEDGMENT`.
- Rules link to existing escalation tiers (24h, 48h, 72h).

---

### 3.4 Home Healthcare Module

**Uses:**

- `consentForms` → home healthcare agreement.
- `educationMaterials` → caregiver training materials.
- `requiredParticipants` → guardian, caregiver.

**Workflow:**

```
Discharge planner selects home healthcare
        ↓
POST /api/v1/knowledge/assembly
        ↓
System returns agreement + training materials
        ↓
Patient/guardian/caregiver sign
        ↓
Agreement attached to case
```

**Module-Specific Extension:**

- New `ConsentFormType = HOME_HEALTHCARE_AGREEMENT`.
- New participant type: `caregiver`.

---

## 4. Shared Services Across Modules

| Concern | Shared Service | Module Usage |
|---|---|---|
| Procedure lookup | `ProcedureCatalogService` | All |
| Package resolution | `PackageService` | All |
| Rule evaluation | `DecisionRuleService` | All |
| Participant validation | `AssemblyService` | All |
| Audit logging | `GovernanceEvent` + `AuditService` | All |
| PDF rendering | Existing PDF engine (unchanged) | All |
| Signature capture | Existing signature service (unchanged) | All |

---

## 5. Avoiding Duplication

### 5.1 What Is Shared

- Procedure catalog.
- Consent form templates.
- Risk and alternative libraries.
- Decision rules.
- Governance workflow.
- Versioning and audit.

### 5.2 What Is Module-Specific

- The patient journey UI.
- Signature orchestration (OTP, Nafath, tablet).
- Module-specific case records.
- Billing/subscription logic.

### 5.3 Rule of Thumb

If a piece of content could appear in more than one module, it belongs in the Clinical Knowledge Engine. If it is unique to a module's operational workflow, it stays in the module.

---

## 6. Integration API for Modules

Each module calls a single endpoint:

```http
POST /api/v1/knowledge/assembly
```

The module supplies:

```json
{
  "procedureCode": "...",
  "patientContext": { ... },
  "physicianContext": { ... },
  "encounterContext": { ... },
  "moduleKey": "informed-consent" | "wathiqnote" | "discharge-refusal" | "home-healthcare"
}
```

The engine:

1. Resolves the effective package for the procedure.
2. Applies tenant-scoped and module-scoped decision rules.
3. Returns the `KnowledgeAssembly`.

---

## 7. Module-Specific Decision Rules

Rules can be scoped to modules:

```json
{
  "code": "WATHIQNOTE_HIGH_VALUE_WITNESS",
  "condition": {
    "operator": "AND",
    "operands": [
      { "field": "moduleKey", "operator": "EQUALS", "value": "wathiqnote" },
      { "field": "encounterContext.noteAmountSar", "operator": "GREATER_THAN", "value": 10000 }
    ]
  },
  "action": {
    "type": "REQUIRE_PARTICIPANT",
    "participantType": "witness"
  }
}
```

---

## 8. Consent/Case Record Storage

Every module stores:

- `knowledgeAssemblyId`
- `knowledgePackageId`
- `knowledgePackageVersion`
- `knowledgePackageSnapshot` (immutable JSON)

This ensures historical records remain legally valid even if the package is later superseded.

---

## 9. Future Modules

New modules integrate the same way:

1. Define module-specific procedure categories and form types.
2. Add module-scoped decision rules.
3. Call `/api/v1/knowledge/assembly`.
4. Render the returned assembly in module-specific UI.

No changes to the core engine are required for most new modules.
