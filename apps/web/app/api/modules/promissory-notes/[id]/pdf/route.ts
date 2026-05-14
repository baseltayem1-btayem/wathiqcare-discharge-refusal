import { type NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import {
  buildPromissoryNoteDocumentData,
  buildPromissoryNoteQrPayload,
  buildPromissoryPdfFilename,
} from "@/lib/promissory-note-document-data";
import { buildPromissoryPdfHtml, getEmbeddedArabicFontCss } from "@/lib/server/promissory-note-pdf";

const prisma = getPrisma();
const IMC_LOGO_URL = "https://www.imc.med.sa/images/logo.jpg";

function buildAttachmentHeader(filename: string): string {
  const trimmed = filename.trim();
  const normalized = (trimmed || "promissory-note.pdf")
    .replace(/[\r\n"]/g, "_")
    .replace(/[;\\]/g, "_")
    .replace(/\.\.+/g, ".")
    .replace(/^\.+/, "")
    .slice(0, 160);
  const safeFilename = normalized || "promissory-note.pdf";
  const encoded = encodeURIComponent(safeFilename);
  return `attachment; filename="${safeFilename}"; filename*=UTF-8''${encoded}`;
}

function resolveVerificationBaseUrl(request: NextRequest): string | undefined {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin;
      }
    } catch {
      // Ignore invalid environment value and fall back to request origin.
    }
  }

  try {
    const parsed = new URL(request.nextUrl.origin);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.origin;
    }
  } catch {
    // no-op
  }

  return undefined;
}

async function launchBrowser(): Promise<Browser> {
  const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"];
  const defaultOptions: LaunchOptions = { headless: true, args: defaultArgs };

  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (configuredPath && existsSync(configuredPath)) {
    try {
      return await puppeteer.launch({ ...defaultOptions, executablePath: configuredPath });
    } catch {
      // Fall back to bundled/runtime executable.
    }
  }

  try {
    return await puppeteer.launch(defaultOptions);
  } catch {
    const executablePath = await chromium.executablePath();
    return await puppeteer.launch({
      ...defaultOptions,
      executablePath,
      args: [...chromium.args, ...defaultArgs],
    });
  }
}

async function resolveImcLogoSource(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(IMC_LOGO_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!response.ok) {
      return IMC_LOGO_URL;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      return IMC_LOGO_URL;
    }

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return IMC_LOGO_URL;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let browser: Browser | null = null;

  try {
    const auth = await requireModuleOperationalAccess(request, "promissory-notes");
    const { id } = await params;
    const requestedLang = request.nextUrl.searchParams.get("lang");
    const lang: "ar" | "en" = requestedLang === "en" ? "en" : "ar";

    if (!auth.tenant_id) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
    }

    const note = await prisma.promissoryNote.findFirst({
      where: { id, tenantId: auth.tenant_id },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            patientName: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Promissory note not found" }, { status: 404 });
    }

    const noteData = buildPromissoryNoteDocumentData({
      id: note.id,
      noteNumber: note.noteNumber,
      debtorName: note.debtorName,
      debtorIdNumber: note.debtorIdNumber,
      issuerName: note.issuerName,
      amount: Number(note.amount),
      currency: note.currency,
      dueDate: note.dueDate.toISOString(),
      createdAt: note.createdAt.toISOString(),
      status: note.status,
      metadata: (note.metadata as Record<string, unknown> | null) ?? null,
      case: note.case
        ? {
          id: note.case.id,
          caseNumber: note.case.caseNumber,
          patientName: note.case.patientName,
        }
        : null,
    }, {
      language: lang,
      verificationBaseUrl: resolveVerificationBaseUrl(request),
    });

    const qrPayload = buildPromissoryNoteQrPayload(noteData);
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
    });

    noteData.qrDataUrl = qrDataUrl;

    const logoSrc = await resolveImcLogoSource();
    const embeddedArabicFontCss = await getEmbeddedArabicFontCss();
    const html = buildPromissoryPdfHtml({
      logoSrc,
      noteData,
      embeddedArabicFontCss,
    });

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await page.close();

    const filename = buildPromissoryPdfFilename(note.noteNumber, note.id, lang);
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildAttachmentHeader(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("GET /api/modules/promissory-notes/[id]/pdf", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // no-op
      }
    }
  }
}
