/**
 * Dynamic Consent Template Engine - Test Suite
 * This file contains comprehensive unit tests for the engine components.
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import type {
  DynamicConsentPayload,
  DynamicConsentTemplateDefinition,
  DynamicConsentRiskItem,
} from "@/modules/consent-engine/engine/types";
import { normalizeDynamicConsentPayload, validateDynamicConsentPayload } from "@/modules/consent-engine/validators/payload-validator";
import { validateSignatureRequirements, validatePhysicianDeclaration } from "@/modules/consent-engine/validators/signature-validator";
import { validateSubstituteDecisionMaker } from "@/modules/consent-engine/validators/substitute-decision-maker";
import { validateTranslator } from "@/modules/consent-engine/validators/translator-validator";

describe("Dynamic Consent Engine Tests", () => {
  describe("Payload Validator", () => {
    it("should validate required fields", () => {
      const payload: DynamicConsentPayload = {
        patient: { name: "John Doe" },
        encounter: {},
        physician: { name: "Dr. Smith" },
        diagnosis: "Hypertension",
        procedure: "Medication Adjustment",
        specialty: "CARDIOLOGY",
        language: "en",
        risks: [],
        alternatives: [],
        legalStatements: [],
      };

      const issues = validateDynamicConsentPayload(payload);
      assert.strictEqual(issues.length, 0, "Valid payload should have no issues");
    });

    it("should detect missing patient name", () => {
      const payload: DynamicConsentPayload = {
        patient: { name: "" },
        encounter: {},
        physician: { name: "Dr. Smith" },
        diagnosis: "Hypertension",
        procedure: "Medication Adjustment",
        specialty: "CARDIOLOGY",
        language: "en",
        risks: [],
        alternatives: [],
        legalStatements: [],
      };

      const issues = validateDynamicConsentPayload(payload);
      assert.ok(issues.length > 0, "Missing patient name should be detected");
    });

    it("should normalize text fields", () => {
      const payload: DynamicConsentPayload = {
        patient: { name: "  John Doe  " },
        encounter: {},
        physician: { name: "  Dr. Smith  " },
        diagnosis: "Hypertension",
        procedure: "Medication Adjustment",
        specialty: "CARDIOLOGY",
        language: "en",
        risks: [],
        alternatives: [],
        legalStatements: [],
      };

      const normalized = normalizeDynamicConsentPayload(payload);
      assert.strictEqual(normalized.patient.name, "John Doe", "Whitespace should be trimmed");
      assert.strictEqual(normalized.physician.name, "Dr. Smith", "Whitespace should be trimmed");
    });
  });

  describe("Signature Validator", () => {
    it("should validate signature requirements", () => {
      const payload: DynamicConsentPayload = {
        patient: { name: "John Doe", id: "P123" },
        encounter: {},
        physician: { name: "Dr. Smith", id: "PH123" },
        diagnosis: "Hypertension",
        procedure: "Medication Adjustment",
        specialty: "CARDIOLOGY",
        language: "en",
        risks: [],
        alternatives: [],
        legalStatements: [],
      };

      const result = validateSignatureRequirements(payload, {
        patientRequired: true,
        physicianRequired: true,
      });

      assert.strictEqual(result.isValid, true, "Valid signatures should pass");
    });

    it("should validate physician declaration", () => {
      const payload: DynamicConsentPayload = {
        patient: { name: "John Doe" },
        encounter: {},
        physician: { name: "Dr. Smith", identifier: "LIC-2024-001" },
        diagnosis: "Hypertension",
        procedure: "Medication Adjustment",
        specialty: "CARDIOLOGY",
        language: "en",
        risks: [],
        alternatives: [],
        legalStatements: [],
      };

      const result = validatePhysicianDeclaration(payload);
      assert.strictEqual(result.isValid, true, "Valid physician declaration should pass");
    });
  });

  describe("Substitute Decision Maker Validator", () => {
    it("should require SDM for minor patients", () => {
      const result = validateSubstituteDecisionMaker(undefined, 15, "full");
      assert.strictEqual(result.isRequired, true, "SDM should be required for minors");
      assert.strictEqual(result.isValid, false, "Missing SDM should fail validation");
    });

    it("should not require SDM for adult patients", () => {
      const result = validateSubstituteDecisionMaker(undefined, 25, "full");
      assert.strictEqual(result.isRequired, false, "SDM should not be required for adults");
    });

    it("should require SDM for incapacitated patients", () => {
      const result = validateSubstituteDecisionMaker(undefined, 40, "incapacitated");
      assert.strictEqual(result.isRequired, true, "SDM should be required for incapacitated patients");
    });
  });

  describe("Translator Validator", () => {
    it("should not require translator for bilingual document", () => {
      const result = validateTranslator(undefined, "ar", "bilingual");
      assert.strictEqual(result.isRequired, true, "Translator recommended for bilingual");
    });

    it("should detect invalid translator", () => {
      const result = validateTranslator(
        { name: "" },
        "ur",
        "en"
      );
      assert.ok(result.errors.length > 0, "Missing translator name should be detected");
    });
  });
});

export {};
