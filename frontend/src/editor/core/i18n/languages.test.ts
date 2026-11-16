// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  normalizeLanguageCode,
  supportedLanguages,
  getInitialLanguage,
  toUnderscoreFormat,
} from "@editor/i18n/languages";

const LOCALES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../public/locales",
);

const localeFolders = fs
  .readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe("locale folders", () => {
  it.each(localeFolders)("%s is a canonical BCP 47 tag", (folder) => {
    expect(Intl.getCanonicalLocales(folder)[0]).toBe(folder);
  });

  it.each(Object.keys(supportedLanguages))(
    "supported language %s is canonical and has an exact-case folder",
    (code) => {
      expect(Intl.getCanonicalLocales(code)[0]).toBe(code);
      expect(localeFolders).toContain(code);
    },
  );
});

describe("app language choices", () => {
  it("offers only English, Polish, Russian, and Ukrainian", () => {
    expect(supportedLanguages).toEqual({
      "en-US": "English",
      "pl-PL": "Polski",
      "ru-RU": "Русский",
      "uk-UA": "Українська",
    });
  });
});

describe("initial language", () => {
  it("starts a fresh desktop install in Russian", () => {
    expect(getInitialLanguage("desktop", null)).toBe("ru-RU");
  });

  it("preserves a saved language", () => {
    expect(getInitialLanguage("desktop", "pl-PL")).toBeUndefined();
  });

  it("keeps the web app language detection unchanged", () => {
    expect(getInitialLanguage("development", null)).toBeUndefined();
  });
});

describe("normalizeLanguageCode", () => {
  it.each(Object.keys(supportedLanguages))(
    "round-trips %s through the backend underscore form",
    (code) => {
      expect(normalizeLanguageCode(toUnderscoreFormat(code))).toBe(code);
    },
  );

  it.each(["sr-LATN-RS", "sr_LATN_RS", "sr-latn-rs", "SR_Latn_rs"])(
    "resolves legacy %s to Serbian",
    (legacy) => {
      const normalized = normalizeLanguageCode(legacy);
      expect(normalized).toBe("sr-Latn-RS");
    },
  );

  it("keeps language and region casing", () => {
    expect(normalizeLanguageCode("EN")).toBe("en");
    expect(normalizeLanguageCode("en_gb")).toBe("en-GB");
    expect(normalizeLanguageCode("zh-tw")).toBe("zh-TW");
  });
});
