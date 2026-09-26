import {
  resolveContentMapping,
  buildImcConsentPackage,
} from "@/lib/server/content-mapping-service";

async function main() {
  const examples = [
    { label: "Education + Consent", procedure: "Abdominal Aortic Aneurysm" },
    { label: "Consent Only", procedure: "Allergen Immunotherapy" },
    { label: "Not Found", procedure: "Unknown Procedure XYZ" },
  ];

  for (const example of examples) {
    const result = await resolveContentMapping({
      procedure: example.procedure,
      tenantId: "tenant-demo",
      preferredLanguage: "bilingual",
    });

    const payload = {
      ok: true,
      found: result.found,
      featureFlagEnabled: true,
      mapping: result,
      package: result.found ? buildImcConsentPackage(result) : null,
    };

    console.log(`\n--- ${example.label} ---\n`);
    console.log(JSON.stringify(payload, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
