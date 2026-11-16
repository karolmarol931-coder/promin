import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@editor/i18n/tomlBackend", () => ({
  default: {
    type: "backend",
    init() {},
    read(
      _lng: string,
      _ns: string,
      callback: (err: unknown, res: unknown) => void,
    ) {
      callback(null, {});
    },
  },
}));

import i18n, { setUserLanguage, updateSupportedLanguages } from "@editor/i18n";
import { I18N_STORAGE_KEYS, LanguageSource } from "@editor/i18n/languages";

describe("updateSupportedLanguages", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("en-US");
  });

  it("skips changing language when the server default matches the current language", async () => {
    const spy = vi.spyOn(i18n, "changeLanguage");
    await updateSupportedLanguages(null, "en-US");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("still records the source when the language change is skipped", async () => {
    await updateSupportedLanguages(null, "en-US");
    expect(localStorage.getItem(I18N_STORAGE_KEYS.LANGUAGE)).toBe("en-US");
    expect(localStorage.getItem(I18N_STORAGE_KEYS.LANGUAGE_SOURCE)).toBe(
      String(LanguageSource.ServerDefault),
    );
  });

  it("switches when the server default differs", async () => {
    const spy = vi.spyOn(i18n, "changeLanguage");
    await updateSupportedLanguages(null, "ru-RU");
    expect(spy).toHaveBeenCalledWith("ru-RU");
    spy.mockRestore();
    await i18n.changeLanguage("en-US");
  });

  it.each(["en-US", "ru-RU", "uk-UA", "pl-PL"])(
    "applies and remembers the user's selected language %s before returning",
    async (language) => {
      const applied = await setUserLanguage(language);

      expect(applied).toBe(true);
      expect(i18n.language).toBe(language);
      expect(localStorage.getItem(I18N_STORAGE_KEYS.LANGUAGE)).toBe(language);
      expect(localStorage.getItem(I18N_STORAGE_KEYS.LANGUAGE_SOURCE)).toBe(
        String(LanguageSource.User),
      );
    },
  );

  it("keeps a user choice when the server default loads later", async () => {
    await setUserLanguage("pl-PL");
    await updateSupportedLanguages(null, "en-US");

    expect(i18n.language).toBe("pl-PL");
    expect(localStorage.getItem(I18N_STORAGE_KEYS.LANGUAGE_SOURCE)).toBe(
      String(LanguageSource.User),
    );
  });

  it("ignores a server default outside the supported app languages", async () => {
    const spy = vi.spyOn(i18n, "changeLanguage");
    await updateSupportedLanguages(null, "de-DE");

    expect(spy).not.toHaveBeenCalled();
    expect(i18n.language).toBe("en-US");
    spy.mockRestore();
  });

  it("ignores languages outside the supported app list", async () => {
    const applied = await setUserLanguage("de-DE");

    expect(applied).toBe(false);
    expect(i18n.language).toBe("en-US");
    expect(localStorage.getItem(I18N_STORAGE_KEYS.LANGUAGE)).toBeNull();
  });
});
