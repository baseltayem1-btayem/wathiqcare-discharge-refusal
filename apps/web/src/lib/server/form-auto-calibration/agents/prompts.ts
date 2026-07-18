/**
 * Agent prompts.
 *
 * Structured, deterministic prompts for the agentic calibration assistant.
 * All prompts demand JSON output so the orchestrator can parse them safely.
 */

import type { ConsentOntologyField } from "../ontology/consent-field-ontology";

export function buildLabelMatchPrompt(params: {
  ontology: { fields: ConsentOntologyField[]; layoutFamilyHint: string };
  extractedFields: Array<{ name: string; label?: string; page: number; rect: { x: number; y: number; width: number; height: number } }>;
  unmappedKeys: string[];
}): string {
  const extractedJson = JSON.stringify(params.extractedFields.slice(0, 200));
  const unmappedJson = JSON.stringify(params.unmappedKeys);

  return `You are an expert medical form calibration assistant.
Given an ontology and a list of fields extracted from a blank PDF form, propose matches for the unmapped ontology keys.

Ontology:
${JSON.stringify(params.ontology.fields.map((f) => ({ key: f.key, labelEn: f.labelEn, labelAr: f.labelAr, dataType: f.dataType, role: f.role })))}

Extracted fields (name, label, page, normalized rect {x,y,width,height}):
${extractedJson}

Unmapped ontology keys:
${unmappedJson}

Instructions:
- Only return a JSON object with a "matches" array.
- Each match must have: ontologyKey, fieldName, reason, confidence (0.0 to 1.0).
- Do not invent field names; only use those listed above.
- If no good match exists, omit the key.
- Response must be valid JSON and nothing else.

Example:
{
  "matches": [
    { "ontologyKey": "patient.name", "fieldName": "patient_full_name", "reason": "exact label match", "confidence": 0.95 }
  ]
}`;
}

export function buildQualityReviewPrompt(params: {
  ontology: { fields: ConsentOntologyField[]; layoutFamilyHint: string };
  mappings: Array<{ ontologyKey: string; sourceFieldName: string; rectangles: { page: number; absolute: { x: number; y: number; width: number; height: number } }[] }>;
  qualityReport: { score: number; status: string; findings: Array<{ check: string; passed: boolean; message: string }> };
}): string {
  return `You are reviewing a proposed calibration mapping for a consent PDF.

Ontology fields:
${JSON.stringify(params.ontology.fields.map((f) => ({ key: f.key, labelEn: f.labelEn, dataType: f.dataType, requiredness: f.requiredness, role: f.role })))}

Proposed mappings:
${JSON.stringify(params.mappings)}

Quality report:
${JSON.stringify(params.qualityReport)}

Instructions:
- Return a JSON object with a "review" array.
- Each review item must have: ontologyKey (or "general"), severity ("error" | "warning" | "info"), message.
- Flag any mapping that seems wrong, missing, or risky.
- Do not include prose outside the JSON.

Example:
{
  "review": [
    { "ontologyKey": "patient.date_of_birth", "severity": "error", "message": "Mapped to a checkbox instead of a date field." }
  ]
}`;
}
