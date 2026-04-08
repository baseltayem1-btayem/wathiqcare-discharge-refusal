export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function readString(value: Record<string, unknown> | null | undefined, ...keys: string[]): string | null {
  if (!value) {
    return null;
  }

  for (const key of keys) {
    const entry = value[key];
    if (typeof entry === "string" && entry.trim()) {
      return entry.trim();
    }
  }

  return null;
}

export function readBoolean(value: Record<string, unknown> | null | undefined, ...keys: string[]): boolean | null {
  if (!value) {
    return null;
  }

  for (const key of keys) {
    const entry = value[key];
    if (typeof entry === "boolean") {
      return entry;
    }
  }

  return null;
}

export function readNumber(value: Record<string, unknown> | null | undefined, ...keys: string[]): number | null {
  if (!value) {
    return null;
  }

  for (const key of keys) {
    const entry = value[key];
    if (typeof entry === "number" && Number.isFinite(entry)) {
      return entry;
    }
  }

  return null;
}

export function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function mergeJsonRecords(
  current: Record<string, unknown> | null,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(current ?? {}),
    ...patch,
  };
}

export function nowPlusDays(days: number, from = new Date()): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
