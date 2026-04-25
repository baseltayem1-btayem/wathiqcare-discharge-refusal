import { expect, test } from "@playwright/test";

const CASE_WORKSPACE_URL = process.env.CASE_WORKSPACE_URL;

test.describe("Case Workspace Functional Activation", () => {
  test.skip(!CASE_WORKSPACE_URL, "Set CASE_WORKSPACE_URL to run authenticated smoke checks.");

  test("tabs, workflow actions, and mobile clickability", async ({ page }) => {
    await page.goto(CASE_WORKSPACE_URL || "/", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("case-tab-supporting-evidence")).toBeVisible();
    await expect(page.getByTestId("case-tab-documents")).toBeVisible();
    await expect(page.getByTestId("case-tab-compliance")).toBeVisible();

    await page.getByTestId("case-tab-documents").click();
    await expect(page.getByTestId("case-action-upload-document")).toBeVisible();

    await page.getByTestId("case-tab-compliance").click();
    await expect(page.getByRole("button", { name: "إصدار PDF النهائي" })).toBeVisible();

    await expect(page.getByTestId("case-action-next-step")).toBeVisible();
    await expect(page.getByTestId("case-action-prev-step")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("case-action-next-step")).toBeVisible();
    await page.getByTestId("case-action-next-step").click();
  });
});
