import assert from "node:assert/strict";
import test from "node:test";

import { validateSaudiResidencyDeployment } from "./privacy-service";

const ORIGINAL_PATIENT_REGION = process.env.PATIENT_DATA_REGION;
const ORIGINAL_BACKUP_REGION = process.env.BACKUP_DATA_REGION;

test("Saudi deployment validation passes for KSA-hosted patient and backup regions", () => {
  process.env.PATIENT_DATA_REGION = "saudi-arabia-riyadh";
  process.env.BACKUP_DATA_REGION = "saudi-arabia-riyadh";

  const result = validateSaudiResidencyDeployment();

  assert.equal(result.compliant, true);
  assert.equal(result.blockers.length, 0);
});

test("Saudi deployment validation blocks non-KSA patient hosting", () => {
  process.env.PATIENT_DATA_REGION = "us-east-1";
  process.env.BACKUP_DATA_REGION = "saudi-arabia-riyadh";

  const result = validateSaudiResidencyDeployment();

  assert.equal(result.compliant, false);
  assert.ok(result.blockers.some((item) => item.includes("Patient data region")));
});

test.after(() => {
  process.env.PATIENT_DATA_REGION = ORIGINAL_PATIENT_REGION;
  process.env.BACKUP_DATA_REGION = ORIGINAL_BACKUP_REGION;
});