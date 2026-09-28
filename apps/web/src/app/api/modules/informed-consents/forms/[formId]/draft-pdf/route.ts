import path from "node:path";
import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { launchOverlayBrowser } from "@/lib/server/imc-approved-pdf-template-engine";
import { IMC_APPROVED_CONSENT_FORMS_MANIFEST } from "@/lib/server/imc-approved-consent-forms.manifest";
import { parseAcroFormFilledDraftRequest } from "@/lib/server/draft-pdf-request-parser";
import {
  renderAcroFormFilledDraftPreview,
  sha256Hex,
} from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import { resolveCanonicalAcroFormTemplateId } from "@/lib/server/acroform/acroform-template-identity";

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
    return NextResponse.json(
      { ok: false, error: "Missing tenant context" },
      { status: 400 },
    );
  }

  const { formId } = await Promise.resolve(params);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const identity = resolveCanonicalAcroFormTemplateId(formId);
  if (!identity) {
    return NextResponse.json(
      {
        ok: false,
        error: "Form identifier is not a supported AcroForm-backed consent template.",
      },
      { status: 400 },
    );
  }

  const diagnostics = getAcroFormTemplateDiagnostics(identity.canonicalFormId);

  if (diagnostics.status !== "READY" || !diagnostics.manifestHash) {
    return NextResponse.json(
      {
        ok: false,
        error:
          diagnostics.blockers?.join("; ") ||
          "AcroForm manifest is not ready for governed preview.",
      },
      { status: 422 },
    );
  }

  const approvedPdfUrl =
    readString(body.approvedPdfUrl) ||
    readString(body.pdfUrl) ||
    resolveApprovedPdfUrlFromManifest(formId);

  if (!approvedPdfUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "approvedPdfUrl is required and could not be resolved from the manifest",
      },
      { status: 400 },
    );
  }

  const canonicalPdfBytes = await readPublicPdf(approvedPdfUrl);

  if (!canonicalPdfBytes) {
    return NextResponse.json(
      {
        ok: false,
        error: "Approved PDF source could not be loaded for draft overlay",
      },
      { status: 404 },
    );
  }

  const canonicalPdfHash = sha256Hex(canonicalPdfBytes);

  const governedBody: Record<string, unknown> = {
    ...body,
    approvedPdfUrl,
    manifestHash: diagnostics.manifestHash,
  };

  const parsed = parseAcroFormFilledDraftRequest(formId, governedBody);

  if (parsed.missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Missing required draft fields: ${parsed.missing.join(", ")}`,
        missing: parsed.missing,
      },
      { status: 400 },
    );
  }

  const browser = await launchOverlayBrowser();

  try {
    const rendered = await renderAcroFormFilledDraftPreview({
      request: parsed.request,
      browser,
      canonicalPdfBytes,
      canonicalPdfHash,
    });

    return new NextResponse(Buffer.from(rendered.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "X-WathiqCare-Draft-Overlay": "true",
        "X-WathiqCare-Draft-Fingerprint": rendered.fingerprint,
        "X-WathiqCare-Draft-Flattened": String(rendered.summary.flattened),
        "X-WathiqCare-Draft-Widgets": String(rendered.summary.widgetsRendered),
      },
    });
  } finally {
    await browser.close().catch(() => {
      /* ignore close errors */
    });
  }
}
