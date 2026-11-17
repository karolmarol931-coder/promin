import { test, expect } from "@editor/tests/helpers/stub-test-base";
import { installTauri } from "@editor/tests/helpers/tauriDiskStub";
import type { Page } from "@playwright/test";
import path from "path";

const FIXTURES_DIR = path.join(import.meta.dirname, "../test-fixtures");
const SAMPLE_PDF = path.join(FIXTURES_DIR, "sample.pdf");
const sidebar = '[data-sidebar="file-sidebar"]';

test.use({ autoGoto: false });

async function openEditor(page: Page) {
  await installTauri(page);
  await page.goto("/editor");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /start|начать/i })
    .click();
}

test.describe("PDF Library cleanup", () => {
  test("opens Recents from the File library action in quick navigation", async ({
    page,
  }) => {
    await openEditor(page);
    await expect(
      page.locator(sidebar).getByTestId("my-files-button"),
    ).toHaveCount(0);

    await page.getByTestId("my-files-button").click();
    await expect(page).toHaveURL(/\/files\?view=recent$/);
    await expect(
      page.locator('.files-page-view-tabs button[aria-pressed="true"]'),
    ).toHaveText(/Recents|Недавние/i);
  });

  test("opens all sidebar files in Recents after importing a file", async ({
    page,
  }) => {
    await openEditor(page);

    await page.locator('[data-testid="file-input"]').setInputFiles(SAMPLE_PDF);

    await expect(page.locator(".file-sidebar-file-item").first()).toBeVisible({
      timeout: 10_000,
    });

    await page.locator(sidebar).locator(".file-sidebar-view-all").click();
    await expect(page).toHaveURL(/\/files\?view=recent$/);
    await expect(
      page.locator('.files-page-view-tabs button[aria-pressed="true"]'),
    ).toHaveText(/Recents|Недавние/i);
    await expect(
      page.locator(".files-page-list-row").filter({ hasText: "sample.pdf" }),
    ).toBeVisible();
  });

  test("opens Recents from the library header after importing a file", async ({
    page,
  }) => {
    await openEditor(page);

    await page.locator('[data-testid="file-input"]').setInputFiles(SAMPLE_PDF);

    await expect(page.locator(".file-sidebar-file-item").first()).toBeVisible({
      timeout: 10_000,
    });
    const browseAllButton = page.getByTestId("open-files-page");
    await page.locator(".file-sidebar-section-header").hover();
    await expect(browseAllButton).toHaveCSS("pointer-events", "auto");
    await browseAllButton.click();

    await expect(page).toHaveURL(/\/files\?view=recent$/);
    await expect(
      page.locator('.files-page-view-tabs button[aria-pressed="true"]'),
    ).toHaveText(/Recents|Недавние/i);
    await expect(
      page.locator(".files-page-list-row").filter({ hasText: "sample.pdf" }),
    ).toBeVisible();
  });
});
