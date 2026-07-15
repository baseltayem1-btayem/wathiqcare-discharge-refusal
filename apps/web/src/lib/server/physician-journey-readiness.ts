
import { analyzeDoctorReadiness } from "@/components/informed-consents/production-workspace/doctorReadiness";
import type {
  ProductionPatient,
  ProductionEncounter,
  ProductionProcedure,
  PhysicianContext,
} from "@/components/informed-consents/production-workspace/types";
import type { ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";
import { isAssemblyApprovedPdfSourceVerified } from "@/components/informed-consents/production-workspace/utils/approvedPdfSource";

export type ReadinessItemStatus = "COMPLETE" | "BLOCKED" | "REQUIRED" | "NOT_APPLICABLE";

type FieldMappingReadinessInput = {
  hasMapping?: boolean;
  verificationStatus?: string;
  formId?: string;
  requiredDoctorFields?: Array<{ key: string; labelEn: string; labelAr?: string; type: string; section?: string; required?: boolean }>;
  requiredAnesthesiaFields?: Array<{ key: string; labelEn: string; labelAr?: string; type: string; section?: string; required?: boolean; requiredWhen?: string }>;
  requiredPatientFields?: Array<{ key: string; labelEn?: string; labelAr?: string; type?: string; required?: boolean }>;
  interpreterApplicable?: boolean;
  substituteDecisionMakerApplicable?: boolean;
  witnessApplicable?: boolean;
};

export type ReadinessItem = {
  key: string;
  labelEn: string;
  labelAr: string;
  status: ReadinessItemStatus;
  blocking: boolean;
  category: "identity" | "package" | "mapping" | "physician" | "anesthesia" | "patient" | "education" | "preview" | "contact" | "allowlist" | "blockers" | "approval";
  detail?: string;
};

export type PhysicianJourneyReadiness = {
  items: ReadinessItem[];
  completedCount: number;
  totalCount: number;
  notApplicableCount: number;
  progressPercentage: number;
  sendReady: boolean;
  blocked: boolean;
  missingItemKeys: string[];
  blockerItemKeys: string[];
};

function normalizeMobile(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return compact;
}

function hasContact(mobile: string, email: string): boolean {
  return Boolean(normalizeMobile(mobile) || email.trim());
}

function isValueTrue(value: string | undefined): boolean {
  return value === "true";
}

function isValueFalse(value: string | undefined): boolean {
  return value === "false";
}

function isValueAnswered(value: string | undefined): boolean {
  return value === "true" || value === "false";
}

/**
 * Evaluate a simple requiredWhen expression against the current completion values.
 * Supported patterns:
 * - "anesthesia_applies === true"
 * - "anesthesia_applies === false"
 */
function evaluateRequiredWhen(expression: string | undefined, values: Record<string, string>): boolean {
  if (!expression) return true;
  const normalized = expression.trim();
  const match = normalized.match(/^([a-zA-Z0-9_]+)\s*===\s*(true|false)$/);
  if (!match) return true;
  const [, key, expected] = match;
  const actual = values[key];
  if (expected === "true") return isValueTrue(actual);
  if (expected === "false") return isValueFalse(actual);
  return true;
}

function item(
  key: string,
  labelEn: string,
  labelAr: string,
  status: ReadinessItemStatus,
  category: ReadinessItem["category"],
  detail?: string,
): ReadinessItem {
  return {
    key,
    labelEn,
    labelAr,
    status,
    blocking: status === "BLOCKED" || status === "REQUIRED",
    category,
    detail,
  };
}

export function computePhysicianJourneyReadiness(args: {
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
  selectedProcedure?: ProductionProcedure;
  assembly?: ClinicalKnowledgeAssembly;
  fieldMappingReadiness?: FieldMappingReadinessInput;
  doctorCompletionValues: Record<string, string>;
  physicianSignatureDataUrl: string;
  anesthesiaOverride?: string | null;
  previewReviewed: boolean;
  recipientMobile: string;
  recipientEmail: string;
  sendEligibility?: { allowlisted: boolean; reason?: string };
  draftApproved: boolean;
  acknowledgedBlockers: Set<string>;
  physicianContext: PhysicianContext;
}): PhysicianJourneyReadiness {
  const {
    patient,
    encounter,
    selectedProcedure,
    assembly,
    fieldMappingReadiness,
    doctorCompletionValues,
    physicianSignatureDataUrl,
    anesthesiaOverride,
    previewReviewed,
    recipientMobile,
    recipientEmail,
    sendEligibility,
    draftApproved,
    acknowledgedBlockers,
  } = args;

  const items: ReadinessItem[] = [];

  // Identity gates
  items.push(
    item(
      "patient_selected",
      "Patient selected",
      "تم اختيار المريض",
      patient ? "COMPLETE" : "REQUIRED",
      "identity",
    ),
  );

  items.push(
    item(
      "encounter_selected",
      "Encounter selected",
      "تم ربط الزيارة",
      encounter ? "COMPLETE" : "REQUIRED",
      "identity",
    ),
  );

  items.push(
    item(
      "procedure_selected",
      "Procedure selected",
      "تم اختيار الإجراء",
      selectedProcedure ? "COMPLETE" : "REQUIRED",
      "identity",
    ),
  );

  // Package / approved PDF source
  const pdfSourceVerified = isAssemblyApprovedPdfSourceVerified(assembly);

  if (!assembly) {
    items.push(
      item(
        "knowledge_package_ready",
        "Knowledge package ready",
        "الحزمة المعرفية جاهزة",
        "REQUIRED",
        "package",
        "Resolve a clinical knowledge package for the selected procedure.",
      ),
    );
  } else if (!pdfSourceVerified) {
    items.push(
      item(
        "knowledge_package_ready",
        "Knowledge package ready",
        "الحزمة المعرفية جاهزة",
        "BLOCKED",
        "package",
        "Approved PDF source is not available or not verified for this consent form.",
      ),
    );
  } else if (assembly.status !== "ready") {
    items.push(
      item(
        "knowledge_package_ready",
        "Knowledge package ready",
        "الحزمة المعرفية جاهزة",
        "BLOCKED",
        "package",
        `Knowledge package status is ${assembly.status}.`,
      ),
    );
  } else {
    items.push(
      item(
        "knowledge_package_ready",
        "Knowledge package ready",
        "الحزمة المعرفية جاهزة",
        "COMPLETE",
        "package",
      ),
    );
  }

  // Mapping
  if (!fieldMappingReadiness) {
    items.push(
      item(
        "field_mapping_verified",
        "Consent field mapping verified",
        "تم التحقق من خريطة الحقول",
        "REQUIRED",
        "mapping",
        "Consent field mapping must be loaded.",
      ),
    );
  } else if (!fieldMappingReadiness.hasMapping) {
    items.push(
      item(
        "field_mapping_verified",
        "Consent field mapping verified",
        "تم التحقق من خريطة الحقول",
        "BLOCKED",
        "mapping",
        "No consent field mapping found for this form.",
      ),
    );
  } else if (fieldMappingReadiness.verificationStatus !== "VERIFIED") {
    items.push(
      item(
        "field_mapping_verified",
        "Consent field mapping verified",
        "تم التحقق من خريطة الحقول",
        "BLOCKED",
        "mapping",
        `Consent field mapping is ${fieldMappingReadiness.verificationStatus?.toLowerCase()}.`,
      ),
    );
  } else {
    items.push(
      item(
        "field_mapping_verified",
        "Consent field mapping verified",
        "تم التحقق من خريطة الحقول",
        "COMPLETE",
        "mapping",
      ),
    );
  }

  // Physician completion
  const requiredDoctorFields = fieldMappingReadiness?.requiredDoctorFields ?? [];
  const doctorReadinessReport = analyzeDoctorReadiness({
    fields: requiredDoctorFields,
    values: doctorCompletionValues,
    physicianSignatureDataUrl,
  });

  const signatureField = requiredDoctorFields.find((f) => f.type === "SIGNATURE");
  const textFieldsMissing = doctorReadinessReport.missingFields.filter((f) => f.type !== "SIGNATURE");

  // Interpreter decision is a conditional gate for AcroForm templates that expose it.
  const interpreterApplicable = Boolean(fieldMappingReadiness?.interpreterApplicable);
  const interpreterRequiredAnswered = !interpreterApplicable || isValueAnswered(doctorCompletionValues.interpreter_required);
  const interpreterPresentAnswered = !interpreterApplicable || !isValueTrue(doctorCompletionValues.interpreter_required) || isValueAnswered(doctorCompletionValues.interpreter_present);
  const interpreterDecisionMissing = interpreterApplicable && (!interpreterRequiredAnswered || !interpreterPresentAnswered);

  const blockingPhysicianFieldsMissing = textFieldsMissing.length > 0 || interpreterDecisionMissing;

  if (requiredDoctorFields.length === 0 && !interpreterApplicable) {
    items.push(
      item(
        "physician_fields_complete",
        "Physician fields complete",
        "تم إكمال حقول الطبيب",
        "NOT_APPLICABLE",
        "physician",
        "No physician-completed fields are required for this form.",
      ),
    );
  } else if (blockingPhysicianFieldsMissing) {
    const missingLabels = textFieldsMissing.map((f) => f.labelEn);
    if (interpreterDecisionMissing) {
      missingLabels.push("Interpreter decision");
    }
    items.push(
      item(
        "physician_fields_complete",
        "Physician fields complete",
        "تم إكمال حقول الطبيب",
        "BLOCKED",
        "physician",
        `Missing: ${missingLabels.join(", ")}`,
      ),
    );
  } else {
    items.push(
      item(
        "physician_fields_complete",
        "Physician fields complete",
        "تم إكمال حقول الطبيب",
        "COMPLETE",
        "physician",
      ),
    );
  }

  // Physician signature lifecycle
  const signatureCaptured = Boolean(physicianSignatureDataUrl.trim());
  if (!signatureField) {
    items.push(
      item(
        "physician_signature_complete",
        "Physician signature complete",
        "توقيع الطبيب مكتمل",
        "NOT_APPLICABLE",
        "physician",
        "No physician signature is required for this form.",
      ),
    );
  } else if (!signatureCaptured) {
    items.push(
      item(
        "physician_signature_complete",
        "Physician signature complete",
        "توقيع الطبيب مكتمل",
        "REQUIRED",
        "physician",
        "Physician signature has not been captured.",
      ),
    );
  } else if (blockingPhysicianFieldsMissing) {
    items.push(
      item(
        "physician_signature_complete",
        "Physician signature complete",
        "توقيع الطبيب مكتمل",
        "BLOCKED",
        "physician",
        "Complete all physician fields before the signature is considered final.",
      ),
    );
  } else {
    items.push(
      item(
        "physician_signature_complete",
        "Physician signature complete",
        "توقيع الطبيب مكتمل",
        "COMPLETE",
        "physician",
      ),
    );
  }

  // Anesthesia applicability
  const requiredAnesthesiaFields = fieldMappingReadiness?.requiredAnesthesiaFields ?? [];
  const effectiveAnesthesiaFields = requiredAnesthesiaFields.filter((field) =>
    evaluateRequiredWhen(field.requiredWhen, doctorCompletionValues),
  );
  const anesthesiaApplies = isValueTrue(doctorCompletionValues.anesthesia_applies) || anesthesiaOverride === "GENERAL" || anesthesiaOverride === "REGIONAL" || anesthesiaOverride === "SEDATION" || anesthesiaOverride === "LOCAL";
  const anesthesiaDecisionAnswered = isValueAnswered(doctorCompletionValues.anesthesia_applies) || anesthesiaOverride !== undefined;
  const anesthesiaNotApplicable = effectiveAnesthesiaFields.length === 0 && !anesthesiaApplies;

  if (anesthesiaNotApplicable) {
    items.push(
      item(
        "anesthesia_workflow_reviewed",
        "Anesthesia workflow reviewed",
        "تمت مراجعة مسار التخدير",
        "NOT_APPLICABLE",
        "anesthesia",
        "Anesthesia is not required for this procedure.",
      ),
    );
  } else if (!anesthesiaDecisionAnswered) {
    items.push(
      item(
        "anesthesia_workflow_reviewed",
        "Anesthesia workflow reviewed",
        "تمت مراجعة مسار التخدير",
        "REQUIRED",
        "anesthesia",
        "Anesthesia applicability must be selected before dispatch.",
      ),
    );
  } else if (effectiveAnesthesiaFields.length > 0 && anesthesiaApplies) {
    const anesthesiaReadinessReport = analyzeDoctorReadiness({
      fields: effectiveAnesthesiaFields,
      values: doctorCompletionValues,
      physicianSignatureDataUrl,
    });
    if (anesthesiaReadinessReport.missingCount > 0) {
      items.push(
        item(
          "anesthesia_workflow_reviewed",
          "Anesthesia workflow reviewed",
          "تمت مراجعة مسار التخدير",
          "BLOCKED",
          "anesthesia",
          `Missing: ${anesthesiaReadinessReport.missingFields.map((f) => f.labelEn).join(", ")}`,
        ),
      );
    } else {
      items.push(
        item(
          "anesthesia_workflow_reviewed",
          "Anesthesia workflow reviewed",
          "تمت مراجعة مسار التخدير",
          "COMPLETE",
          "anesthesia",
        ),
      );
    }
  } else {
    items.push(
      item(
        "anesthesia_workflow_reviewed",
        "Anesthesia workflow reviewed",
        "تمت مراجعة مسار التخدير",
        "COMPLETE",
        "anesthesia",
      ),
    );
  }

  // Patient signature mapped
  const patientSignatureMapped = Boolean((fieldMappingReadiness?.requiredPatientFields?.length || 0) > 0);
  items.push(
    item(
      "patient_signature_mapped",
      "Patient signature mapped",
      "تم ربط حقل توقيع المريض",
      patientSignatureMapped ? "COMPLETE" : "BLOCKED",
      "patient",
      patientSignatureMapped ? undefined : "Patient signature field is not mapped.",
    ),
  );

  // Education material
  const hasEducation = (assembly?.educationMaterials.length || 0) > 0;
  items.push(
    item(
      "education_material_ready",
      "Education material ready",
      "المواد التعليمية جاهزة",
      hasEducation ? "COMPLETE" : "NOT_APPLICABLE",
      "education",
      hasEducation ? undefined : "No education material is attached to this package.",
    ),
  );

  // Preview reviewed
  items.push(
    item(
      "preview_reviewed",
      "Preview reviewed",
      "تمت مراجعة المعاينة",
      previewReviewed ? "COMPLETE" : "REQUIRED",
      "preview",
    ),
  );

  // Contact
  items.push(
    item(
      "patient_contact_available",
      "Patient contact available",
      "بيانات التواصل متوفرة",
      hasContact(recipientMobile, recipientEmail) ? "COMPLETE" : "REQUIRED",
      "contact",
    ),
  );

  // Allowlist
  items.push(
    item(
      "recipient_allowlisted",
      "Recipient allowlisted",
      "المستلم ضمن القائمة المسموحة",
      sendEligibility?.allowlisted ? "COMPLETE" : "BLOCKED",
      "allowlist",
      sendEligibility?.allowlisted ? undefined : (sendEligibility?.reason || "Recipient is not approved for pilot send."),
    ),
  );

  // Assembly blockers
  const assemblyBlockers = assembly?.blockers ?? [];
  const unacknowledgedBlockers = assemblyBlockers.filter((b) => !acknowledgedBlockers.has(b.key));
  const hasBlockingBlockers = unacknowledgedBlockers.length > 0;

  items.push(
    item(
      "send_blockers_resolved",
      "Send blockers resolved",
      "تمت معالجة موانع الإرسال",
      assemblyBlockers.length === 0 ? "NOT_APPLICABLE" : hasBlockingBlockers ? "BLOCKED" : "COMPLETE",
      "blockers",
      hasBlockingBlockers ? unacknowledgedBlockers.map((b) => b.messageEn || b.key).join("; ") : undefined,
    ),
  );

  // Draft approval
  items.push(
    item(
      "draft_approved",
      "Draft approved",
      "تم اعتماد المسودة",
      draftApproved ? "COMPLETE" : "REQUIRED",
      "approval",
    ),
  );

  // Aggregate
  const completedCount = items.filter((i) => i.status === "COMPLETE" || i.status === "NOT_APPLICABLE").length;
  const notApplicableCount = items.filter((i) => i.status === "NOT_APPLICABLE").length;
  const totalCount = items.length;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const blockerItems = items.filter((i) => i.status === "BLOCKED");
  const requiredItems = items.filter((i) => i.status === "REQUIRED");
  const blocked = blockerItems.length > 0 || requiredItems.length > 0;
  const sendReady = !blocked && completedCount === totalCount;
  const missingItemKeys = items.filter((i) => i.status === "REQUIRED" || i.status === "BLOCKED").map((i) => i.key);
  const blockerItemKeys = blockerItems.map((i) => i.key);

  return {
    items,
    completedCount,
    totalCount,
    notApplicableCount,
    progressPercentage,
    sendReady,
    blocked,
    missingItemKeys,
    blockerItemKeys,
  };
}
