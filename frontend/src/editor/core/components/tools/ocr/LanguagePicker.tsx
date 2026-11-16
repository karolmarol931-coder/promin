import React, { useState, useEffect } from "react";
import { Text, Loader, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Button } from "@editor/ui/Button";
import {
  getAutoOcrLanguage,
  getBrowserLanguagesForOcr,
  getOcrDisplayName,
} from "@editor/utils/languageMapping";
import apiClient from "@editor/services/apiClient";
import DropdownListWithFooter, {
  DropdownItem,
} from "@editor/components/shared/DropdownListWithFooter";

export interface LanguageOption {
  value: string;
  label: string;
}

export interface LanguagePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  languagesEndpoint?: string;
  autoFillFromBrowserLanguage?: boolean;
}

const LanguagePicker: React.FC<LanguagePickerProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  label,
  languagesEndpoint = "/api/v1/ui-data/ocr-pdf",
  autoFillFromBrowserLanguage = true,
}) => {
  const { t, i18n } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("dropdownList.selectLanguages");
  const [availableLanguages, setAvailableLanguages] = useState<DropdownItem[]>(
    [],
  );
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [suggestedLanguage, setSuggestedLanguage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isCurrentRequest = true;
    setIsLoadingLanguages(true);

    const fetchLanguages = async () => {
      try {
        const { data } = await apiClient.get<{ languages: string[] }>(
          languagesEndpoint,
        );
        if (!isCurrentRequest) return;

        const displayNames =
          typeof Intl.DisplayNames !== "undefined"
            ? new Intl.DisplayNames([i18n.language], { type: "language" })
            : null;

        const languageOptions = [...new Set(data.languages)]
          .map((lang) => {
            const displayName = getOcrDisplayName(lang);
            const browserLanguageCodes = getBrowserLanguagesForOcr(lang);

            const langKey = `lang.${lang}`;
            const translatedFromKey = t(langKey);
            const hasKeyTranslation = translatedFromKey !== langKey;

            const intlTranslatedName = displayNames
              ? browserLanguageCodes
                  .map((code) => displayNames.of(code))
                  .find((name): name is string => Boolean(name))
              : null;

            const translatedName =
              (hasKeyTranslation ? translatedFromKey : null) ||
              intlTranslatedName ||
              t(`ocr.languages.${lang}`, displayName);

            return {
              value: lang,
              name: translatedName,
              label: translatedName,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name, i18n.language));

        setAvailableLanguages(languageOptions);
        setLoadError(false);
      } catch {
        if (!isCurrentRequest) return;
        setLoadError(true);
      } finally {
        if (isCurrentRequest) setIsLoadingLanguages(false);
      }
    };

    fetchLanguages();

    return () => {
      isCurrentRequest = false;
    };
  }, [languagesEndpoint, i18n.language, t, retryCount]);

  // Auto-fill OCR language based on browser language when languages are loaded
  useEffect(() => {
    const shouldAutoFillLanguage =
      autoFillFromBrowserLanguage &&
      !isLoadingLanguages &&
      availableLanguages.length > 0 &&
      !hasAutoFilled &&
      value.length === 0;

    if (shouldAutoFillLanguage) {
      // Use the comprehensive language mapping from languageMapping.ts
      const suggestedOcrLanguages = getAutoOcrLanguage(i18n.language);

      if (suggestedOcrLanguages.length > 0) {
        // Find the first suggested language that's available in the backend
        const matchingLanguage = availableLanguages.find((lang) =>
          suggestedOcrLanguages.includes(lang.value),
        );

        if (matchingLanguage) {
          onChange([matchingLanguage.value]);
          setSuggestedLanguage(matchingLanguage.value);
        }
      }

      setHasAutoFilled(true);
    }
  }, [
    autoFillFromBrowserLanguage,
    isLoadingLanguages,
    availableLanguages,
    hasAutoFilled,
    value.length,
    i18n.language,
    onChange,
  ]);

  if (isLoadingLanguages) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Loader size="xs" />
        <Text size="sm">
          {t("ocr.languagePicker.loading", "Loading available languages...")}
        </Text>
      </div>
    );
  }

  if (loadError) {
    return (
      <Stack gap="xs" role="alert">
        <Text size="sm">
          {t(
            "ocr.languagePicker.loadFailed",
            "Could not load the locally installed OCR languages.",
          )}
        </Text>
        <Button
          variant="tertiary"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setIsLoadingLanguages(true);
            setRetryCount((count) => count + 1);
          }}
        >
          {t("ocr.languagePicker.retry", "Try again")}
        </Button>
      </Stack>
    );
  }

  if (availableLanguages.length === 0) {
    return (
      <Text size="sm" c="dimmed" role="status">
        {t(
          "ocr.languagePicker.noLanguages",
          "No OCR languages are installed in this local copy of Promin.",
        )}
      </Text>
    );
  }

  const footer = (
    <Text size="xs" c="dimmed" className="text-center">
      {t(
        "ocr.languagePicker.additionalLanguages",
        "Only languages installed in this local copy are available.",
      )}
    </Text>
  );

  return (
    <Stack gap="xs">
      <DropdownListWithFooter
        value={value}
        onChange={(newValue) => onChange(newValue as string[])}
        items={availableLanguages}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        label={label}
        footer={footer}
        multiSelect={true}
        maxHeight={300}
        searchable={true}
      />
      {suggestedLanguage &&
        value.length === 1 &&
        value[0] === suggestedLanguage && (
          <Text size="xs" c="dimmed">
            {t(
              "ocr.languagePicker.suggestedLanguage",
              "Suggested from the app language. Check that it matches the PDF.",
            )}
          </Text>
        )}
    </Stack>
  );
};

export default LanguagePicker;
