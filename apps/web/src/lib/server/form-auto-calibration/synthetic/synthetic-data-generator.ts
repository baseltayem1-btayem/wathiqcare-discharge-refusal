/**
 * Synthetic data generator.
 *
 * Produces deterministic fake patient values for offline pilot testing.
 */

import type { ConsentOntologyField } from "../ontology/consent-field-ontology";

export function generateSyntheticValue(
  field: ConsentOntologyField,
  seed: string,
): string | string[] {
  const hash = simpleHash(seed + field.key);

  switch (field.dataType) {
    case "string":
    case "multiline_text":
      return `Synthetic ${field.labelEn} ${hash.slice(0, 6)}`;
    case "date": {
      const base = new Date("2000-01-01").getTime();
      const offset = parseInt(hash.slice(0, 8), 16) % (365 * 25 * 24 * 60 * 60 * 1000);
      const date = new Date(base + offset);
      return date.toISOString().split("T")[0];
    }
    case "time":
      return `${parseInt(hash.slice(0, 2), 16) % 24}:00`;
    case "datetime": {
      const base = new Date("2000-01-01").getTime();
      const offset = parseInt(hash.slice(0, 8), 16) % (365 * 25 * 24 * 60 * 60 * 1000);
      return new Date(base + offset).toISOString();
    }
    case "boolean":
      return String(parseInt(hash.slice(0, 2), 16) % 2 === 0);
    case "select_one":
      if (field.supportedWidgets.includes("CHECKBOX")) return String(true);
      return `option-${hash.slice(0, 4)}`;
    case "select_many":
      return [`option-${hash.slice(0, 4)}`];
    case "signature_image":
      return `synthetic-signature-${hash.slice(0, 8)}`;
    default:
      return "";
  }
}

export function generateSyntheticFormData(
  fields: ConsentOntologyField[],
  seedPrefix = "pilot",
): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {};
  for (const field of fields) {
    if (field.requiredness === "ALWAYS" || parseInt(simpleHash(field.key).slice(0, 2), 16) % 2 === 0) {
      data[field.key] = generateSyntheticValue(field, `${seedPrefix}:${field.key}`);
    }
  }
  return data;
}

function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
