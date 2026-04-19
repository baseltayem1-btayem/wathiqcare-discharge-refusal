const path = require("path");
const fs = require("fs");

function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(process.cwd(), "apps", "web", ".env.local"));

const { PrismaClient } = require(path.join(process.cwd(), "node_modules", "@prisma", "client"));
const prisma = new PrismaClient();

(async () => {
  try {
    // Step 1: Login
    const t0 = Date.now();
    const loginResp = await fetch("http://localhost:3111/api/auth/password/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@wathiqcare.online", password: "Admin@Wathiqcare2026!" }),
    });
    const loginMs = Date.now() - t0;
    const setCookie = loginResp.headers.get("set-cookie") || "";
    const cookie = setCookie.split(",")[0].split(";")[0];
    const loginBody = await loginResp.text();

    console.log("LOGIN_STATUS=" + loginResp.status + " MS=" + loginMs);
    console.log("HAS_COOKIE=" + (cookie.length > 0));

    if (loginResp.status >= 300) {
      console.log("LOGIN_BODY=" + loginBody.substring(0, 300));
      return;
    }

    // Step 2: Find a case
    const recentCase = await prisma.case.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, caseNumber: true },
    });
    if (!recentCase) { console.log("NO_CASE_FOUND"); return; }
    console.log("CASE=" + recentCase.caseNumber + " ID=" + recentCase.id);

    // Step 3: Load case page
    const pageT0 = Date.now();
    const pageResp = await fetch("http://localhost:3111/cases/" + recentCase.id, {
      headers: { cookie },
    });
    const pageMs = Date.now() - pageT0;
    const pageText = await pageResp.text();

    console.log("CASE_PAGE_STATUS=" + pageResp.status + " MS=" + pageMs);
    console.log("GUIDANCE_VISIBLE=" + pageText.includes("IMC Case Workspace Guidance"));

    // Check for the flag in HTML
    const hasFlag = pageText.includes("ENABLE_WORKFLOW_GUIDANCE") || pageText.includes("workspaceGuidance");
    console.log("GUIDANCE_FLAG_IN_HTML=" + hasFlag);

    if (!pageText.includes("IMC Case Workspace Guidance")) {
      // Show a debug snippet
      const idx = pageText.indexOf("Guidance");
      if (idx >= 0) {
        console.log("GUIDANCE_SNIPPET=" + pageText.substring(Math.max(0, idx - 80), idx + 120));
      } else {
        console.log("NO_GUIDANCE_KEYWORD_IN_PAGE (first 500 chars): " + pageText.substring(0, 500));
      }
    }
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => console.log("ERROR=" + String(e && e.message ? e.message : e)));
