import { test, expect, type Page } from "@playwright/test";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.BASE_URL || "http://localhost:3003";
const JWT_SECRET = "d78c1dd46cb62cab2453022c6cf07ef447e5ce62a6f8da761bd137f6ff1ff6a2";
const USER_ID = "f13fd86f-2884-41da-8a3a-dc240b0d2f02";
const EMAIL = "tenant.admin@test.wathiqcare.online";
const ROLE = "tenant_admin";
const TENANT_ID = "4549ed4b-b777-4364-9235-1841c7f5cb6d";
const CASE_ID = "f7ca657b-88ac-4c45-8fc6-306cbe3b0fb9";

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signJwt(claims: Record<string, unknown>) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    ...claims,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: "wathiqcare",
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

const token = signJwt({
  sub: USER_ID,
  email: EMAIL,
  role: ROLE,
  user_type: "tenant_admin",
  tenant_id: TENANT_ID,
  tenant_code: "test-tenant",
});

async function setupContext(page: Page) {
  await page.context().addCookies([
    {
      name: "wathiqcare_access_token",
      value: token,
      domain: new URL(BASE_URL).hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

test("end-to-end promissory note issuance with signing URL", async ({ page }) => {
  await setupContext(page);

  await page.goto(`${BASE_URL}/modules/promissory-notes/enterprise`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "test-results/e2e-issuance-01-dashboard.png" });

  // Open Note Builder from sidebar
  await page.locator("aside nav").getByRole("button", { name: /بناء السند|Note Builder/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/e2e-issuance-02-note-builder.png" });

  const nextButton = page.locator("main").getByRole("button", { name: "التالي" });

  // Step through patient_visit and billing_coverage
  await nextButton.click();
  await page.waitForTimeout(300);
  await nextButton.click();
  await page.waitForTimeout(300);

  // Step 3 coverage_liability: set fields
  await page.getByLabel(/قرار التغطية|Coverage Decision/).selectOption("PATIENT_LIABILITY_CONFIRMED");
  await page.getByLabel(/سبب مسؤولية المريض|Patient Liability Reason/).selectOption("non_covered_service");
  await page.getByLabel(/مرجع المستند المؤيد|Evidence Reference/).fill("E2E-EVIDENCE-001");
  await page.getByLabel(/اعتماد مالي|Finance \/ Claims Approval/).fill("E2E-Approver");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/e2e-issuance-03-coverage.png" });
  await nextButton.click();
  await page.waitForTimeout(300);

  // Step 4 note_details: fill Case ID
  await page.getByLabel("Case ID").fill(CASE_ID);
  await page.screenshot({ path: "test-results/e2e-issuance-04-note-details.png" });
  await nextButton.click();
  await page.waitForTimeout(300);

  // Step 5 debtor_capacity: fill email/address
  await page.getByLabel(/البريد الإلكتروني|Email/).fill("debtor@example.com");
  await page.getByLabel(/العنوان الوطني|National Address/).fill("E2E Test Address");
  await page.screenshot({ path: "test-results/e2e-issuance-05-debtor.png" });
  await nextButton.click();
  await page.waitForTimeout(300);

  // Step 6 acknowledgments -> next
  await page.screenshot({ path: "test-results/e2e-issuance-06-acknowledgments.png" });
  await nextButton.click();
  await page.waitForTimeout(300);

  // Step 7 review -> next
  await page.screenshot({ path: "test-results/e2e-issuance-07-review.png" });
  await nextButton.click();
  await page.waitForTimeout(300);

  // Step 8 send_signature: click issue and capture both API responses
  await page.screenshot({ path: "test-results/e2e-issuance-08-send-signature-before.png" });

  const createPromise = page.waitForResponse(
    (response) => response.url().includes("/api/modules/promissory-notes") && response.request().method() === "POST" && !response.url().includes("/debtor-signing"),
  );
  const signingPromise = page.waitForResponse(
    (response) => response.url().includes("/debtor-signing/start") && response.request().method() === "POST",
  );

  await page.locator("main").getByRole("button", { name: /إصدار السند وإرسال رابط التوقيع|Issue Note & Send Signing Link/ }).click();

  const createResponse = await createPromise;
  const signingResponse = await signingPromise;

  await page.waitForSelector("[data-testid='enterprise-note-lifecycle-actions']", { timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/e2e-issuance-09-issued.png", fullPage: true });

  const createStatus = createResponse.status();
  const createBody = await createResponse.json();
  const signingStatus = signingResponse.status();
  const signingBody = await signingResponse.json();

  const noteId = (createBody as { id?: string }).id;
  const noteNumber = (createBody as { noteNumber?: string }).noteNumber;
  const signingUrl = (signingBody as { signingUrl?: string }).signingUrl;
  const otp = (signingBody as { otp?: string }).otp;
  const status = (signingBody as { status?: string }).status;
  const linkSmsStatus = (signingBody as { linkSmsStatus?: string }).linkSmsStatus;
  const otpSmsStatus = (signingBody as { otpSmsStatus?: string }).otpSmsStatus;

  console.log(JSON.stringify({ createStatus, createBody, signingStatus, signingBody }, null, 2));

  // Cleanup test note from database
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && noteId) {
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      await prisma.promissoryNote.delete({ where: { id: noteId } });
      console.log("Cleaned up test note:", noteId);
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    } finally {
      await prisma.$disconnect();
    }
  }

  // Assertions
  expect(createStatus).toBe(201);
  expect(signingStatus).toBe(200);
  expect(noteId).toBeTruthy();
  expect(signingUrl).toContain("/public-signing/promissory-note/");
  expect(status).toBe("PENDING_OTP");
});
