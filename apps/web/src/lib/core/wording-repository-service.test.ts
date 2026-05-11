/**
 * =============================================================================
 * Wording Repository Service Tests
 * =============================================================================
 * Unit tests validating:
 * - Fixed legal clause immutability
 * - AI content restrictions to dynamic fields
 * - Document validation and governance
 * - Bilingual synchronization
 * =============================================================================
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  WordingRepositoryService,
} from './wording-repository-service';
import {
  ApprovedWordingTemplate,
  ConsentDynamicFieldsSpecification,
  StructuredConsentDocument,
  WordingValidationError,
} from './wording-types';

test('WordingRepositoryService — Fixed Clause Immutability', async (t) => {
  await t.test('should detect modification of Arabic fixed clause', () => {
    const original: ApprovedWordingTemplate = {
      id: 'wording-1',
      tenantId: 'tenant-1',
      wordingKey: 'core.informed_consent.main_clause',
      version: '1.0.0',
      language: 'bilingual',
      isFixedLegalClause: true,
      contentAr: 'أقر أنا الموقع أدناه...',
      contentEn: 'I, the undersigned...',
      section: 'core_consent',
      description: 'Core consent clause',
      legalReviewStatus: 'APPROVED',
      medicalReviewStatus: 'APPROVED',
      effectiveDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const modified = { ...original };
    modified.contentAr = 'Modified text'; // Attempt to modify

    const errors = WordingRepositoryService.validateFixedClauseImmutability(original, modified);

    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].code, 'FIXED_CLAUSE_MODIFIED');
    assert.strictEqual(errors[0].severity, 'ERROR');
  });

  await t.test('should detect modification of English fixed clause', () => {
    const original: ApprovedWordingTemplate = {
      id: 'wording-1',
      tenantId: 'tenant-1',
      wordingKey: 'core.no_guarantee_clause',
      version: '1.0.0',
      language: 'bilingual',
      isFixedLegalClause: true,
      contentAr: 'أفهم وأقر بأنه لا يمكن ضمان...',
      contentEn: 'I understand and acknowledge that no specific result...',
      section: 'no_guarantee',
      description: 'No guarantee clause',
      legalReviewStatus: 'APPROVED',
      medicalReviewStatus: 'APPROVED',
      effectiveDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const modified = { ...original };
    modified.contentEn = 'We absolutely guarantee results'; // Attempt to modify

    const errors = WordingRepositoryService.validateFixedClauseImmutability(original, modified);

    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].code, 'FIXED_CLAUSE_MODIFIED');
  });

  await t.test('should pass validation when fixed clause is unchanged', () => {
    const original: ApprovedWordingTemplate = {
      id: 'wording-1',
      tenantId: 'tenant-1',
      wordingKey: 'core.informed_consent.main_clause',
      version: '1.0.0',
      language: 'bilingual',
      isFixedLegalClause: true,
      contentAr: 'أقر أنا الموقع أدناه...',
      contentEn: 'I, the undersigned...',
      section: 'core_consent',
      description: 'Core consent clause',
      legalReviewStatus: 'APPROVED',
      medicalReviewStatus: 'APPROVED',
      effectiveDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const unchanged = { ...original };

    const errors = WordingRepositoryService.validateFixedClauseImmutability(original, unchanged);

    assert.strictEqual(errors.length, 0);
  });
});

test('WordingRepositoryService — AI Content Restrictions', async (t) => {
  await t.test('should reject AI attempting to modify fixed fields', () => {
    const aiOutput = {
      diagnosis: 'Patient has hypertension', // OK
      core_consent_fixed: 'Modified core consent', // NOT OK
      expectedBenefits: 'Patient recovery', // OK
    };

    const allowedDynamicFields = [
      'diagnosis',
      'expectedBenefits',
      'commonRisks',
      'procedureName',
    ];

    const errors = WordingRepositoryService.validateAiGeneratedContent(aiOutput, allowedDynamicFields);

    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].fieldPath, 'core_consent_fixed');
    assert.strictEqual(errors[0].code, 'FIXED_CLAUSE_MODIFIED');
    assert.match(
      errors[0].message,
      /AI attempted to modify fixed field|AI can only populate designated dynamic fields/
    );
  });

  await t.test('should allow AI to populate only designated dynamic fields', () => {
    const aiOutput = {
      diagnosis: 'Acute appendicitis',
      procedureName: 'Appendectomy',
      expectedBenefits: 'Removal of inflamed appendix',
      commonRisks: 'Bleeding, infection',
      postCareInstructions: 'Rest for 2 weeks, pain management',
    };

    const allowedDynamicFields = [
      'diagnosis',
      'procedureName',
      'expectedBenefits',
      'commonRisks',
      'postCareInstructions',
    ];

    const errors = WordingRepositoryService.validateAiGeneratedContent(aiOutput, allowedDynamicFields);

    assert.strictEqual(errors.length, 0);
  });

  await t.test('should identify all fixed field modification attempts', () => {
    const aiOutput = {
      physicianCertification_fixed: 'I certify...',
      noGuarantee_fixed: 'No guarantee...',
      diagnosis: 'Valid diagnosis',
    };

    const allowedDynamicFields = ['diagnosis'];

    const errors = WordingRepositoryService.validateAiGeneratedContent(aiOutput, allowedDynamicFields);

    assert.strictEqual(errors.length, 2);
    assert(errors.every((e) => e.code === 'FIXED_CLAUSE_MODIFIED'));
  });
});

test('WordingRepositoryService — Consent Document Validation', async (t) => {
  const createMockTemplate = (section: string): ApprovedWordingTemplate => ({
    id: `wording-${section}`,
    tenantId: 'tenant-1',
    wordingKey: `core.${section}`,
    version: '1.0.0',
    language: 'bilingual',
    isFixedLegalClause: true,
    contentAr: `Fixed Arabic ${section}`,
    contentEn: `Fixed English ${section}`,
    section: section as any,
    description: `${section} clause`,
    legalReviewStatus: 'APPROVED',
    medicalReviewStatus: 'APPROVED',
    effectiveDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockDynamicFields: ConsentDynamicFieldsSpecification = {
    diagnosis: 'Type 2 Diabetes',
    caseDescription: 'Poorly controlled blood sugar',
    procedureName: 'Insulin therapy initiation',
    anesthesiaType: undefined,
    expectedBenefits: 'Better glucose control',
    commonRisks: 'Hypoglycemia',
    uncommonRisks: 'Lipodystrophy',
    seriousRisks: 'Severe hypoglycemia with seizures',
    treatmentAlternatives: 'Oral medications',
    refusalRisks: 'Complications from uncontrolled diabetes',
    postCareInstructions: 'Monitor blood sugar twice daily',
    physicianNotes: 'Patient educated on proper injection technique',
    medicationsUsed: ['Insulin glargine'],
    procedureSite: undefined,
    procedureOrgan: 'Pancreas (systemic therapy)',
    physicianName: 'Dr. Ahmed Al-Zain',
    physicianSpecialty: 'Endocrinology',
    physicianLicenseNo: 'MOH-12345',
    consentDateTime: new Date(),
  };

  await t.test('should validate complete consent document structure', async () => {
    const consentDoc: StructuredConsentDocument = {
      id: 'consent-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      procedureId: 'proc-1',
      specialty: 'Endocrinology',
      fixedSections: {
        coreConsent: createMockTemplate('core_consent'),
        physicianCertification: createMockTemplate('physician_certification'),
        noGuaranteeClause: createMockTemplate('no_guarantee'),
        electronicSignatureClause: createMockTemplate('electronic_signature'),
      },
      dynamicFields: mockDynamicFields,
      language: 'bilingual',
      arContent: 'Arabic content with fixed + dynamic...',
      enContent: 'English content with fixed + dynamic...',
      approvalStatus: 'DRAFT',
      readOnlyFields: ['fixedSections.coreConsent'],
      auditTrail: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await WordingRepositoryService.validateConsentDocument(consentDoc);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  await t.test('should detect missing approval timestamp on APPROVED document', async () => {
    const consentDoc: StructuredConsentDocument = {
      id: 'consent-2',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      procedureId: 'proc-1',
      specialty: 'Endocrinology',
      fixedSections: {
        coreConsent: createMockTemplate('core_consent'),
        physicianCertification: createMockTemplate('physician_certification'),
        noGuaranteeClause: createMockTemplate('no_guarantee'),
        electronicSignatureClause: createMockTemplate('electronic_signature'),
      },
      dynamicFields: mockDynamicFields,
      language: 'bilingual',
      arContent: 'Arabic content...',
      enContent: 'English content...',
      approvalStatus: 'APPROVED', // Marked as approved
      // physicianApprovedAt is MISSING — this is the error
      readOnlyFields: ['fixedSections.coreConsent'],
      auditTrail: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await WordingRepositoryService.validateConsentDocument(consentDoc);

    assert.strictEqual(result.isValid, false);
    assert(result.errors.length > 0);
    assert(result.errors.some((e) => e.code === 'APPROVAL_NOT_GRANTED'));
  });

  await t.test('should validate bilingual synchronization', async () => {
    const consentDoc: StructuredConsentDocument = {
      id: 'consent-3',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      procedureId: 'proc-1',
      specialty: 'Endocrinology',
      fixedSections: {
        coreConsent: createMockTemplate('core_consent'),
        physicianCertification: createMockTemplate('physician_certification'),
        noGuaranteeClause: createMockTemplate('no_guarantee'),
        electronicSignatureClause: createMockTemplate('electronic_signature'),
      },
      dynamicFields: mockDynamicFields,
      language: 'bilingual',
      arContent: 'Arabic content...',
      // enContent is MISSING — bilingual document incomplete
      approvalStatus: 'DRAFT',
      readOnlyFields: [],
      auditTrail: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await WordingRepositoryService.validateConsentDocument(consentDoc);

    assert.strictEqual(result.isValid, false);
    assert(result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD'));
  });
});

test('WordingRepositoryService — Editable Fields', async (t) => {
  await t.test('should return physician-editable fields', () => {
    const editableFields = WordingRepositoryService.getPhysicianEditableFields();

    assert(editableFields.includes('diagnosis'));
    assert(editableFields.includes('expectedBenefits'));
    assert(editableFields.includes('commonRisks'));
    assert(editableFields.includes('procedureName'));
    assert(editableFields.includes('postCareInstructions'));

    // These should NOT be editable (system-populated)
    assert(!editableFields.includes('physicianName'));
    assert(!editableFields.includes('consentDateTime'));
  });

  await t.test('should return system-populated fields', () => {
    const systemFields = WordingRepositoryService.getSystemPopulatedFields();

    assert(systemFields.includes('physicianName'));
    assert(systemFields.includes('physicianSpecialty'));
    assert(systemFields.includes('physicianLicenseNo'));
    assert(systemFields.includes('consentDateTime'));
  });
});

test('WordingRepositoryService — Governance Workflow', async (t) => {
  await t.test('should create wording change proposal requiring legal review', async () => {
    const proposal = await WordingRepositoryService.proposeWordingChange({
      templateId: 'wording-1',
      proposedByUserId: 'user-legal-1',
      proposedByRole: 'LEGAL',
      reason: 'Update to align with new PDPL requirements',
      proposedContentAr: 'Updated Arabic content...',
      proposedContentEn: 'Updated English content...',
    });

    assert.strictEqual(proposal.status, 'PENDING_LEGAL_REVIEW');
    assert(proposal.proposalId.startsWith('proposal-'));
  });
});
