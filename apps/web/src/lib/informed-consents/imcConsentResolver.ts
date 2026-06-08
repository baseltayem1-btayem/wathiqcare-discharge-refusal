export type ImcConsentCatalogItem = {
  id: string;
  titleEn: string;
  fileName: string;
  publicPath: string;
  specialty: string;
  templateType: string;
  status: string;
  source: string;
  requiresAnesthesia: boolean;
  isPatientCopy: boolean;
  isEducation: boolean;
  isAnesthesia: boolean;
  lengthBytes: number;
};

export type ImcConsentPackage = {
  procedureConsent?: ImcConsentCatalogItem;
  patientEducation?: ImcConsentCatalogItem;
  anesthesiaConsent?: ImcConsentCatalogItem;
  anesthesiaEducation?: ImcConsentCatalogItem;
  matches: ImcConsentCatalogItem[];
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/patient copy/g, "")
    .replace(/patient's copy/g, "")
    .replace(/consent form/g, "")
    .replace(/consent/g, "")
    .replace(/education/g, "")
    .replace(/educational information/g, "")
    .replace(/information/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreTitle(item: ImcConsentCatalogItem, procedureName: string): number {
  const title = normalize(item.titleEn);
  const procedure = normalize(procedureName);

  if (!title || !procedure) return 0;
  if (title === procedure) return 100;
  if (title.includes(procedure)) return 90;
  if (procedure.includes(title)) return 80;

  const titleWords = new Set(title.split(" ").filter(Boolean));
  const procedureWords = procedure.split(" ").filter(Boolean);

  let score = 0;
  for (const word of procedureWords) {
    if (titleWords.has(word)) score += 10;
  }

  return score;
}

function bestMatch(
  items: ImcConsentCatalogItem[],
  procedureName: string,
  predicate: (item: ImcConsentCatalogItem) => boolean,
): ImcConsentCatalogItem | undefined {
  return items
    .filter(predicate)
    .map((item) => ({ item, score: scoreTitle(item, procedureName) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item;
}

export function resolveImcConsentPackage(
  items: ImcConsentCatalogItem[],
  procedureName: string,
): ImcConsentPackage {
  const activeItems = items.filter((item) => item.status === "ACTIVE");

  const procedureConsent = bestMatch(
    activeItems,
    procedureName,
    (item) => item.templateType === "PROCEDURE_CONSENT" && !item.isAnesthesia,
  );

  const patientEducation = bestMatch(
    activeItems,
    procedureName,
    (item) => item.templateType === "PATIENT_EDUCATION" || item.isPatientCopy,
  );

  const anesthesiaConsent =
    activeItems.find((item) => item.id === "anesthesia-patient-consent") ||
    activeItems.find(
      (item) => item.templateType === "ANESTHESIA_CONSENT" && item.titleEn.toLowerCase().includes("anesthesia"),
    ) ||
    activeItems.find((item) => item.templateType === "ANESTHESIA_CONSENT");

  const anesthesiaEducation =
    activeItems.find((item) => item.id === "consent-for-anesthesia-patient-education") ||
    activeItems.find((item) => item.templateType === "ANESTHESIA_EDUCATION");

  return {
    procedureConsent,
    patientEducation,
    anesthesiaConsent,
    anesthesiaEducation,
    matches: [procedureConsent, patientEducation, anesthesiaConsent, anesthesiaEducation].filter(
      Boolean,
    ) as ImcConsentCatalogItem[],
  };
}
