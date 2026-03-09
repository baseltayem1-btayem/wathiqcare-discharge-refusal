import type { Prisma } from "@prisma/client";

export function toInputJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toInputJsonValue(item));
  }

  if (typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = toInputJsonValue(nested);
    }
    return out;
  }

  return null;
}
