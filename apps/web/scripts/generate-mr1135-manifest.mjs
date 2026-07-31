import { writeFileSync, readFileSync } from "fs";
import { importAcroFormTemplate } from "../src/lib/server/acroform/acroform-template-import-service.ts";

const authoring = readFileSync("C:/Users/basel/AppData/Local/Temp/wathiqcare-acroform-mr1135-20260715-195722/inputs/IMC_MR_1135_Amputation_AcroForm_Authoring.pdf");
const canonical = readFileSync("C:/Users/basel/AppData/Local/Temp/wathiqcare-acroform-mr1135-20260715-195722/inputs/IMC_MR_1135_Amputation_Canonical_Approved.pdf");
const expected = JSON.parse(readFileSync("C:/Users/basel/AppData/Local/Temp/wathiqcare-acroform-mr1135-20260715-195722/inputs/IMC_MR_1135_AcroForm_Expected_Manifest.json", "utf8"));

const result = await importAcroFormTemplate({
  authoringArtifactBytes: new Uint8Array(authoring),
  canonicalApprovedPdfBytes: new Uint8Array(canonical),
  templateCode: "IMC MR 1135",
  templateVersion: "2018-02",
  titleEn: "Amputation",
  titleAr: "البتر",
  status: "VERIFIED",
  provenance: {
    importedAt: "2026-07-15T00:00:00.000Z",
    reviewedAt: "2026-07-15T00:00:00.000Z",
    reviewedBy: "wathiqcare-acroform-adapter",
    sourceTool: "pdf-lib-acroform-importer",
    notes: "Verified against supplied expected manifest. Authoring artifact contains JavaScript actions and is used offline only.",
  },
  options: { expectedManifest: expected },
});

const outPath = new URL("../src/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json", import.meta.url);
writeFileSync(outPath, JSON.stringify(result.manifest, null, 2) + "\n");
console.log("Manifest written to", outPath.pathname);
console.log("Manifest hash", result.manifest.manifestHash);
