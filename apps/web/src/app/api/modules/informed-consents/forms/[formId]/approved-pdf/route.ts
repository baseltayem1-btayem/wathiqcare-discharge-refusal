import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_PUBLIC_PREFIXES = [
  "/imc-consent-library/",
  "/approved-consent-forms/",
];

type RouteContext = {
  params: Promise<{ formId: string }> | { formId: string };
};

async function resolveParams(params: RouteContext["params"]) {
  return Promise.resolve(params);
}

function resolveApprovedPdfFile(sourceUrl?: string | null):
  | { ok: true; filePath: string }
  | { ok: false; status: number; reason: string } {
  const url = typeof sourceUrl === "string" ? sourceUrl.trim() : "";

  if (!url) {
    return { ok: false, status: 404, reason: "MISSING_PDF_TEMPLATE_URL" };
  }

  if (/^https?:\/\//i.test(url)) {
    return { ok: false, status: 422, reason: "EXTERNAL_PDF_PROXY_NOT_ENABLED" };
  }

  if (!url.startsWith("/")) {
    return { ok: false, status: 422, reason: "INVALID_PUBLIC_PDF_URL" };
  }

  const pathname = url.split("?")[0] || "";
  const allowed = ALLOWED_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!allowed) {
    return { ok: false, status: 403, reason: "PDF_PUBLIC_PREFIX_NOT_ALLOWED" };
  }

  let decodedPathname = "";
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return { ok: false, status: 422, reason: "INVALID_PDF_URL_ENCODING" };
  }

  const relativePath = decodedPathname.replace(/^\/+/, "");

  if (relativePath.includes("..")) {
    return { ok: false, status: 403, reason: "PDF_PATH_TRAVERSAL_BLOCKED" };
  }

  if (path.extname(relativePath).toLowerCase() !== ".pdf") {
    return { ok: false, status: 415, reason: "APPROVED_SOURCE_IS_NOT_PDF" };
  }

  const publicRoots = [
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "apps", "web", "public"),
    path.resolve(process.cwd(), "..", "public"),
  ];

  for (const root of publicRoots) {
    const candidate = path.resolve(root, relativePath);

    if (!candidate.startsWith(root + path.sep)) {
      continue;
    }

    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { ok: true, filePath: candidate };
      }
    } catch {
      continue;
    }
  }

  return { ok: false, status: 404, reason: "APPROVED_PDF_FILE_NOT_FOUND" };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { formId } = await resolveParams(context.params);
  const normalizedFormId = String(formId || "").trim();

  if (!normalizedFormId) {
    return NextResponse.json({ ok: false, error: "Missing formId" }, { status: 400 });
  }

  const prisma = getPrisma();

  const form = await prisma.consentForm.findFirst({
    where: {
      id: normalizedFormId,
      tenantId,
      status: { in: ["APPROVED", "ACTIVE"] },
    },
    select: {
      id: true,
      tenantId: true,
      code: true,
      titleEn: true,
      status: true,
      version: true,
      pdfTemplateUrl: true,
    },
  });

  if (!form) {
    return NextResponse.json({ ok: false, error: "Approved consent form not found" }, { status: 404 });
  }

  const resolved = resolveApprovedPdfFile(form.pdfTemplateUrl);

  if (!resolved.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Approved PDF source unavailable",
        reason: resolved.reason,
        formId: form.id,
        code: form.code,
        pdfTemplateUrl: form.pdfTemplateUrl,
      },
      { status: resolved.status },
    );
  }

  const fileBuffer = fs.readFileSync(resolved.filePath);
  const fileName = path.basename(resolved.filePath);

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}