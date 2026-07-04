# Clinical Knowledge Engine — Future Expansion

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Design for Extension

The Clinical Knowledge Engine is designed to absorb new clinical-legal verticals without redesigning the core schema or service layer. New domains reuse the same entities:

- `ClinicalProcedure`
- `ClinicalKnowledgePackage`
- `ConsentForm`
- `EducationMaterial`
- `RiskDisclosure`
- `AlternativeTreatment`
- `DecisionRule`
- `GovernanceEvent`

Extension is achieved by adding:

1. New `ConsentFormType` values.
2. New `ClinicalProcedure.categoryCode` values.
3. New decision rules.
4. New package items.
5. Optional module-specific metadata in JSON fields.

---

## 2. Planned Verticals

### 2.1 Clinical Trials

**New form types:**

- `RESEARCH_CLINICAL_TRIAL_CONSENT`
- `DATA_USE_AGREEMENT`
- `BIOBANK_CONSENT`

**New entities (optional):**

- `ResearchProtocol` — protocol number, IRB approval, sponsor.
- `InvestigationalDrug` — drug name, phase, administration schedule.

**New decision rules:**

- `RESEARCH_REQUIRES_IRB_APPROVAL`
- `RESEARCH_SUBJECT_CAPACITY_VERIFIED`
- `RESEARCH_REQUIRES_TRANSLATION_IF_NON_ENGLISH`

**Package structure:**

```
ClinicalKnowledgePackage
├── ConsentForm (clinical trial consent)
├── EducationMaterial (trial-specific education)
├── RiskDisclosure (investigational drug risks)
├── AlternativeTreatment (standard-of-care alternative)
├── DecisionRule (IRB approval check)
└── RequiredParticipant (witness for vulnerable subjects)
```

---

### 2.2 Telemedicine

**New form types:**

- `TELEMEDICINE_CONSENT`

**New encounter context:**

- `encounterType = TELEMEDICINE`
- `technologyPlatform` (video platform identifier)
- `participantLocation` (patient location for licensing)

**New decision rules:**

- `TELEMEDICINE_REQUIRES_SAUDI_PHYSICIAN_IF_PATIENT_IN_KSA`
- `TELEMEDICINE_TECHNOLOGY_CONSENT_REQUIRED`
- `TELEMEDICINE_NOT_SUITABLE_FOR_EMERGENCY`

**Package structure:**

```
ClinicalKnowledgePackage
├── ConsentForm (telemedicine consent)
├── EducationMaterial (platform usage guide)
├── RiskDisclosure (limitations of remote care)
└── DecisionRule (emergency redirect warning)
```

---

### 2.3 Blood Transfusion

**New form types:**

- `BLOOD_TRANSFUSION_CONSENT`

**New risk disclosures:**

- Transfusion reactions (febrile, allergic, hemolytic).
- Infection risks (HIV, hepatitis — updated by public health data).
- Religious objection documentation.

**New decision rules:**

- `TRANSFUSION_REQUIRES_BLOOD_BANK_CONSENT`
- `JEHOVAHS_WITNESS_REQUIRES_ADVANCE_DIRECTIVE`

**Package structure:**

```
ClinicalKnowledgePackage
├── ConsentForm (blood transfusion consent)
├── EducationMaterial (transfusion process)
├── RiskDisclosure (transfusion-specific risks)
└── AlternativeTreatment (autologous transfusion, cell salvage)
```

---

### 2.4 Vaccination

**New form types:**

- `VACCINATION_CONSENT`

**New entities (optional):**

- `Vaccine` — name, manufacturer, lot number, expiry.

**New decision rules:**

- `VACCINATION_CONTRAINDICATION_CHECK`
- `MINOR_VACCINATION_GUARDIAN_CONSENT`

**Package structure:**

```
ClinicalKnowledgePackage
├── ConsentForm (vaccination consent)
├── EducationMaterial (vaccine information statement)
├── RiskDisclosure (common adverse reactions)
└── DecisionRule (contraindication warning)
```

---

### 2.5 Radiology / Diagnostic Imaging

**New form types:**

- `DIAGNOSTIC_IMAGING_CONSENT`

**New risk disclosures:**

- Radiation exposure.
- Contrast agent reactions.
- Pregnancy screening.

**New decision rules:**

- `CONTRAST_REQUIRES_RENAL_FUNCTION_CHECK`
- `PREGNANCY_IMAGING_REQUIRES_RISKBENEFIT`

**Package structure:**

```
ClinicalKnowledgePackage
├── ConsentForm (imaging consent)
├── EducationMaterial (procedure preparation)
├── RiskDisclosure (radiation / contrast risks)
└── AlternativeTreatment (alternative imaging modalities)
```

---

### 2.6 Surgery

Surgery is the foundational use case already supported by `PROCEDURE_CONSENT`. Future expansion focuses on subspecialties:

- Cardiac surgery (high-risk, second physician).
- Neurosurgery (capacity assessment, guardian).
- Pediatric surgery (guardian, assent).
- Obstetric surgery (fetal considerations).

These are handled by:

- Specialty-specific procedures.
- Specialty-specific risks and alternatives.
- Specialty-specific decision rules.

No new schema required.

---

## 3. Extensibility Checklist

When adding a new vertical, verify:

- [ ] Existing `ConsentFormType` enum can accommodate the new form type, or a new enum value is added.
- [ ] Existing `ClinicalProcedure.categoryCode` can accommodate the new category, or a new code is added.
- [ ] Existing `DecisionRule` condition fields cover the new context, or new fields are added to the context schema.
- [ ] Existing `PackageItem` types cover the new content, or new item types are added.
- [ ] Governance lifecycle still applies.
- [ ] Audit and versioning still apply.

If all answers are yes, the vertical is a configuration problem, not an engineering problem.

---

## 4. Reserved Extension Points

### 4.1 Enum Values Reserved for Future Use

```prisma
enum ConsentFormType {
  // Existing...
  RESEARCH_CLINICAL_TRIAL_CONSENT
  DATA_USE_AGREEMENT
  BIOBANK_CONSENT
  TELEMEDICINE_CONSENT
  VACCINATION_CONSENT
  // Reserved:
  DENTAL_CONSENT
  MENTAL_HEALTH_CONSENT
  ORGAN_DONATION_CONSENT
  ADVANCE_DIRECTIVE
}
```

### 4.2 Context Fields Reserved for Future Use

```typescript
interface EncounterContext {
  // Existing...
  // Future:
  clinicalTrialId?: string;
  telemedicinePlatform?: string;
  imagingModality?: string;
  vaccineLotNumber?: string;
  bloodProductType?: string;
}
```

### 4.3 Decision Rule Action Types Reserved

```typescript
enum RuleActionType {
  // Existing...
  // Future:
  REQUIRE_DOCUMENT,      // e.g., advance directive
  SCHEDULE_FOLLOWUP,     // e.g., post-vaccination observation
  ESCALATE_TO_COMMITTEE, // e.g., ethics committee
  REQUIRE_TRANSLATION    // specific translation document
}
```

---

## 5. Internationalization Expansion

Current model supports bilingual (AR/EN) inline. Future locales use the `ContentLocalization` table:

```
ContentLocalization
├── entityType
├── entityId
├── locale        // e.g., "ur", "fr", "tl"
├── fieldName
├── value
└── approvedBy
```

This allows the engine to serve:

- Urdu for South Asian patient populations.
- Tagalog for Filipino workforce patients.
- French for international patients.

Without schema redesign.

---

## 6. AI-Assisted Content Expansion

Future AI capabilities (per `docs/FUTURE_AI_INTEGRATION.md`) integrate as advisory inputs:

- AI suggests risks from the governed risk library.
- AI proposes lay-language explanations for clinician review.
- AI flags missing disclosures based on procedure context.

AI suggestions are stored separately from final approved content and require governance approval before becoming part of a published package.

---

## 7. Multi-Hospital Network Expansion

The engine supports:

- **Master tenant:** IMC baseline content.
- **Child tenants:** Hospital-specific overlays and translations.
- **Shared content:** Master content inherited by children.
- **Tenant-specific governance:** Each hospital approves its own overlays.

This allows WathiqCare to scale to a multi-hospital SaaS network without content forking.

---

## 8. API Versioning for Future Changes

If a breaking API change becomes necessary:

- Introduce `/api/v2/knowledge/...`.
- Maintain `/api/v1/knowledge/...` for existing modules until migration complete.
- Deprecate v1 with 6-month notice.

The current design avoids v1 breaking changes by keeping the `KnowledgeAssembly` contract stable and adding new fields as optional.

---

## 9. Conclusion

The Clinical Knowledge Engine is not built for today's modules alone. Its entity model, governance model, and API contract are designed to absorb a decade of clinical-legal workflows across WathiqCare and beyond.
