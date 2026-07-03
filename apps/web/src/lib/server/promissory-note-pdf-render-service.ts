import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import QRCode from "qrcode";
import type { Browser, LaunchOptions } from "puppeteer";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import type { AuthContext } from "@/lib/server/auth";
import {
  buildPromissoryPdfHtml,
  getEmbeddedArabicFontCss,
} from "@/lib/server/promissory-note-pdf";
import type { PromissoryNoteData } from "@/components/modules/PromissoryNoteDocument";

let sharedPdfBrowserPromise: Promise<Browser> | null = null;

function getRequestBaseUrl(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_PUBLIC_URL ||
    "https://wathiqcare.online"
  ).replace(/\/$/, "");
}

async function launchPdfBrowser(): Promise<Browser> {
  const defaultLaunchOptions: LaunchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  };

  const configuredExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (configuredExecutablePath) {
    try {
      return await puppeteer.launch({
        ...defaultLaunchOptions,
        executablePath: configuredExecutablePath,
      });
    } catch (error) {
      console.warn("Failed to launch with configured Puppeteer executable path:", error);
    }
  }

  try {
    return await puppeteer.launch(defaultLaunchOptions);
  } catch {
    const executablePath = await chromium.executablePath();
    return await puppeteer.launch({
      ...defaultLaunchOptions,
      executablePath,
      args: [...chromium.args, ...(defaultLaunchOptions.args ?? [])],
      headless: true,
    });
  }
}

async function renderPdfBuffer(html: string): Promise<Buffer> {
  if (!sharedPdfBrowserPromise) {
    sharedPdfBrowserPromise = launchPdfBrowser();
  }

  const browser = await sharedPdfBrowserPromise;

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" as "load" });
    const rendered = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    });
    await page.close();
    return Buffer.from(rendered);
  } catch (error) {
    if (sharedPdfBrowserPromise) {
      try {
        const currentBrowser = await sharedPdfBrowserPromise;
        await currentBrowser.close();
      } catch {
        // ignore
      }
      sharedPdfBrowserPromise = null;
    }
    throw error;
  }
}

export async function generatePromissoryNotePdf(
  auth: AuthContext,
  noteId: string,
  options: {
    locale?: "ar" | "en";
    request: NextRequest;
  },
): Promise<{ buffer: Buffer; noteNumber: string; filename: string }> {
  const tenantId = auth.tenant_id;
  if (!tenantId) {
    throw new ApiError(403, "Tenant context is required");
  }

  const prisma = getPrisma();
  const note = await prisma.promissoryNote.findFirst({
    where: { id: noteId, tenantId },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          patientName: true,
          patientIdNumber: true,
          medicalRecordNo: true,
        },
      },
    },
  });

  if (!note) {
    throw new ApiError(404, "Promissory note not found");
  }

  const locale = options.locale === "en" ? "en" : "ar";
  const baseUrl = getRequestBaseUrl(options.request);
  const logoSrc = `${baseUrl}/images/imc-logo.png`;

  const metadata = (note.metadata ?? {}) as Record<string, unknown>;
  const noteMeta = (metadata.note ?? {}) as Record<string, unknown>;
  const coverageDecision = (metadata.coverageLiabilityDecision ?? {}) as Record<string, unknown>;

  const issueDate = noteMeta.issueDate
    ? String(noteMeta.issueDate)
    : note.createdAt.toISOString().slice(0, 10);
  const dueDate = noteMeta.dueDate
    ? String(noteMeta.dueDate)
    : issueDate;
  const issueCity = noteMeta.issueCity ? String(noteMeta.issueCity) : undefined;
  const paymentCity = noteMeta.paymentCity ? String(noteMeta.paymentCity) : undefined;

  const reason = coverageDecision.decisionLabelAr
    ? String(coverageDecision.decisionLabelAr)
    : undefined;

  const verificationUrl = `${baseUrl}/public-signing/promissory-note/${crypto.randomUUID()}?lang=${locale}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 256,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const noteData: PromissoryNoteData = {
    noteNumber: note.noteNumber,
    amount: Number(note.amount),
    currency: note.currency,
    dueDate,
    issueDate,
    issueCity,
    paymentCity,
    debtorName: note.debtorName ?? undefined,
    debtorId: note.debtorIdNumber ?? undefined,
    creditorName: note.issuerName ?? undefined,
    creditorCR: undefined,
    reason,
    referenceNumber: note.noteNumber,
    statusCode: note.status,
    qrDataUrl,
    verificationUrl,
    language: locale,
  };

  const embeddedArabicFontCss = await getEmbeddedArabicFontCss();
  const html = buildPromissoryPdfHtml({ logoSrc, noteData, embeddedArabicFontCss });
  const buffer = await renderPdfBuffer(html);

  const filename = `promissory-note-${note.noteNumber}-${locale}.pdf`;
  return { buffer, noteNumber: note.noteNumber, filename };
}
