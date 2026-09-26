"use client";

export type AnesthesiaGateField = {
  key: string;
  labelEn: string;
  type?: string;
  requiredWhen?: string;
};

export type AnesthesiaGateStatus =
  | "no_anesthesia_fields"
  | "unanswered"
  | "applicable_incomplete"
  | "applicable_complete"
  | "not_applicable_missing_reason"
  | "not_applicable";

export type AnesthesiaGateInput = {
  requiredAnesthesiaFields: AnesthesiaGateField[];
  doctorCompletionValues: Record<string, string>;
  /**
   * Optional legacy signal: "NONE" means the physician marked anesthesia as
   * not applicable; any other value means it applies. The primary signal is
   * the doctorCompletionValues.anesthesia_applies checkbox ("true"/"false").
   */
  anesthesiaOverride?: "NONE" | "LOCAL" | "SEDATION" | "REGIONAL" | "GENERAL";
};

export type AnesthesiaGateResult = {
  hasAnesthesiaFields: boolean;
  decisionAnswered: boolean;
  applies: boolean;
  notApplicable: boolean;
  effectiveFields: AnesthesiaGateField[];
  pendingFields: AnesthesiaGateField[];
  reasonProvided: boolean;
  ready: boolean;
  status: AnesthesiaGateStatus;
  message: string;
};

const NOT_APPLICABLE_REASON_KEY = "anesthesia_not_applicable_reason";

function matchesRequiredWhen(
  requiredWhen: string | undefined,
  conditionValues: Record<string, string | undefined>,
): boolean {
  const expression = requiredWhen?.trim();
  if (!expression) return true;
  const match = expression.match(/^([a-zA-Z0-9_]+)\s*===\s*(true|false)$/);
  if (!match) return true;
  const [, key, expected] = match;
  const actual = conditionValues[key];
  if (actual === undefined) return false;
  return expected === "true" ? actual === "true" : actual === "false";
}

function isFieldFilled(field: AnesthesiaGateField, values: Record<string, string>): boolean {
  const value = values[field.key];
  return value !== undefined && String(value).trim().length > 0;
}

/**
 * Evaluate the anesthesia dispatch gate.
 *
 * - Mappings without anesthesia fields never block dispatch.
 * - When anesthesia fields exist, the physician must confirm applicability:
 *     - Applicable: every effective anesthesia field (after requiredWhen
 *     filtering) must be completed before dispatch.
 *   - Not applicable: allowed only with a written reason, which is stored in
 *     doctorCompletionValues and flows into the consent document metadata.
 * - A failed in-page PDF preview is unrelated to this gate; it never blocks.
 */
export function evaluateAnesthesiaGate(input: AnesthesiaGateInput): AnesthesiaGateResult {
  const requiredAnesthesiaFields = input.requiredAnesthesiaFields ?? [];
  const values = input.doctorCompletionValues ?? {};
  const hasAnesthesiaFields = requiredAnesthesiaFields.length > 0;

  if (!hasAnesthesiaFields) {
    return {
      hasAnesthesiaFields: false,
      decisionAnswered: true,
      applies: false,
      notApplicable: false,
      effectiveFields: [],
      pendingFields: [],
      reasonProvided: true,
      ready: true,
      status: "no_anesthesia_fields",
      message: "",
    };
  }

  const checkboxDecision = values.anesthesia_applies;
  const override = input.anesthesiaOverride;
  const overrideSet = override !== undefined;
  const overrideApplies = overrideSet && override !== "NONE";

  const decisionAnswered =
    checkboxDecision === "true" || checkboxDecision === "false" || overrideSet;
  const applies =
    checkboxDecision === "true" || (checkboxDecision !== "false" && overrideApplies);
  const notApplicable =
    checkboxDecision === "false" || (checkboxDecision !== "true" && overrideSet && !overrideApplies);

  // Evaluate requiredWhen conditions against the effective decision. When the
  // mapping has no anesthesia_applies checkbox, the explicit panel decision or
  // the override supplies the condition value.
  const conditionValues: Record<string, string | undefined> = { ...values };
  if (conditionValues.anesthesia_applies === undefined) {
    conditionValues.anesthesia_applies = !decisionAnswered
      ? undefined
      : applies
        ? "true"
        : "false";
  }

  const effectiveFields = requiredAnesthesiaFields.filter((field) =>
    matchesRequiredWhen(field.requiredWhen, conditionValues),
  );

  const pendingFields = applies
    ? effectiveFields.filter((field) => !isFieldFilled(field, values))
    : [];

  const reasonProvided =
    String(values[NOT_APPLICABLE_REASON_KEY] ?? "").trim().length > 0;

  let ready: boolean;
  let status: AnesthesiaGateStatus;
  let message: string;

  if (!decisionAnswered) {
    ready = false;
    status = "unanswered";
    message = "Confirm whether anesthesia applies (or mark it not applicable).";
  } else if (applies) {
    if (pendingFields.length > 0) {
      ready = false;
      status = "applicable_incomplete";
      message =
        "Anesthesia review required: complete " +
        pendingFields.map((field) => field.labelEn).join(", ") +
        ".";
    } else {
      ready = true;
      status = "applicable_complete";
      message = "Anesthesia review completed.";
    }
  } else if (notApplicable) {
    if (!reasonProvided) {
      ready = false;
      status = "not_applicable_missing_reason";
      message = "Provide a reason for marking anesthesia not applicable.";
    } else {
      ready = true;
      status = "not_applicable";
      message = "Anesthesia marked not applicable.";
    }
  } else {
    ready = false;
    status = "unanswered";
    message = "Confirm whether anesthesia applies (or mark it not applicable).";
  }

  return {
    hasAnesthesiaFields,
    decisionAnswered,
    applies,
    notApplicable,
    effectiveFields,
    pendingFields,
    reasonProvided,
    ready,
    status,
    message,
  };
}

export { NOT_APPLICABLE_REASON_KEY };
