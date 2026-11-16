import { test, expect } from "@editor/tests/helpers/stub-test-base";
import { openSettings } from "@editor/tests/helpers/ui-helpers";

test.describe("13. Language / Localization", () => {
  test.use({
    stubOptions: {
      languages: ["en-US", "ru-RU", "uk-UA", "pl-PL"],
    },
  });

  test.describe("13.1 Language Switcher", () => {
    test("switches the interface immediately between supported languages", async ({
      page,
    }) => {
      let languageButton = page
        .locator('[data-testid="language-selector-button"]')
        .first();

      if (
        !(await languageButton.isVisible({ timeout: 1000 }).catch(() => false))
      ) {
        await openSettings(page, /^General$/);
        languageButton = page
          .locator('[data-testid="language-selector-button"]')
          .first();
      }

      await expect(languageButton).toBeVisible({ timeout: 5000 });
      await languageButton.click();

      const languageMenu = page.locator(".mantine-Menu-dropdown").first();
      await expect(languageMenu).toBeVisible({ timeout: 5000 });

      const options = [
        { label: "Русский", placeholder: "Поиск в Promin" },
        { label: "Українська", placeholder: "Пошук у Promin" },
        { label: "Polski", placeholder: "Szukaj w Promin" },
        { label: "English", placeholder: "Search Promin" },
      ];

      await expect(languageMenu.getByRole("button")).toHaveCount(4);
      for (const option of options) {
        await languageMenu.getByRole("button", { name: option.label }).click();
        await expect(page.getByPlaceholder(option.placeholder)).toBeVisible();

        if (option.label === "Русский") {
          await expect(
            page.getByText("Внешний вид", { exact: true }).first(),
          ).toBeVisible();
        }

        if (option !== options.at(-1)) {
          await languageButton.click();
          await expect(languageMenu).toBeVisible();
        }
      }

      await languageButton.click();
      await languageMenu.getByRole("button", { name: "Русский" }).click();
      await page.reload();
      await expect(page.getByPlaceholder("Поиск в Promin")).toBeVisible();
      await expect(
        page.getByText("Внешний вид", { exact: true }).first(),
      ).toBeVisible();
    });
  });
});
