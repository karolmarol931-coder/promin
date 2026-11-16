import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

vi.mock("@editor/contexts/PreferencesContext", () => ({
  usePreferences: () => ({ preferences: {}, updatePreference: vi.fn() }),
}));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

import { SystemCard } from "@editor/components/shared/config/configSections/server/SystemCard";
import type { GeneralSettingsData } from "@editor/components/shared/config/configSections/server/serverSettings";

function renderWithLocale(defaultLocale: string) {
  const settings = { ui: {}, system: { defaultLocale } } as GeneralSettingsData;
  render(
    <MantineProvider>
      <SystemCard
        settings={settings}
        setSettings={vi.fn()}
        isFieldPending={() => false}
        loginEnabled
      />
    </MantineProvider>,
  );
  return screen.getByPlaceholderText("en_US") as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SystemCard default locale", () => {
  it("shows the configured language for the underscore form", () => {
    expect(renderWithLocale("ru_RU").value).toBe("Русский (ru-RU)");
  });

  it("shows the configured language for the hyphenated form", () => {
    expect(renderWithLocale("ru-RU").value).toBe("Русский (ru-RU)");
  });

  it("matches a lowercased region tag", () => {
    expect(renderWithLocale("ru-ru").value).toBe("Русский (ru-RU)");
  });

  it("leaves the field empty when no locale is configured", () => {
    expect(renderWithLocale("").value).toBe("");
  });
});
