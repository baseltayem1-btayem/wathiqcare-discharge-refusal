import express from "express";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, type Browser } from "playwright-core";

const app = express();

app.use(express.json({ limit: "25mb" }));

const PORT = Number(process.env.PORT || 8080);
const INTERNAL_SECRET = process.env.PDF_RENDERER_SECRET || "";

async function ensureArabicFontsLoaded(): Promise<void> {
  const chromiumWithFont = chromium as unknown as {
    font?: (url: string) => Promise<void>;
  };

  if (typeof chromiumWithFont.font !== "function") {
    return;
  }

  try {
    await Promise.all([
      chromiumWithFont.font(
        "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Regular.ttf",
      ),
      chromiumWithFont.font(
        "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Bold.ttf",
      ),
      chromiumWithFont.font(
        "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf",
      ),
      chromiumWithFont.font(
        "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf",
      ),
    ]);
  } catch (error) {
    console.warn("Arabic font loading failed", error);
  }
}

type RenderRequest = {
  html?: string;
  filename?: string;
  documentId?: string;
  copyType?: string;
  lang?: string;
};

function requireInternalSecret(req: express.Request, res: express.Response): boolean {
  if (!INTERNAL_SECRET) {
    return true;
  }

  const provided = String(req.headers["x-wathiq-internal-secret"] || "");

  if (provided !== INTERNAL_SECRET) {
    res.status(401).json({ error: "Unauthorized PDF renderer request" });
    return false;
  }

  return true;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "wathiqcare-pdf-renderer",
    timestamp: new Date().toISOString()
  });
});

app.post("/render", async (req, res) => {
  if (!requireInternalSecret(req, res)) {
    return;
  }

  const body = req.body as RenderRequest;

  if (!body.html || typeof body.html !== "string") {
    res.status(400).json({ error: "HTML is required" });
    return;
  }

  const filename = (body.filename || "document.pdf").replace(/"/g, "");

  let browser: Browser | null = null;

  try {
    await ensureArabicFontsLoaded();

    browser = await playwrightChromium.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=medium",
        "--lang=ar-SA",
      ],
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage({
      viewport: {
        width: 794,
        height: 1123
      },
      deviceScaleFactor: 1
    });

    await page.setContent(body.html, {
      waitUntil: "networkidle",
    });

    await page.addStyleTag({
      content: `
        @font-face {
          font-family: "Noto Naskh Arabic";
          src: url("https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Regular.ttf") format("truetype");
          font-weight: 400;
          font-style: normal;
        }

        @font-face {
          font-family: "Noto Naskh Arabic";
          src: url("https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Bold.ttf") format("truetype");
          font-weight: 700;
          font-style: normal;
        }

        @font-face {
          font-family: "Noto Sans Arabic";
          src: url("https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf") format("truetype");
          font-weight: 400;
          font-style: normal;
        }

        @font-face {
          font-family: "Noto Sans Arabic";
          src: url("https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf") format("truetype");
          font-weight: 700;
          font-style: normal;
        }

        html,
        body,
        * {
          font-family: "Noto Naskh Arabic", "Noto Sans Arabic", Arial, sans-serif !important;
        }

        [dir="rtl"],
        .rtl,
        .cell-ar,
        .title-ar,
        .section-header-ar {
          font-family: "Noto Naskh Arabic", "Noto Sans Arabic", Arial, sans-serif !important;
          direction: rtl;
        }
      `,
    });

    await page.emulateMedia({ media: "screen" });

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "10mm",
        left: "8mm"
      }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Wathiq-Pdf-Renderer", "playwright-container");
    res.setHeader("X-Wathiq-Document-Id", body.documentId || "");
    res.setHeader("X-Wathiq-Copy-Type", body.copyType || "");
    res.setHeader("X-Wathiq-Lang", body.lang || "");

    res.send(Buffer.from(pdf));
  } catch (error) {
    console.error("PDF_RENDER_FAILED", error);

    res.status(500).json({
      error: "PDF render failed",
      detail: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
});

app.listen(PORT, () => {
  console.log(`WathiqCare PDF renderer running on port ${PORT}`);
});

