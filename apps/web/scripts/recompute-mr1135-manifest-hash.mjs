import { readFileSync, writeFileSync } from "fs";
import { computeAcroFormManifestHash } from "../src/lib/server/acroform/field-addressed-template-manifest.ts";

const manifestPath = "./src/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const { manifestHash: _, ...manifestWithoutHash } = manifest;
const newHash = computeAcroFormManifestHash(manifestWithoutHash);
manifest.manifestHash = newHash;

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("Manifest hash recomputed:", newHash);
