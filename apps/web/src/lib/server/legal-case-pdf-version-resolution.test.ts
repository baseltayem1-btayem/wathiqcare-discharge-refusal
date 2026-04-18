import assert from "node:assert/strict";
import test from "node:test";
import type { CasePdfVersionSummary } from "./legal-case-pdf-service";
import { __casePdfStorageInternals } from "./legal-case-pdf-service";

function makeSummary(input: Partial<CasePdfVersionSummary> & { id: string; version: number }): CasePdfVersionSummary {
  return {
    id: input.id,
    version: input.version,
    fileName: input.fileName || `v${input.version}.pdf`,
    generatedAt: input.generatedAt || new Date().toISOString(),
    status: input.status || "draft",
    isFinal: input.isFinal || false,
    templateVersion: input.templateVersion || "1.0.0",
    language: input.language || "en",
    mimeType: input.mimeType || "application/pdf",
    fileSize: input.fileSize || 1024,
    sha256Hash: input.sha256Hash || null,
    generatedBy: input.generatedBy || null,
    binaryAvailable: input.binaryAvailable ?? true,
    recoveryRequired: input.recoveryRequired ?? false,
    recoveryMessage: input.recoveryMessage || null,
  };
}

test("latest valid version skips broken newest record", () => {
  const versions: CasePdfVersionSummary[] = [
    makeSummary({ id: "v2", version: 2, status: "failed", binaryAvailable: false, recoveryRequired: true }),
    makeSummary({ id: "v1", version: 1, status: "draft", binaryAvailable: true, recoveryRequired: false }),
  ];

  const latestValid = __casePdfStorageInternals.pickLatestValidCasePdfVersion(versions);
  assert.equal(latestValid?.id, "v1");
  assert.equal(latestValid?.version, 1);
});

test("latest valid version returns null when all versions are broken", () => {
  const versions: CasePdfVersionSummary[] = [
    makeSummary({ id: "v3", version: 3, status: "failed", binaryAvailable: false, recoveryRequired: true }),
    makeSummary({ id: "v2", version: 2, status: "failed", binaryAvailable: false, recoveryRequired: true }),
  ];

  const latestValid = __casePdfStorageInternals.pickLatestValidCasePdfVersion(versions);
  assert.equal(latestValid, null);
});
