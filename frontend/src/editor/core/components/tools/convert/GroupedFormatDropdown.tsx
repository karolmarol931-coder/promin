import { useState, useMemo } from "react";
import {
  Stack,
  Text,
  TextInput,
  Group,
  Box,
  Popover,
  useMantineTheme,
} from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { useTranslation } from "react-i18next";
import { Icon } from "@editor/ui/Icon";
import { Z_INDEX_AUTOMATE_DROPDOWN } from "@editor/styles/zIndex";
import { FORMAT_GROUP_LABEL_KEYS } from "@editor/constants/convertConstants";

interface FormatOption {
  value: string;
  label: string;
  labelKey?: string;
  group: string;
  enabled?: boolean;
}

interface GroupedFormatDropdownProps {
  value?: string;
  placeholder?: string;
  options: FormatOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  minWidth?: string;
  name?: string;
  withinPortal?: boolean;
  zIndex?: number;
}

const GroupedFormatDropdown = ({
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  minWidth = "18.75rem",
  name,
  withinPortal = true,
  zIndex = Z_INDEX_AUTOMATE_DROPDOWN,
}: GroupedFormatDropdownProps) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("dropdownList.selectOption");
  const [dropdownOpened, setDropdownOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const theme = useMantineTheme();

  const getOptionLabel = (option: FormatOption) =>
    option.labelKey ? t(option.labelKey, option.label) : option.label;
  const getGroupLabel = (group: string) => {
    const key = FORMAT_GROUP_LABEL_KEYS[group];
    return key ? t(key, group) : group;
  };

  const groupedOptions = useMemo(() => {
    const groups: Record<string, FormatOption[]> = {};
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    options.forEach((option) => {
      const searchableText =
        `${getOptionLabel(option)} ${option.value}`.toLocaleLowerCase();
      if (normalizedQuery && !searchableText.includes(normalizedQuery)) return;

      if (!groups[option.group]) {
        groups[option.group] = [];
      }
      groups[option.group].push(option);
    });

    return groups;
  }, [options, searchQuery, t]);

  const hasVisibleOptions = Object.values(groupedOptions).some(
    (groupOptions) => groupOptions.length > 0,
  );

  const selectedLabel = useMemo(() => {
    if (!value) return resolvedPlaceholder;
    const selected = options.find((opt) => opt.value === value);
    return selected
      ? `${getGroupLabel(selected.group)} (${getOptionLabel(selected)})`
      : value.toUpperCase();
  }, [value, options, resolvedPlaceholder, t]);

  const closeDropdown = () => {
    setDropdownOpened(false);
    setSearchQuery("");
  };

  const handleOptionSelect = (selectedValue: string) => {
    onChange(selectedValue);
    closeDropdown();
  };

  return (
    <Popover
      opened={dropdownOpened}
      onDismiss={closeDropdown}
      position="bottom-start"
      withArrow
      shadow="sm"
      disabled={disabled}
      closeOnEscape={true}
      trapFocus
      withinPortal={withinPortal}
      zIndex={zIndex}
    >
      <Popover.Target>
        <Button
          variant="tertiary"
          hover={false}
          fullWidth
          name={name}
          data-testid={name}
          onClick={() =>
            dropdownOpened ? closeDropdown() : setDropdownOpened(true)
          }
          disabled={disabled}
          style={{
            padding: "0.5rem 0.75rem",
            border: `0.0625rem solid ${theme.colors.gray[4]}`,
            borderRadius: theme.radius.sm,
            backgroundColor: disabled
              ? theme.colors.gray[1]
              : "var(--dropdown-trigger-bg)",
            cursor: disabled ? "not-allowed" : "pointer",
            width: "100%",
            color: disabled
              ? "var(--c-text-subtle)"
              : "var(--dropdown-trigger-text)",
          }}
        >
          <Group justify="space-between" style={{ width: "100%" }}>
            <Text size="sm" c={value ? undefined : "dimmed"}>
              {selectedLabel}
            </Text>
            <Icon
              name="chevron-down"
              size={"1rem"}
              style={{
                transform: dropdownOpened ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
                color: "var(--dropdown-trigger-icon)",
              }}
            />
          </Group>
        </Button>
      </Popover.Target>
      <Popover.Dropdown
        style={{
          minWidth: Math.min(350, parseInt(minWidth.replace("rem", "")) * 16),
          maxWidth: "90vw",
          maxHeight: "40vh",
          overflow: "auto",
          backgroundColor: "var(--dropdown-panel-bg)",
          border: `0.0625rem solid var(--dropdown-panel-border)`,
        }}
      >
        <Stack gap="md">
          <TextInput
            aria-label={t("convert.formatSearchPlaceholder")}
            placeholder={t("convert.formatSearchPlaceholder")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            size="sm"
            autoComplete="off"
          />
          {hasVisibleOptions ? (
            Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
              <Box key={groupName}>
                <Text
                  size="sm"
                  fw={600}
                  mb="xs"
                  style={{ color: "var(--dropdown-group-label)" }}
                >
                  {getGroupLabel(groupName)}
                </Text>
                <Group gap="xs" style={{ flexWrap: "wrap" }}>
                  {groupOptions.map((option) => (
                    <Button
                      key={option.value}
                      data-testid={`format-option-${option.value}`}
                      variant={value === option.value ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => handleOptionSelect(option.value)}
                      disabled={option.enabled === false}
                      style={{
                        fontSize: "0.75rem",
                        height: "2rem",
                        padding: "0 0.75rem",
                        flexShrink: 0,
                        position: "relative",
                      }}
                    >
                      {getOptionLabel(option)}
                    </Button>
                  ))}
                </Group>
              </Box>
            ))
          ) : (
            <Text size="sm" c="dimmed" ta="center">
              {t("convert.formatSearchNoResults")}
            </Text>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

export default GroupedFormatDropdown;
