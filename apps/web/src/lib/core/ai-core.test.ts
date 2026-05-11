/**
 * AI Core Unit Tests
 * Tests: prompt building, interpolation, result wrapping, specialty mapping
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConsentSystemPrompt,
  interpolatePromptTemplate,
  wrapAiResult,
  extractAiMetadata,
  resolveSpecialtyPromptKey,
  ALL_SUPPORTED_SPECIALTIES,
  AiDisabledError,
  AiGenerationError,
} from "./ai-core";

// ---------------------------------------------------------------------------
// buildConsentSystemPrompt
// ---------------------------------------------------------------------------

test("buildConsentSystemPrompt includes specialty context when provided", () => {
  const prompt = buildConsentSystemPrompt("Cardiology");
  assert.ok(prompt.includes("Cardiology"), "Must mention specialty");
  assert.ok(prompt.includes("medico-legal"), "Must mention medico-legal");
  assert.ok(prompt.includes("IMC"), "Must reference IMC");
});

test("buildConsentSystemPrompt works without specialty", () => {
  const prompt = buildConsentSystemPrompt();
  assert.ok(prompt.length > 50, "Must produce substantive prompt");
  assert.ok(!prompt.includes("undefined"), "Must not contain 'undefined'");
});

// ---------------------------------------------------------------------------
// interpolatePromptTemplate
// ---------------------------------------------------------------------------

test("interpolatePromptTemplate substitutes all known variables", () => {
  const template = "{{SPECIALTY}} - {{PROCEDURE}} - {{PATIENT_AGE}} - {{DIAGNOSIS}}";
  const result = interpolatePromptTemplate(template, {
    specialty: "Surgery",
    procedureName: "Appendectomy",
    patientAge: 35,
    diagnosisFreeText: "Acute appendicitis",
  });

  assert.equal(result, "Surgery - Appendectomy - 35 - Acute appendicitis");
});

test("interpolatePromptTemplate uses defaults for missing context fields", () => {
  const template = "{{PROCEDURE_CODE}} {{PATIENT_GENDER}} {{CONSENT_TYPE}}";
  const result = interpolatePromptTemplate(template, {});

  // Empty strings are acceptable defaults
  assert.ok(!result.includes("{{"), "No unreplaced template variables");
});

// ---------------------------------------------------------------------------
// wrapAiResult
// ---------------------------------------------------------------------------

test("wrapAiResult always marks status as draft", () => {
  const result = wrapAiResult("Draft content", "gpt-4o-mini", "1.0.0", "Surgery");
  assert.equal(result.status, "draft", "AI results must always be draft");
});

test("wrapAiResult includes disclaimer fields", () => {
  const result = wrapAiResult("Content", "gpt-4o-mini", "1.0.0");
  assert.ok(result.disclaimer.length > 0, "English disclaimer required");
  assert.ok(result.disclaimerAr.length > 0, "Arabic disclaimer required");
});

test("wrapAiResult populates generatedAt as ISO string", () => {
  const result = wrapAiResult("Content", "gpt-4o-mini", "1.0.0");
  const date = new Date(result.generatedAt);
  assert.ok(!isNaN(date.getTime()), "generatedAt must be valid ISO date");
});

// ---------------------------------------------------------------------------
// extractAiMetadata
// ---------------------------------------------------------------------------

test("extractAiMetadata extracts stable metadata shape", () => {
  const result = wrapAiResult("Content", "gpt-4o-mini", "2.1.0", "OBGYN");
  const meta = extractAiMetadata(result);

  assert.equal(meta.model, "gpt-4o-mini");
  assert.equal(meta.promptVersion, "2.1.0");
  assert.equal(meta.specialty, "OBGYN");
  assert.equal(meta.status, "draft");
});

// ---------------------------------------------------------------------------
// resolveSpecialtyPromptKey
// ---------------------------------------------------------------------------

test("resolveSpecialtyPromptKey returns known keys for all supported specialties", () => {
  for (const specialty of ALL_SUPPORTED_SPECIALTIES) {
    const key = resolveSpecialtyPromptKey(specialty);
    assert.ok(key.startsWith("consent."), `Key for ${specialty} must start with 'consent.'`);
    assert.ok(!key.includes("undefined"), "No undefined in key");
  }
});

test("resolveSpecialtyPromptKey returns general key for unknown specialty", () => {
  const key = resolveSpecialtyPromptKey("UnknownSpecialty");
  assert.equal(key, "consent.general");
});

// ---------------------------------------------------------------------------
// ALL_SUPPORTED_SPECIALTIES
// ---------------------------------------------------------------------------

test("ALL_SUPPORTED_SPECIALTIES contains all 13 required specialties", () => {
  const required = [
    "Surgery", "ENT", "Gastroenterology", "Cardiology", "Orthopedics",
    "Oncology", "ICU", "Radiology", "OBGYN", "Pediatrics",
    "Dental", "Anesthesia", "Emergency Medicine",
  ];

  for (const specialty of required) {
    assert.ok(
      ALL_SUPPORTED_SPECIALTIES.includes(specialty),
      `Missing required specialty: ${specialty}`
    );
  }
});

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

test("AiDisabledError has correct code", () => {
  const err = new AiDisabledError("disabled");
  assert.equal(err.code, "AI_DISABLED");
  assert.ok(err instanceof Error);
});

test("AiGenerationError has correct code", () => {
  const err = new AiGenerationError("failed");
  assert.equal(err.code, "AI_GENERATION_FAILED");
});
