import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ImcConsentCatalogItem,
  resolveImcConsentPackage,
} from "@/lib/informed-consents/imcConsentResolver";

async function loadItems(): Promise<ImcConsentCatalogItem[]> {
  const manifestPath = path.join(
    process.cwd(),
    "public",
    "imc-consent-library",
    "imc-consent-catalog.manifest.json",
  );

  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as ImcConsentCatalogItem[];
}

export async function GET(request: NextRequest) {
  const procedure = request.nextUrl.searchParams.get("procedure") || "";

  if (!procedure.trim()) {
    return NextResponse.json(
      { ok: false, message: "procedure query parameter is required" },
      { status: 400 },
    );
  }

  const items = await loadItems();
  const consentPackage = resolveImcConsentPackage(items, procedure);

  return NextResponse.json({
    ok: true,
    procedure,
    package: consentPackage,
  });
}
