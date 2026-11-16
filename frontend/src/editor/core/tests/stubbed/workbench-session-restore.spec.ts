import { test, expect } from "@editor/tests/helpers/stub-test-base";
import { uploadFiles } from "@editor/tests/helpers/ui-helpers";
import path from "path";

const FIXTURES_DIR = path.join(import.meta.dirname, "../test-fixtures");
const SAMPLES = [
  "compare_sample_a.pdf",
  "compare_sample_b.pdf",
  "sample.pdf",
  "rotated-pages.pdf",
  "annotations_out_of_order.pdf",
].map((name) => path.join(FIXTURES_DIR, name));

// Read from the running app, not imported: a spec resolves @editor/* to a different layer than
// the browser build does, so an imported WORKBENCH_SESSION_RESTORE can disagree with reality.
async function restoreEnabled(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  await page.waitForFunction(
    () => document.documentElement.dataset.workbenchRestore !== undefined,
    null,
    { timeout: 20000 },
  );
  return page.evaluate(
    () => document.documentElement.dataset.workbenchRestore === "true",
  );
}

const NO_RESTORE = "this build ships the workbench restore off";
test.describe("The view survives a reload", () => {
  test.use({
    stubOptions: {
      enableLogin: true,
      user: {
        id: 44,
        username: "owner",
        email: "o@e.com",
        role: "ROLE_USER",
      },
    },
    seedJwt: true,
  });

  const currentView = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const r = Array.from(
        document.querySelectorAll<HTMLInputElement>("input[type=radio]"),
      ).find((x) => x.checked);
      return r?.value ?? "none";
    });

  test("comes back on the same view the user left", async ({ page }) => {
    test.skip(!(await restoreEnabled(page)), NO_RESTORE);

    await uploadFiles(page, SAMPLES.slice(0, 3));
    await expect(page.locator(".file-sidebar-file-item")).toHaveCount(3, {
      timeout: 15000,
    });

    // Open a document, so the view under test is the viewer rather than the grid.
    await page
      .getByRole("button", { name: /Open in Viewer/i })
      .first()
      .click({ force: true });
    await expect
      .poll(() => currentView(page), { timeout: 10000 })
      .toBe("viewer");

    const before = await currentView(page);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const record = JSON.parse(
            sessionStorage.getItem("stirling.workbench.session") ?? "{}",
          );
          return record.workbench;
        }),
      )
      .toBe(before);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".file-sidebar-file-item")).toHaveCount(3, {
      timeout: 20000,
    });
    await expect
      .poll(() => currentView(page), { timeout: 20_000 })
      .toBe(before);
  });

  // The conjunction neither neighbour covers: the spec above proves the VIEW comes back,
  // engine-capabilities proves stored bytes decode, and nothing proved that the file the
  // restore reopened is one whose pixels actually arrive.
  test("a file the restore reopened renders its pages", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!(await restoreEnabled(page)), NO_RESTORE);

    await uploadFiles(page, SAMPLES.slice(0, 3));
    await expect(page.locator(".file-sidebar-file-item")).toHaveCount(3, {
      timeout: 15_000,
    });

    await page
      .getByRole("button", { name: /Open in Viewer/i })
      .first()
      .click({ force: true });
    await expect
      .poll(() => currentView(page), { timeout: 10_000 })
      .toBe("viewer");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const record = JSON.parse(
            sessionStorage.getItem("stirling.workbench.session") ?? "{}",
          );
          return record.fileIds?.length ?? 0;
        }),
      )
      .toBe(3);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".file-sidebar-file-item")).toHaveCount(3, {
      timeout: 30_000,
    });

    // A tile that decoded has non-zero naturalWidth. The restore resolves each recorded id
    // to its current leaf, so an empty tile here means it reopened something unreadable.
    const tile = page
      .locator('[data-page-index="0"]')
      .first()
      .locator('img[src^="blob:"]')
      .first();
    await expect(tile).toBeAttached({ timeout: 30_000 });
    await expect
      .poll(() => tile.evaluate((img: HTMLImageElement) => img.naturalWidth), {
        timeout: 30_000,
      })
      .toBeGreaterThan(0);
  });
});
