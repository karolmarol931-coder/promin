import { test, expect } from "@editor/tests/helpers/stub-test-base";
import { openSettings } from "@editor/tests/helpers/ui-helpers";
import type { Page } from "@playwright/test";

/** Covers local tool search, navigation, and query rendering. */

const INPUT = "#super-search-input";

async function openSearch(page: Page) {
  const input = page.locator(INPUT);
  await input.click();
  await expect(input).toHaveAttribute("aria-expanded", "true");
  return input;
}

test.describe("Super search — bar basics", () => {
  test("Ctrl+K opens the bar and results filter as you type", async ({
    page,
  }) => {
    const input = page.locator(INPUT);
    // The shortcut listener mounts with the bar — wait for it before pressing.
    await expect(input).toBeVisible();
    await page.keyboard.press("Control+KeyK");
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("aria-expanded", "true");

    await input.fill("merge");
    await expect(
      page.getByRole("option", { name: /Merge/ }).first(),
    ).toBeVisible();

    // A different query replaces the results in place.
    await input.fill("compress");
    await expect(
      page.getByRole("option", { name: /Compress/ }).first(),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: /^Merge/ })).toHaveCount(0);
  });

  test("selecting a tool result opens that tool", async ({ page }) => {
    const input = await openSearch(page);
    await input.fill("merge");
    await page
      .getByRole("option", { name: /^Merge/ })
      .first()
      .click();
    await page.waitForURL("**/merge**");
  });

  test("shows the empty state for a query with no matches", async ({
    page,
  }) => {
    const input = await openSearch(page);
    await input.fill("xyznonexistent123");
    await expect(page.getByText("No results found")).toBeVisible();
  });

  test("treats markup in the query as plain text", async ({ page }) => {
    let dialogFired = false;
    page.on("dialog", (dialog) => {
      dialogFired = true;
      void dialog.dismiss();
    });

    const input = await openSearch(page);
    const payload =
      '<img src=x onerror="window.__xss=1"><script>alert(1)</script>';
    await input.fill(payload);
    await expect(input).toHaveValue(payload);

    await expect(page.getByText("No results found")).toBeVisible();
    expect(dialogFired).toBe(false);
    expect(
      await page.evaluate(
        () => (window as unknown as { __xss?: number }).__xss,
      ),
    ).toBeUndefined();
  });

  test("show more reveals the rest of a large group and collapses again", async ({
    page,
  }) => {
    const input = await openSearch(page);
    // Broad query — the tools lane alone exceeds the 5-row collapsed slice.
    // Assertions scope to the Tools group so unrelated results do not affect counts.
    await input.fill("pdf");
    const tools = page.getByRole("group", { name: "Tools" });
    await expect(tools.getByRole("option").first()).toBeVisible();

    const collapsedCount = await tools.getByRole("option").count();
    const showMore = tools.getByRole("button", { name: /Show \d+ more/ });
    await expect(showMore).toBeVisible();
    const hidden = Number(
      (await showMore.innerText()).match(/\d+/)?.[0] ?? "0",
    );
    await showMore.click();

    await expect(tools.getByRole("option")).toHaveCount(
      collapsedCount + hidden,
    );
    const showLess = tools.getByRole("button", { name: "Show less" });
    await expect(showLess).toBeVisible();

    await showLess.click();
    await expect(tools.getByRole("option")).toHaveCount(collapsedCount);
  });

  test("selecting a tool from the /files page leaves the file manager", async ({
    page,
  }) => {
    await page.goto("/files");
    const input = page.locator(INPUT).first();
    await expect(input).toBeVisible({ timeout: 15000 });
    await input.click();
    await input.fill("merge");
    await page
      .getByRole("option", { name: /^Merge/ })
      .first()
      .click();

    // The selection pins its tool URL via raw history.pushState, which the
    // router never sees — the sink must leave /files through the router or
    // the myFiles workbench swallows the selection.
    await expect(page.locator(".files-page")).toHaveCount(0, {
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/\/merge/);
  });

  test("a settings result deep-links to the settings page", async ({
    page,
  }) => {
    const input = page.locator(INPUT);
    await expect(input).toBeVisible();

    await input.fill("general");
    await page
      .getByRole("option", { name: /General/ })
      .first()
      .click();
    await expect(page.locator(".settings-page")).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/general/);
  });

  test("Ctrl+K on the settings page focuses the shared search bar", async ({
    page,
  }) => {
    await openSettings(page);
    // The settings search has its own input id.
    await page.keyboard.press("Control+KeyK");
    await expect(page.locator("#settings-search-input")).toBeFocused();
  });
});
