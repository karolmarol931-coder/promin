import React, { useEffect, useMemo, useState } from "react";
import { Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  getAutoOcrLanguage,
  getOcrDisplayName,
} from "@editor/utils/languageMapping";
import DropdownListWithFooter, {
  type DropdownItem,
} from "@editor/components/shared/DropdownListWithFooter";

const LOCAL_LANGUAGES = ["eng", "pol", "rus"];

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
  autoFillFromBrowserLanguage = true,
}) => {
  const { t, i18n } = useTranslation();
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const languages = useMemo<DropdownItem[]>(
    () =>
      LOCAL_LANGUAGES.map((code) => {
        const displayName = getOcrDisplayName(code);
        const key = `lang.${code}`;
        const translated = t(key);
        const name = translated !== key ? translated : displayName;
        return { value: code, name, label: name };
      }).sort((left, right) =>
        left.name.localeCompare(right.name, i18n.language),
      ),
    [i18n.language, t],
  );

  useEffect(() => {
    if (!autoFillFromBrowserLanguage || hasAutoFilled || value.length > 0) {
      return;
    }
    const suggested = getAutoOcrLanguage(i18n.language);
    const language = LOCAL_LANGUAGES.find((code) => suggested.includes(code));
    if (language) onChange([language]);
    setHasAutoFilled(true);
  }, [
    autoFillFromBrowserLanguage,
    hasAutoFilled,
    i18n.language,
    onChange,
    value,
  ]);

  return (
    <Stack gap="xs">
      <DropdownListWithFooter
        value={value}
        onChange={(nextValue) => onChange(nextValue as string[])}
        items={languages}
        placeholder={placeholder ?? t("dropdownList.selectLanguages")}
        disabled={disabled}
        label={label}
        footer={
          <Text size="xs" c="dimmed" className="text-center">
            {t(
              "ocr.languagePicker.additionalLanguages",
              "English, Polish, and Russian are included in this app.",
            )}
          </Text>
        }
        multiSelect
        maxHeight={300}
        searchable
      />
    </Stack>
  );
};

export default LanguagePicker;
