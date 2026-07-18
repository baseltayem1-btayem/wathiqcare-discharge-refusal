import path from "node:path";
import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { renderImcApprovedDoctorDraftPdf } from "@/lib/server/imc-approved-pdf-template-engine";
import { IMC_APPROVED_CONSENT_FORMS_MANIFEST } from "@/lib/server/imc-approved-consent-forms.manifest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ formId: string }>;
};

const ALLOWED_PUBLIC_PREFIXES = [
  "/approved-consent-forms/",
  "/approved-consent-forms-patient-copy/",
  "/imc-consent-library/",
];

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolvePublicPdfPath(publicUrl: string): string | undefined {
  const clean = publicUrl.trim();
  if (!clean || /^https?:\/\//i.test(clean) || !clean.startsWith("/")) return undefined;
  const pathname = clean.split("?")[0] || "";
  const allowed = ALLOWED_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!allowed) return undefined;
  let decoded = "";
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const relative = decoded.replace(/^\/+/, "");
  if (relative.includes("..") || path.extname(relative).toLowerCase() !== ".pdf") return undefined;
  return relative;
}

async function readPublicPdf(publicUrl: string): Promise<Uint8Array | undefined> {
  const relative = resolvePublicPdfPath(publicUrl);
  if (!relative) return undefined;
  const candidates = [
    path.join(process.cwd(), "public", relative),
    path.join(process.cwd(), "apps", "web", "public", relative),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // Try next candidate.
    }
  }
  return undefined;
}

function resolveApprovedPdfUrlFromManifest(formId: string): string | undefined {
  const item = IMC_APPROVED_CONSENT_FORMS_MANIFEST.find(
    (candidate) => candidate.id === formId || candidate.slug === formId,
  );
  return item?.pdfUrl;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { formId } = await Promise.resolve(params);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const approvedPdfUrl =
    readString(body.approvedPdfUrl) ||
    readString(body.pdfUrl) ||
    resolveApprovedPdfUrlFromManifest(formId);
  const values = readRecord(body.doctorCompletionValues) || readRecord(body.values) || {};
  const physicianSignatureDataUrl = readString(body.physicianSignatureDataUrl);

  if (!approvedPdfUrl) {
    return NextResponse.json(
      { ok: false, error: "approvedPdfUrl is required and could not be resolved from the manifest" },
      { status: 400 },
    );
  }

  const pdfBytes = await readPublicPdf(approvedPdfUrl);
  if (!pdfBytes) {
    return NextResponse.json(
      { ok: false, error: "Approved PDF source could not be loaded for draft overlay" },
      { status: 404 },
    );
  }

  const rendered = await renderImcApprovedDoctorDraftPdf({
    pdfBytes,
    formId,
    doctorCompletionValues: values,
    physicianSignatureDataUrl,
  });

  return new NextResponse(rendered.bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "X-WathiqCare-Draft-Overlay": "true",
      "X-WathiqCare-Pdf-Engine": rendered.renderingEngine,
      "X-WathiqCare-Physician-Signature-Drawn": String(rendered.physicianSignatureDrawn),
      "X-WathiqCare-Text-Fields-Drawn": String(rendered.textFieldsDrawn),
    },
  });
}
