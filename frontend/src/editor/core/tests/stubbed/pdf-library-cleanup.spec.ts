import { test, expect } from "@editor/tests/helpers/stub-test-base";
import path from "path";

const FIXTURES_DIR = path.join(import.meta.dirname, "../test-fixtures");
const SAMPLE_PDF = path.join(FIXTURES_DIR, "sample.pdf");
const sidebar = '[data-sidebar="file-sidebar"]';

test.describe("PDF Library cleanup", () => {
  test("keeps the File library action in quick navigation instead of duplicating it", async ({
    page,
  }) => {
    await page.goto("/editor");
    await expect(
      page.locator(sidebar).getByTestId("my-files-button"),
    ).toHaveCount(0);

    await page.getByTestId("my-files-button").click();
    await expect(page).toHaveURL(/\/files(?:$|[/?#])/);
  });

  test("opens all sidebar files in Recents after importing a file", async ({
    page,
  }) => {
    await page.goto("/editor");

    const chooser = page.waitForEvent("filechooser");
    await page.getByTestId("files-button").click();
    await (await chooser).setFiles(SAMPLE_PDF);

    await expect(page.locator(".file-sidebar-file-item").first()).toBeVisible({
      timeout: 10_000,
    });

    await page.locator(sidebar).locator(".file-sidebar-view-all").click();
    await expect(page).toHaveURL(/\/files\?view=recent$/);
    await expect(
      page.getByRole("button", { name: "Recents", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
