import path from "node:path";
import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { renderImcApprovedDoctorDraftPdf, launchOverlayBrowser } from "@/lib/server/imc-approved-pdf-template-engine";
import { isAcroFormBackedTemplate } from "@/lib/server/acroform/acroform-template-identity";
import {
  renderAcroFormFilledDraftPreview,
  sha256Hex,
  type AcroFormFilledDraftRequest,
} from "@/lib/server/acroform/filled-draft-preview-service";

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
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
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

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function readOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function parseAcroFormFilledDraftRequest(
  formId: string,
  body: Record<string, unknown>,
): { request: AcroFormFilledDraftRequest; missing: string[] } {
  const approvedPdfUrl = readString(body.approvedPdfUrl) || readString(body.pdfUrl);
  const doctorCompletionValues = readOptionalRecord(body.doctorCompletionValues) ?? readOptionalRecord(body.values) ?? {};
  const patientDisplayRecord = readOptionalRecord(body.patientDisplay);
  const physicianContextRecord = readOptionalRecord(body.physicianContext);
  const encounterReferenceRecord = readOptionalRecord(body.encounterReference);
  const manifestHash = readString(body.manifestHash);

  const missing: string[] = [];
  if (!approvedPdfUrl) missing.push("approvedPdfUrl");
  if (!patientDisplayRecord) missing.push("patientDisplay");
  if (!physicianContextRecord) missing.push("physicianContext");
  if (!manifestHash) missing.push("manifestHash");

  const patientName = readString(patientDisplayRecord?.name);
  const patientMrn = readString(patientDisplayRecord?.mrn);
  if (patientDisplayRecord && !patientName) missing.push("patientDisplay.name");
  if (patientDisplayRecord && !patientMrn) missing.push("patientDisplay.mrn");

  const physicianName = readString(physicianContextRecord?.name);
  if (physicianContextRecord && !physicianName) missing.push("physicianContext.name");

  const request: AcroFormFilledDraftRequest = {
    formId,
    approvedPdfUrl,
    doctorCompletionValues,
    patientDisplay: {
      name: patientName,
      mrn: patientMrn,
      dob: readOptionalString(patientDisplayRecord?.dob),
    },
    physicianContext: {
      name: physicianName,
      designation: readOptionalString(physicianContextRecord?.designation) ?? readOptionalString(physicianContextRecord?.specialty),
    },
    encounterReference: encounterReferenceRecord
      ? {
          id: readOptionalString(encounterReferenceRecord.id),
          encounterId: readOptionalString(encounterReferenceRecord.encounterId),
        }
      : undefined,
    manifestHash,
    correlationId: readOptionalString(body.correlationId),
  };

  return { request, missing };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { formId } = await Promise.resolve(params);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  // AcroForm-backed forms (e.g. IMC MR 1135) use the verified manifest and the
  // field-addressed renderer. All other forms keep the coordinate-based path.
  if (isAcroFormBackedTemplate(formId)) {
    const { request: draftRequest, missing } = parseAcroFormFilledDraftRequest(formId, body);

    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const pdfBytes = await readPublicPdf(draftRequest.approvedPdfUrl);
    if (!pdfBytes) {
      return NextResponse.json(
        { ok: false, error: "Approved PDF source could not be loaded for draft overlay" },
        { status: 404 },
      );
    }

    let browser;
    try {
      browser = await launchOverlayBrowser();
      const rendered = await renderAcroFormFilledDraftPreview({
        request: draftRequest,
        browser,
        canonicalPdfBytes: pdfBytes,
        canonicalPdfHash: sha256Hex(pdfBytes),
      });

      return new NextResponse(Buffer.from(rendered.bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Cache-Control": "no-store",
          "X-WathiqCare-Draft-Overlay": "true",
          "X-WathiqCare-Pdf-Engine": "field-addressed-acroform",
          "X-WathiqCare-Draft-Fingerprint": rendered.fingerprint,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate filled draft preview";
      const status = (error as { status?: number }).status || 500;
      return NextResponse.json({ ok: false, error: message }, { status });
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  const approvedPdfUrl = readString(body.approvedPdfUrl) || readString(body.pdfUrl);
  const values = readRecord(body.doctorCompletionValues) || readRecord(body.values) || {};
  const physicianSignatureDataUrl = readString(body.physicianSignatureDataUrl);

  if (!approvedPdfUrl) {
    return NextResponse.json({ ok: false, error: "approvedPdfUrl is required" }, { status: 400 });
  }

  const pdfBytes = await readPublicPdf(approvedPdfUrl);
  if (!pdfBytes) {
    return NextResponse.json({ ok: false, error: "Approved PDF source could not be loaded for draft overlay" }, { status: 404 });
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
    },
  });
}
