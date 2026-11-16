/**
 * Shared language metadata and code helpers for the editor and portal i18n
 * setups. Pure data + string utilities — no i18next instance or app state.
 */

/**
 * Supported languages by native display name. Keys and `public/locales` folder names must be
 * canonical (`Intl.getCanonicalLocales`): i18next canonicalises tags, so any other casing never matches.
 */
export const supportedLanguages: Record<string, string> = {
  "en-US": "English",
  "pl-PL": "Polski",
  "ru-RU": "Русский",
  "uk-UA": "Українська",
};

/** Right-to-left languages (drives `document.dir`). */
export const rtlLanguages = ["ar-AR", "fa-IR"];

/** LocalStorage keys for i18next language persistence. */
export const I18N_STORAGE_KEYS = {
  LANGUAGE: "i18nextLng",
  LANGUAGE_SOURCE: "i18nextLng-source",
} as const;

export function getInitialLanguage(
  buildMode: string,
  savedLanguage: string | null,
): string | undefined {
  return buildMode === "desktop" && savedLanguage === null
    ? "ru-RU"
    : undefined;
}

/**
 * Language selection priority levels.
 * Higher number = higher priority (cannot be overridden by lower priority).
 */
export enum LanguageSource {
  Fallback = 0,
  Browser = 1,
  ServerDefault = 2,
  DesktopDefault = 3,
  User = 4,
}

export function normalizeLanguageCode(languageCode: string): string {
  // Replace underscores with hyphens to align with i18next/translation file naming
  const hyphenated = languageCode.replace(/_/g, "-");
  const [base, ...rest] = hyphenated.split("-");

  if (rest.length === 0) {
    return base.toLowerCase();
  }

  return [base.toLowerCase(), ...rest.map(normalizeSubtag)].join("-");
}

// BCP 47 casing: title-case script (4 letters), so legacy "sr_LATN_RS" matches "sr-Latn-RS".
function normalizeSubtag(part: string): string {
  if (part.length === 4) {
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  return part.length <= 3 ? part.toUpperCase() : part;
}

/**
 * Convert language codes to underscore format (e.g., en-US → en_US).
 * Used for backend API communication which expects underscore format.
 */
export function toUnderscoreFormat(languageCode: string): string {
  return languageCode.replace(/-/g, "_");
}

/** Convert an array of language codes to underscore format. */
export function toUnderscoreLanguages(languages: string[]): string[] {
  return languages.map(toUnderscoreFormat);
}
