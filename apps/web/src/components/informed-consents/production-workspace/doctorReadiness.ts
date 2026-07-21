"use client";

export type DoctorReadinessField = {
  key: string;
  labelEn: string;
  section?: string;
  type: string;
};

export type DoctorReadinessFieldResult =
  DoctorReadinessField & {
    complete: boolean;
  };

export type DoctorReadinessReport = {
  fields: DoctorReadinessFieldResult[];
  completedFields: DoctorReadinessFieldResult[];
  missingFields: DoctorReadinessFieldResult[];
  completedCount: number;
  missingCount: number;
  totalCount: number;
  progressPercentage: number;
  ready: boolean;
  nextRequiredField?: DoctorReadinessFieldResult;
};

export function isDoctorReadinessFieldComplete(args: {
  field: Pick<DoctorReadinessField, "key" | "type">;
  values: Record<string, string>;
  physicianSignatureDataUrl: string;
}): boolean {
  const { field, values, physicianSignatureDataUrl } = args;
  const value = values[field.key];

  if (field.type === "SIGNATURE") {
    return Boolean(
      physicianSignatureDataUrl.trim(),
    );
  }

  if (field.type === "CHECKBOX") {
    return value === "true" || value === "false";
  }

  return Boolean(value?.trim());
}

export function analyzeDoctorReadiness(args: {
  fields: DoctorReadinessField[];
  values: Record<string, string>;
  physicianSignatureDataUrl: string;
}): DoctorReadinessReport {
  const fields = args.fields.map((field) => ({
    ...field,
    complete: isDoctorReadinessFieldComplete({
      field,
      values: args.values,
      physicianSignatureDataUrl:
        args.physicianSignatureDataUrl,
    }),
  }));

  const completedFields =
    fields.filter((field) => field.complete);

  const missingFields =
    fields.filter((field) => !field.complete);

  const totalCount = fields.length;
  const completedCount = completedFields.length;
  const missingCount = missingFields.length;

  return {
    fields,
    completedFields,
    missingFields,
    completedCount,
    missingCount,
    totalCount,
    progressPercentage:
      totalCount === 0
        ? 100
        : Math.round(
            (completedCount / totalCount) * 100,
          ),
    ready:
      totalCount === 0 || missingCount === 0,
    nextRequiredField:
      missingFields[0],
  };
}
