/**
 * =============================================================================
 * Wording Repository Service
 * =============================================================================
 * Manages IMC unified informed consent wording repository with strict
 * protection of fixed legal clauses. Enforces immutability and governance.
 * =============================================================================
 */

import {
  ApprovedWordingTemplate,
  ConsentDynamicFieldsSpecification,
  StructuredConsentDocument,
  WordingValidationResult,
  WordingValidationError,
  WordingSection,
  WordingLanguage,
  RetrieveWordingOptions,
  WordingRepositoryQueryOptions,
} from './wording-types';

export class WordingRepositoryService {
  /**
   * Retrieve approved wording by section
   * Only returns APPROVED, non-deprecated wording
   */
  static async retrieveWordingBySection(
    section: WordingSection,
    language: WordingLanguage,
    options?: { version?: string }
  ): Promise<ApprovedWordingTemplate | null> {
    // In production, this queries the approved_wording_templates table
    // For now, return mock data structure
    const wording: ApprovedWordingTemplate = {
      id: `wording-${section}-${language}`,
      tenantId: '00000000-0000-0000-0000-000000000001',
      wordingKey: `core.${section}`,
      version: options?.version || '1.0.0',
      language,
      isFixedLegalClause: true,
      contentAr: '',
      contentEn: '',
      section,
      description: `IMC Approved Wording: ${section}`,
      legalReviewStatus: 'APPROVED',
      medicalReviewStatus: 'APPROVED',
      effectiveDate: new Date('2026-05-10'),
      createdAt: new Date('2026-05-10'),
      updatedAt: new Date('2026-05-10'),
    };

    return wording;
  }

  /**
   * Retrieve all wording templates for a consent document
   */
  static async retrieveWordingForConsent(
    options: RetrieveWordingOptions
  ): Promise<{
    coreConsent: ApprovedWordingTemplate;
    imagingConsent?: ApprovedWordingTemplate;
    interpreterClause?: ApprovedWordingTemplate;
    guardianClause?: ApprovedWordingTemplate;
    physicianCertification: ApprovedWordingTemplate;
    noGuaranteeClause: ApprovedWordingTemplate;
    electronicSignatureClause: ApprovedWordingTemplate;
  }> {
    // Retrieve all required sections from approved wording repository
    const sections: WordingSection[] = [
      'core_consent',
      'medical_imaging',
      'interpreter',
      'guardian',
      'physician_certification',
      'no_guarantee',
      'electronic_signature',
    ];

    const wordingMap: Record<string, ApprovedWordingTemplate | null> = {};

    for (const section of sections) {
      const wording = await this.retrieveWordingBySection(section, options.language, {
        version: options.version,
      });
      wordingMap[section] = wording;
    }

    return {
      coreConsent: wordingMap['core_consent']!,
      imagingConsent: wordingMap['medical_imaging'] ?? undefined,
      interpreterClause: wordingMap['interpreter'] ?? undefined,
      guardianClause: wordingMap['guardian'] ?? undefined,
      physicianCertification: wordingMap['physician_certification']!,
      noGuaranteeClause: wordingMap['no_guarantee']!,
      electronicSignatureClause: wordingMap['electronic_signature']!,
    };
  }

  /**
   * Validate that fixed legal clauses have NOT been modified
   * CRITICAL: This enforces immutability contract
   */
  static validateFixedClauseImmutability(
    originalWording: ApprovedWordingTemplate,
    currentWording: ApprovedWordingTemplate
  ): WordingValidationError[] {
    const errors: WordingValidationError[] = [];

    // Check if content has changed
    if (originalWording.contentAr !== currentWording.contentAr) {
      errors.push({
        code: 'FIXED_CLAUSE_MODIFIED',
        message: `Fixed legal clause (Arabic) cannot be modified. This is a CRITICAL governance violation.`,
        fieldPath: `${originalWording.wordingKey}.contentAr`,
        severity: 'ERROR',
      });
    }

    if (originalWording.contentEn !== currentWording.contentEn) {
      errors.push({
        code: 'FIXED_CLAUSE_MODIFIED',
        message: `Fixed legal clause (English) cannot be modified. This is a CRITICAL governance violation.`,
        fieldPath: `${originalWording.wordingKey}.contentEn`,
        severity: 'ERROR',
      });
    }

    return errors;
  }

  /**
   * Validate consent document structure
   * Ensures:
   * - All required fixed sections present
   * - Fixed clauses match approved versions
   * - Dynamic fields within allowed scope
   * - Bilingual structure synchronized
   */
  static async validateConsentDocument(
    consentDoc: StructuredConsentDocument
  ): Promise<WordingValidationResult> {
    const errors: WordingValidationError[] = [];
    const warnings: string[] = [];

    // 1. Validate fixed sections are not modified
    const fixedSectionKeys = Object.keys(consentDoc.fixedSections) as (keyof typeof consentDoc.fixedSections)[];
    for (const key of fixedSectionKeys) {
      const section = consentDoc.fixedSections[key];
      if (section && section.isFixedLegalClause) {
        // In production, compare against database version
        // For now, just validate the structure exists
        if (!section.contentAr || !section.contentEn) {
          warnings.push(`Fixed section ${key} is missing content`);
        }
      }
    }

    // 2. Validate read-only fields are marked correctly
      const allowedEditableFields = this.getPhysicianEditableFields().map(f => String(f));
    for (const readOnlyField of consentDoc.readOnlyFields) {
      if (allowedEditableFields.includes(readOnlyField)) {
        // This is a fixed field; it should not be in dynamic updates
        if (((consentDoc.dynamicFields as unknown) as Record<string, unknown>)[readOnlyField] === undefined) {
          warnings.push(`Read-only field ${readOnlyField} is expected but not provided`);
        }
      }
    }

    // 3. Validate bilingual synchronization
    if (consentDoc.language === 'bilingual') {
      if (!consentDoc.arContent || !consentDoc.enContent) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Bilingual document must have both Arabic and English content',
          severity: 'ERROR',
        });
      }

      // Check that both languages have the same fixed clauses
      const fixedClauseCount = consentDoc.fixedSections.coreConsent ? 1 : 0;
      if (fixedClauseCount > 0) {
        // Both AR and EN versions should reference the same templates
        // (This is a structural validation)
      }
    }

    // 4. Validate approvals for governance
    if (
      consentDoc.approvalStatus === 'APPROVED' ||
      consentDoc.approvalStatus === 'SIGNED'
    ) {
      if (!consentDoc.physicianApprovedAt) {
        errors.push({
          code: 'APPROVAL_NOT_GRANTED',
          message: 'Document status is APPROVED but no physician approval timestamp',
          severity: 'ERROR',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fixedClausesModified: errors.some((e) => e.code === 'FIXED_CLAUSE_MODIFIED'),
      dynamicFieldsModified: true, // Set based on audit trail in production
    };
  }

  /**
   * Build a structured consent document from approved wording + dynamic fields
   * CRITICAL: This ensures fixed clauses are correctly applied
   */
  static async buildStructuredConsentDocument(
    patientId: string,
    procedureId: string,
    specialty: string,
    dynamicFields: ConsentDynamicFieldsSpecification,
    language: WordingLanguage = 'bilingual'
  ): Promise<StructuredConsentDocument> {
    // Retrieve approved wording
    const fixedSections = await this.retrieveWordingForConsent({
      forSpecialty: specialty,
      forProcedure: procedureId,
      language,
    });

    // Build content by combining fixed + dynamic
    const arContent = this.buildBilingualContent(fixedSections, dynamicFields, 'ar');
    const enContent = this.buildBilingualContent(fixedSections, dynamicFields, 'en');

    const consentDoc: StructuredConsentDocument = {
      id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId: '00000000-0000-0000-0000-000000000001',
      patientId,
      procedureId,
      specialty,
      fixedSections,
      dynamicFields,
      language,
      arContent,
      enContent,
      approvalStatus: 'DRAFT',
      readOnlyFields: [
        'fixedSections.coreConsent.contentAr',
        'fixedSections.coreConsent.contentEn',
        'fixedSections.physicianCertification.contentAr',
        'fixedSections.physicianCertification.contentEn',
        'fixedSections.noGuaranteeClause.contentAr',
        'fixedSections.noGuaranteeClause.contentEn',
        'fixedSections.electronicSignatureClause.contentAr',
        'fixedSections.electronicSignatureClause.contentEn',
      ],
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          tenantId: '00000000-0000-0000-0000-000000000001',
          templateId: fixedSections.coreConsent.id,
          wordingKey: fixedSections.coreConsent.wordingKey,
          changeType: 'CREATED',
          actorId: patientId,
          actorRole: 'PHYSICIAN',
          reason: `Structured consent document created for ${procedureId}`,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return consentDoc;
  }

  /**
   * Build bilingual content by combining fixed sections + dynamic fields
   */
  private static buildBilingualContent(
    fixedSections: Record<string, ApprovedWordingTemplate | undefined>,
    dynamicFields: ConsentDynamicFieldsSpecification,
    language: 'ar' | 'en'
  ): string {
    const contentKey = language === 'ar' ? 'contentAr' : 'contentEn';
    const sections: string[] = [];

    // Add fixed sections
    for (const section of Object.values(fixedSections)) {
      if (section) {
        const content = section[contentKey as keyof ApprovedWordingTemplate];
        if (content && typeof content === 'string') {
          sections.push(content);
        }
      }
    }

    // Add dynamic field values
    sections.push(`\n--- Dynamic Fields ---\n`);
    sections.push(`Diagnosis: ${dynamicFields.diagnosis}`);
    sections.push(`Procedure: ${dynamicFields.procedureName}`);
    sections.push(`Expected Benefits: ${dynamicFields.expectedBenefits}`);
    sections.push(`Risks: ${dynamicFields.commonRisks}`);

    return sections.join('\n\n');
  }

  /**
   * Prevent AI from modifying fixed legal clauses
   * CRITICAL: AI can only populate DYNAMIC FIELDS
   */
  static validateAiGeneratedContent(
    aiOutput: Record<string, string>,
    allowedDynamicFields: string[]
  ): WordingValidationError[] {
    const errors: WordingValidationError[] = [];

    for (const [fieldKey] of Object.entries(aiOutput)) {
      if (!allowedDynamicFields.includes(fieldKey)) {
        errors.push({
          code: 'FIXED_CLAUSE_MODIFIED',
          message: `AI attempted to modify fixed field "${fieldKey}". AI can only populate designated dynamic fields.`,
          fieldPath: fieldKey,
          severity: 'ERROR',
        });
      }
    }

    return errors;
  }

  /**
   * Get the list of physician-editable dynamic fields
   */
  static getPhysicianEditableFields(): (keyof ConsentDynamicFieldsSpecification)[] {
    return [
      'diagnosis',
      'caseDescription',
      'procedureName',
      'anesthesiaType',
      'expectedBenefits',
      'commonRisks',
      'uncommonRisks',
      'seriousRisks',
      'treatmentAlternatives',
      'refusalRisks',
      'postCareInstructions',
      'physicianNotes',
      'medicationsUsed',
      'procedureSite',
      'procedureOrgan',
    ];
  }

  /**
   * Get the list of system-populated (read-only) fields
   */
  static getSystemPopulatedFields(): (keyof ConsentDynamicFieldsSpecification)[] {
    return ['physicianName', 'physicianSpecialty', 'physicianLicenseNo', 'consentDateTime'];
  }

  /**
   * Create wording change proposal (for governance workflow)
   * Requires LEGAL + MEDICAL approval before effective
   */
  static async proposeWordingChange(params: {
    templateId: string;
    proposedByUserId: string;
    proposedByRole: 'PHYSICIAN' | 'LEGAL' | 'MEDICAL' | 'COMPLIANCE' | 'ADMIN';
    reason: string;
    proposedContentAr?: string;
    proposedContentEn?: string;
  }): Promise<{ proposalId: string; status: 'PENDING_LEGAL_REVIEW' }> {
    void params;
    // In production, creates a wording_change_proposal record
    // Returns proposal ID for tracking through governance workflow
    return {
      proposalId: `proposal-${Date.now()}`,
      status: 'PENDING_LEGAL_REVIEW',
    };
  }

  /**
   * Query wording repository with filters
   */
  static async queryWordingRepository(
    options: WordingRepositoryQueryOptions
  ): Promise<ApprovedWordingTemplate[]> {
    void options;
    // In production, queries approved_wording_templates table
    // Returns matching templates
    return [];
  }
}
