import { createHash } from "node:crypto";

const DEFAULT_VOLATILE_FIELDS = ["generatedAt", "hash", "qrDataUrl", "pageNumber", "totalPages"] as const;

export interface EvidenceHashOptions {
  includeVolatileFields?: boolean;
  volatileFields?: ReadonlyArray<string>;
}

function normalizeValue(
  value: unknown,
  volatileFields: ReadonlySet<string>,
  includeVolatileFields: boolean,
  currentKey?: string,
): unknown {
  if (!includeVolatileFields && currentKey && volatileFields.has(currentKey)) {
    return undefined;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, volatileFields, includeVolatileFields));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, normalizeValue(record[key], volatileFields, includeVolatileFields, key)] as const)
        .filter((entry) => entry[1] !== undefined),
    );
  }

  return value;
}

export function stableEvidenceJsonStringify(value: unknown, options: EvidenceHashOptions = {}): string {
  const includeVolatileFields = options.includeVolatileFields ?? false;
  const volatileFields = new Set(options.volatileFields ?? DEFAULT_VOLATILE_FIELDS);
  return JSON.stringify(normalizeValue(value, volatileFields, includeVolatileFields));
}

export function generateEvidenceHash(value: Record<string, unknown> | unknown, options: EvidenceHashOptions = {}): string {
  const digest = createHash("sha256");
  digest.update(stableEvidenceJsonStringify(value, options), "utf8");
  return digest.digest("hex");
}