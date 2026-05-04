import { expect, test, type Locator, type Page } from "@playwright/test";

const CASE_WORKSPACE_URL = process.env.CASE_WORKSPACE_URL;
const HAS_AUTH_CASE_URL =
  Boolean(CASE_WORKSPACE_URL) &&
  !String(CASE_WORKSPACE_URL).includes("[REAL_CASE_ID]");

const MOBILE_VIEWPORT = { width: 390, height: 844 };

function tabLocator(page: Page, key: "supporting-evidence" | "documents" | "compliance"): Locator {
  return page.getByTestId(`case-tab-${key}`);
}

function accordionButton(page: Page, controlsId: string): Locator {
  return page.locator(`button[aria-controls=\"${controlsId}\"]`);
}

async function openWorkspace(page: Page): Promise<void> {
  if (!HAS_AUTH_CASE_URL) {
    test.skip(true, "Set CASE_WORKSPACE_URL to a real /cases/{id} URL for authenticated case workspace smoke tests.");
  }

  await page.goto(CASE_WORKSPACE_URL!, { waitUntil: "domcontentloaded" });
  await expect(tabLocator(page, "supporting-evidence")).toBeVisible();
}

async function gotoTab(page: Page, key: "supporting-evidence" | "documents" | "compliance"): Promise<void> {
  await tabLocator(page, key).click();
  await expect(tabLocator(page, key)).toHaveAttribute("data-state", "active");
}

async function expectButtonVisibleByTestIdOrLabel(
  page: Page,
  options: { testId?: string; ariaLabel?: string; textName?: string },
): Promise<Locator> {
  if (options.testId) {
    const byTestId = page.getByTestId(options.testId);
    if (await byTestId.count()) {
      await expect(byTestId).toBeVisible();
      return byTestId;
    }
  }

  if (options.ariaLabel) {
    const byAriaLabel = page.getByLabel(options.ariaLabel, { exact: true });
    await expect(byAriaLabel).toBeVisible();
    return byAriaLabel;
  }

  if (options.textName) {
    const byRoleName = page.getByRole("button", { name: options.textName });
    await expect(byRoleName).toBeVisible();
    return byRoleName;
  }

  throw new Error("No stable locator strategy provided for button assertion.");
}

async function expectToastOrBlockedState(page: Page): Promise<void> {
  const candidateToast = page
    .locator("[role='status'], [role='alert'], [data-sonner-toaster] [data-visible='true']")
    .first();
  const blockedBanner = page.locator("text=This action is blocked because:").first();

  const toastVisible = await candidateToast.isVisible().catch(() => false);
  const blockedVisible = await blockedBanner.isVisible().catch(() => false);

  expect(toastVisible || blockedVisible).toBeTruthy();
}

test.describe("Case Workspace Smoke - Auth Optional Gate", () => {
  test("redirects or blocks when unauthenticated route is opened directly", async ({ page }) => {
    if (HAS_AUTH_CASE_URL) {
      test.skip(true, "Auth URL configured; unauthenticated guard check is not required in this run.");
    }

    await page.goto("/cases/e2e-smoke-no-auth", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);

    const redirectedToLogin = /\/login(\?.*)?$/i.test(new URL(page.url()).pathname + new URL(page.url()).search);
    const hasInvalidCaseMessage = await page.getByText("Invalid case route.").isVisible().catch(() => false);
    expect(redirectedToLogin || hasInvalidCaseMessage).toBeTruthy();
  });
});

test.describe("Case Workspace Smoke - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkspace(page);
  });

  test.afterEach(async ({ page }) => {
    await page.removeAllListeners("dialog");
  });

  test("tab navigation loads each panel and updates active content", async ({ page }) => {
    await gotoTab(page, "supporting-evidence");
    await expectButtonVisibleByTestIdOrLabel(page, { textName: "Review / مراجعة" });

    await gotoTab(page, "documents");
    await expect(page.getByTestId("case-action-upload-document")).toBeVisible();
    await expectButtonVisibleByTestIdOrLabel(page, { ariaLabel: "View supporting documents" });

    await gotoTab(page, "compliance");
    await expectButtonVisibleByTestIdOrLabel(page, { ariaLabel: "Generate final legal PDF" });

    await gotoTab(page, "supporting-evidence");
    await expectButtonVisibleByTestIdOrLabel(page, { ariaLabel: "Open checklist" });
  });

  test("accordion defaults and aria-expanded state toggle correctly", async ({ page }) => {
    const currentNext = accordionButton(page, "accordion-section-current-next");
    const sidebarSummary = accordionButton(page, "accordion-section-sidebar-summary");

    await expect(currentNext).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#accordion-section-current-next")).toBeVisible();

    await currentNext.click();
    await expect(currentNext).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#accordion-section-current-next")).toHaveCount(0);

    await expect(sidebarSummary).toHaveAttribute("aria-expanded", "false");
    await sidebarSummary.click();
    await expect(sidebarSummary).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#accordion-section-sidebar-summary")).toBeVisible();
  });

  test("supporting evidence tab exposes review/checklist actions", async ({ page }) => {
    await gotoTab(page, "supporting-evidence");

    await expectButtonVisibleByTestIdOrLabel(page, { textName: "Review / مراجعة" });
    await expectButtonVisibleByTestIdOrLabel(page, { ariaLabel: "Open related step" });
    await expectButtonVisibleByTestIdOrLabel(page, { ariaLabel: "Open checklist" });
  });

  test("documents tab exposes document workflow actions", async ({ page }) => {
    await gotoTab(page, "documents");

    const uploadButton = await expectButtonVisibleByTestIdOrLabel(page, {
      testId: "case-action-upload-document",
      ariaLabel: "Upload document",
    });
    await uploadButton.click({ trial: true });

    await expectButtonVisibleByTestIdOrLabel(page, { ariaLabel: "Link document to case" });
    await expectButtonVisibleByTestIdOrLabel(page, { ariaLabel: "View supporting documents" });
    await expectButtonVisibleByTestIdOrLabel(page, { testId: "case-action-generate-package", ariaLabel: "Generate legal package" });
  });

  test("compliance tab exposes readiness/PDF/signature actions", async ({ page }) => {
    await gotoTab(page, "compliance");

    await expectButtonVisibleByTestIdOrLabel(page, {
      testId: "case-action-complete-readiness",
      ariaLabel: "Complete readiness",
    });
    await expectButtonVisibleByTestIdOrLabel(page, {
      testId: "case-action-generate-final-pdf",
      ariaLabel: "Generate final legal PDF",
    });
    await expectButtonVisibleByTestIdOrLabel(page, { ariaLabel: "Open related guided steps" });

    await expect(page.getByTestId("case-action-open-pdf-filler")).toBeVisible();
    await expect(page.getByTestId("case-action-preview-pdf")).toBeVisible();
    await expect(page.getByTestId("case-action-copy-signature-link")).toBeVisible();
    await expect(page.getByTestId("case-action-send-signature-email")).toBeVisible();
  });

  test("mobile sticky bottom bar is fixed, visible, and all step buttons are clickable", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await expect(page.getByTestId("case-action-prev-step")).toBeVisible();

    const stickyBar = page.locator("div.fixed.inset-x-0.bottom-0.pointer-events-none").first();
    await expect(stickyBar).toBeVisible();
    await expect(stickyBar).toHaveCSS("position", "fixed");

    const actionIds = [
      "case-action-prev-step",
      "case-action-open-workflow-steps",
      "case-action-go-to-step",
      "case-action-next-step",
    ];

    for (const id of actionIds) {
      const button = page.getByTestId(id);
      await expect(button).toBeVisible();
      await button.click({ trial: true });
    }

    const hasOverlap = await page.evaluate((ids) => {
      function overlap(a: DOMRect, b: DOMRect): boolean {
        return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      }

      const rects = ids
        .map((id) => document.querySelector(`[data-testid=\"${id}\"]`) as HTMLElement | null)
        .filter((el): el is HTMLElement => Boolean(el))
        .map((el) => el.getBoundingClientRect());

      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          if (overlap(rects[i], rects[j])) {
            return true;
          }
        }
      }
      return false;
    }, actionIds);

    expect(hasOverlap).toBeFalsy();
  });

  test("PDF generation action reports success or blocked state", async ({ page }) => {
    await gotoTab(page, "compliance");

    const finalPdfButton = await expectButtonVisibleByTestIdOrLabel(page, {
      testId: "case-action-generate-final-pdf",
      ariaLabel: "Generate final legal PDF",
    });

    const wasDisabled = await finalPdfButton.isDisabled();
    if (wasDisabled) {
      await expect(finalPdfButton).toBeDisabled();
      return;
    }

    const beforeVersionCount = await page.locator("text=/v\\d+\\s*[•-]/").count();
    await finalPdfButton.click();

    await expectToastOrBlockedState(page);

    const afterVersionCount = await page.locator("text=/v\\d+\\s*[•-]/").count();
    expect(afterVersionCount).toBeGreaterThanOrEqual(beforeVersionCount);
  });

  test("signature link actions handle copy and send-email prompt flow", async ({ page }) => {
    await gotoTab(page, "compliance");

    const copyButton = page.getByTestId("case-action-copy-signature-link");
    await expect(copyButton).toBeVisible();

    if (!(await copyButton.isDisabled())) {
      await copyButton.click();
      await expectToastOrBlockedState(page);
    }

    const sendButton = page.getByTestId("case-action-send-signature-email");
    await expect(sendButton).toBeVisible();

    if (await sendButton.isDisabled()) {
      await expect(sendButton).toBeDisabled();
      return;
    }

    const dialogPromise = page.waitForEvent("dialog");
    await sendButton.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(/email|البريد/i);
    await dialog.accept("qa-smoke@example.com");

    await expectToastOrBlockedState(page);
  });

  test("accordion accessibility attributes and controlled regions are valid", async ({ page }) => {
    const accordionButtons = page.locator("button[aria-controls^='accordion-section-']");
    const count = await accordionButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let index = 0; index < count; index += 1) {
      const button = accordionButtons.nth(index);
      await expect(button).toHaveAttribute("aria-expanded", /^(true|false)$/);

      const controls = await button.getAttribute("aria-controls");
      expect(controls).toBeTruthy();

      const expanded = (await button.getAttribute("aria-expanded")) === "true";
      const region = page.locator(`#${controls}`);
      if (expanded) {
        await expect(region).toBeVisible();
        await expect(region).toHaveAttribute("role", "region");
      }
    }
  });

  test("buttons have accessible names and keyboard tab navigation moves focus", async ({ page }) => {
    const unnamedButtonCount = await page.locator("button:visible:not([aria-label])").evaluateAll((buttons) => {
      return buttons.filter((button) => {
        const text = button.textContent?.trim() ?? "";
        return text.length === 0;
      }).length;
    });
    expect(unnamedButtonCount).toBe(0);

    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el?.getAttribute("data-testid") || el?.getAttribute("aria-label") || el?.textContent?.trim() || "";
    });
    expect(firstFocused.length).toBeGreaterThan(0);

    await page.keyboard.press("Tab");
    const secondFocused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el?.getAttribute("data-testid") || el?.getAttribute("aria-label") || el?.textContent?.trim() || "";
    });
    expect(secondFocused.length).toBeGreaterThan(0);
    expect(secondFocused).not.toEqual(firstFocused);
  });

  test("mobile responsiveness: no horizontal overflow, 44px targets, sticky bar does not block end content", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    const hasHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    const mobileButtonTestIds = [
      "case-action-prev-step",
      "case-action-open-workflow-steps",
      "case-action-go-to-step",
      "case-action-next-step",
    ];

    for (const id of mobileButtonTestIds) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const readinessCard = page.locator("#section-readiness");
    await readinessCard.scrollIntoViewIfNeeded();

    const coveredByStickyBar = await page.evaluate(() => {
      const sticky = document.querySelector("div.fixed.inset-x-0.bottom-0") as HTMLElement | null;
      const section = document.querySelector("#section-readiness") as HTMLElement | null;
      if (!sticky || !section) {
        return false;
      }

      const stickyRect = sticky.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      return sectionRect.bottom > stickyRect.top && sectionRect.top < stickyRect.top;
    });

    expect(coveredByStickyBar).toBeFalsy();
  });
});
