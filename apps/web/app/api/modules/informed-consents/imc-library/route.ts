import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

type ImcConsentCatalogItem = {
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

async function loadManifest() {
  const candidates = [
    path.join(process.cwd(), "public", "imc-consent-library", "imc-consent-catalog.manifest.json"),
    path.join(process.cwd(), "apps", "web", "public", "imc-consent-library", "imc-consent-catalog.manifest.json"),
  ];

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf8");
      return {
        raw,
        pathUsed: candidate,
        candidates,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `IMC manifest not found. Checked: ${candidates.join(" | ")}. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export async function GET() {
  try {
    const { raw, pathUsed, candidates } = await loadManifest();
    const cleanRaw = raw.replace(/^\uFEFF/, "");
    const items = JSON.parse(cleanRaw) as ImcConsentCatalogItem[];

    const activeItems = items.filter((item) => item.status === "ACTIVE");

    return NextResponse.json({
      ok: true,
      source: "IMC_APPROVED_PDF_LIBRARY",
      pathUsed,
      candidates,
      total: activeItems.length,
      anesthesia: activeItems.filter((item) => item.isAnesthesia).length,
      education: activeItems.filter((item) => item.isEducation || item.isPatientCopy).length,
      procedureConsents: activeItems.filter((item) => item.templateType === "PROCEDURE_CONSENT").length,
      items: activeItems,
    });
  } catch (error) {
    console.error("[imc-library] Failed to load IMC consent catalog", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to load IMC consent catalog",
        detail: error instanceof Error ? error.message : String(error),
        cwd: process.cwd(),
      },
      { status: 500 },
    );
  }
}

