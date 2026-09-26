# Clinical Knowledge Engine — Decision Rules Engine

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Purpose

The Decision Rules Engine evaluates clinical-legal business rules against a patient encounter context and produces advisory or mandatory outputs:

- Required participants (witness, interpreter, guardian, anesthesiologist).
- Missing disclosures (risks, alternatives).
- Recommended education materials.
- Risk level adjustments.
- Procedure-specific warnings.

Rules are **data**, not code. Clinical governance can create, update, activate, and deactivate rules without engineering deployment.

---

## 2. Rule Structure

Each rule has:

```json
{
  "id": "rule-minor-guardian",
  "code": "MINOR_REQUIRES_GUARDIAN",
  "nameEn": "Minor patient requires guardian",
  "nameAr": "المريض القاصر يتطلب ولي أمر",
  "description": "When the patient is a minor or lacks capacity, a legal guardian must sign.",
  "priority": 100,
  "status": "ACTIVE",
  "effectiveDate": "2026-01-01",
  "expiryDate": null,
  "condition": { ... },
  "action": { ... }
}
```

### 2.1 Condition

A JSON AST describing when the rule fires.

```json
{
  "operator": "AND",
  "operands": [
    {
      "field": "patient.capacityStatus",
      "operator": "IN",
      "value": ["minor", "incapacitated"]
    },
    {
      "operator": "NOT",
      "operands": [
        {
          "field": "patient.guardianName",
          "operator": "EXISTS"
        }
      ]
    }
  ]
}
```

### 2.2 Action

A JSON object describing what to do when the rule fires.

```json
{
  "type": "REQUIRE_PARTICIPANT",
  "participantType": "guardian",
  "isMandatory": true,
  "messageEn": "A legal guardian is required for this patient.",
  "messageAr": "يلزم وجود ولي أمر قانوني لهذا المريض."
}
```

---

## 3. Supported Operators

### 3.1 Logical Operators

| Operator | Description |
|---|---|
| `AND` | All operands must be true. |
| `OR` | At least one operand must be true. |
| `NOT` | Operand must be false. |

### 3.2 Comparison Operators

| Operator | Description | Example |
|---|---|---|
| `EQUALS` | Exact equality | `patient.gender = "female"` |
| `NOT_EQUALS` | Inequality | `patient.capacityStatus != "competent"` |
| `IN` | Value in list | `procedure.categoryCode IN ["SURGICAL"]` |
| `NOT_IN` | Value not in list | `procedure.specialty NOT_IN ["DERMATOLOGY"]` |
| `GREATER_THAN` | Numeric/date comparison | `patient.age > 65` |
| `LESS_THAN` | Numeric/date comparison | `patient.age < 18` |
| `EXISTS` | Field is present and non-null | `patient.guardianName EXISTS` |
| `CONTAINS` | String or array contains | `procedure.keywords CONTAINS "cardiac"` |

### 3.3 Context Fields

Rules can reference:

```
procedure.id
procedure.code
procedure.nameEn
procedure.nameAr
procedure.specialtyCode
procedure.departmentCode
procedure.categoryCode
procedure.anesthesiaRequired

patient.age
patient.capacityStatus
patient.languagePreference
patient.gender
patient.guardianName
patient.guardianRelationship
patient.allergies
patient.currentMedications

encounter.type
encounter.departmentId
encounter.isEmergency
encounter.admissionType

package.riskLevel
package.formType
```

---

## 4. Action Types

| Action Type | Fields | Description |
|---|---|---|
| `REQUIRE_PARTICIPANT` | `participantType`, `isMandatory`, `messageEn`, `messageAr` | Adds a required participant. |
| `SUGGEST_RISK` | `riskIds[]`, `severity`, `messageEn`, `messageAr` | Suggests a risk disclosure. |
| `SUGGEST_ALTERNATIVE` | `alternativeIds[]`, `severity`, `messageEn`, `messageAr` | Suggests an alternative treatment. |
| `SUGGEST_EDUCATION` | `educationIds[]`, `messageEn`, `messageAr` | Recommends education material. |
| `ADJUST_RISK_LEVEL` | `riskLevel`, `reason` | Raises or lowers computed risk level. |
| `BLOCK` | `messageEn`, `messageAr` | Prevents package readiness. |
| `WARN` | `severity`, `messageEn`, `messageAr` | Non-blocking advisory. |

---

## 5. Rule Evaluation Flow

```
Input: procedure, package, patientContext, encounterContext

1. Load all ACTIVE rules for tenant.
2. Filter rules where effectiveDate <= NOW <= expiryDate.
3. Sort by priority (desc), then createdAt (asc).
4. For each rule:
   a. Evaluate condition against context.
   b. If true, apply action to result accumulator.
5. Merge duplicate requirements (e.g., multiple rules requiring witness).
6. Return: suggestions[], blockers[], requiredParticipants[], riskLevel
```

### 5.1 Result Accumulator

```typescript
interface RuleEvaluationResult {
  requiredParticipants: RequiredParticipant[];
  suggestions: Suggestion[];
  blockers: Blocker[];
  riskLevel: RiskLevel;
  matchedRuleIds: string[];
}
```

---

## 6. Example Rules

### 6.1 Minor Patient Requires Guardian

```json
{
  "code": "MINOR_REQUIRES_GUARDIAN",
  "priority": 200,
  "condition": {
    "operator": "OR",
    "operands": [
      { "field": "patient.capacityStatus", "operator": "EQUALS", "value": "minor" },
      { "field": "patient.capacityStatus", "operator": "EQUALS", "value": "incapacitated" }
    ]
  },
  "action": {
    "type": "REQUIRE_PARTICIPANT",
    "participantType": "guardian",
    "isMandatory": true,
    "messageEn": "A legal guardian is required for this patient.",
    "messageAr": "يلزم وجود ولي أمر قانوني لهذا المريض."
  }
}
```

### 6.2 Interpreter Required for Non-Arabic Speakers

```json
{
  "code": "INTERPRETER_FOR_NON_ARABIC",
  "priority": 100,
  "condition": {
    "operator": "AND",
    "operands": [
      { "field": "patient.languagePreference", "operator": "EQUALS", "value": "en" },
      { "field": "patient.capacityStatus", "operator": "NOT_EQUALS", "value": "minor" }
    ]
  },
  "action": {
    "type": "REQUIRE_PARTICIPANT",
    "participantType": "interpreter",
    "isMandatory": false,
    "messageEn": "Consider offering an Arabic interpreter.",
    "messageAr": "فكر في توفير مترجم عربي."
  }
}
```

### 6.3 General Anesthesia Requires Witness

```json
{
  "code": "ANESTHESIA_REQUIRES_WITNESS",
  "priority": 150,
  "condition": {
    "field": "procedure.anesthesiaRequired",
    "operator": "EQUALS",
    "value": true
  },
  "action": {
    "type": "REQUIRE_PARTICIPANT",
    "participantType": "witness",
    "isMandatory": true,
    "messageEn": "A witness signature is required for anesthesia procedures.",
    "messageAr": "التوقيع على إقرار التخدير يتطلب شاهدًا."
  }
}
```

### 6.4 High-Risk Procedure Block

```json
{
  "code": "HIGH_RISK_SECOND_PHYSICIAN",
  "priority": 250,
  "condition": {
    "operator": "AND",
    "operands": [
      { "field": "package.riskLevel", "operator": "EQUALS", "value": "critical" },
      { "field": "encounter.isEmergency", "operator": "EQUALS", "value": false }
    ]
  },
  "action": {
    "type": "REQUIRE_PARTICIPANT",
    "participantType": "second_physician",
    "isMandatory": true,
    "messageEn": "A second physician review is required for critical non-emergency procedures.",
    "messageAr": "يلزم مراجعة طبيب ثانٍ للإجراءات الحرجة غير الطارئة."
  }
}
```

### 6.5 Research Consent Requires Ethics Approval

```json
{
  "code": "RESEARCH_REQUIRES_ETHICS",
  "priority": 300,
  "condition": {
    "field": "procedure.categoryCode",
    "operator": "EQUALS",
    "value": "RESEARCH"
  },
  "action": {
    "type": "BLOCK",
    "messageEn": "Research consent requires documented IRB/ethics approval.",
    "messageAr": "موافقة البحث تتطلب موافقة لجنة الأخلاقيات الموثقة."
  }
}
```

### 6.6 Emergency Override

```json
{
  "code": "EMERGENCY_WAIVER",
  "priority": 1000,
  "condition": {
    "field": "encounter.isEmergency",
    "operator": "EQUALS",
    "value": true
  },
  "action": {
    "type": "WARN",
    "severity": "info",
    "messageEn": "Emergency pathway: standard witness requirements may be waived per policy.",
    "messageAr": "مسار الطوارئ: قد يتم التنازل عن متطلبات الشاهد القياسية حسب السياسة."
  }
}
```

---

## 7. Rule Authoring UI

A governance UI allows non-engineers to:

1. Select a condition template (minor, anesthesia, high-risk, etc.).
2. Configure parameters (age threshold, specialties, risk levels).
3. Select an action type and fill message templates.
4. Set priority and effective dates.
5. Save as draft, submit for approval, activate.

Advanced users may edit the JSON AST directly with validation.

---

## 8. Rule Validation

Before a rule can be activated, the system validates:

- Condition AST is well-formed.
- All referenced fields exist in the context schema.
- Action type is supported.
- Message templates are non-empty in at least one locale.
- Priority is unique or explicitly allowed to overlap.
- Effective/expiry dates are valid.

---

## 9. Performance Considerations

- Rules are cached in memory per tenant after first load.
- Rule evaluation is stateless and embarrassingly parallel.
- Complex rule sets (>100 rules) should be benchmarked; evaluation must complete in < 50ms.

---

## 10. Audit

Every rule evaluation is logged:

```json
{
  "eventType": "RULE_EVALUATED",
  "ruleId": "rule-minor-guardian",
  "procedureId": "...",
  "packageId": "...",
  "matched": true,
  "contextSnapshot": { "patient.age": 12, "patient.capacityStatus": "minor" },
  "result": { "requiredParticipants": ["guardian"] }
}
```

This supports compliance review and debugging.
