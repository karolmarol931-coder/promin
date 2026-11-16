import { Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Button } from "@editor/ui/Button";
import classes from "@editor/components/tools/split/SplitMethodSelector.module.css";
import {
  type MethodOption,
  SPLIT_METHODS,
  type SplitMethod,
} from "@editor/constants/splitConstants";

interface SplitMethodSelectorProps {
  options: MethodOption[];
  selectedMethod: SplitMethod | null;
  onSelect: (method: SplitMethod | null) => void;
  disabled?: boolean;
}

const PRIMARY_METHODS = [
  SPLIT_METHODS.BY_PAGES,
  SPLIT_METHODS.BY_PAGE_COUNT,
  SPLIT_METHODS.BY_SIZE,
] as const;

const PRIMARY_LABEL_KEYS: Partial<Record<SplitMethod, string>> = {
  [SPLIT_METHODS.BY_PAGES]: "split.methods.byPages.name",
  [SPLIT_METHODS.BY_PAGE_COUNT]: "split.methods.byPageCount.name",
  [SPLIT_METHODS.BY_SIZE]: "split.methods.bySize.name",
};

const SplitMethodSelector = ({
  options,
  selectedMethod,
  onSelect,
  disabled = false,
}: SplitMethodSelectorProps) => {
  const { t } = useTranslation();
  const primaryOptions = PRIMARY_METHODS.flatMap((method) => {
    const option = options.find((candidate) => candidate.value === method);
    return option ? [option] : [];
  });
  const additionalOptions = options.filter(
    (option) =>
      !PRIMARY_METHODS.includes(
        option.value as (typeof PRIMARY_METHODS)[number],
      ),
  );
  const selectedOption = options.find(
    (option) => option.value === selectedMethod,
  );
  const primaryMethod =
    selectedMethod &&
    primaryOptions.some((option) => option.value === selectedMethod)
      ? selectedMethod
      : undefined;

  return (
    <Stack gap="sm">
      {primaryOptions.length > 0 && (
        <div
          className={classes.primaryMethods}
          role="group"
          aria-label={t(
            "split.methodSelection.tooltip.title",
            "Choose a split method",
          )}
        >
          {primaryOptions.map((option) => (
            <Button
              key={option.value}
              className={classes.methodButton}
              fullWidth
              size="sm"
              fontSize="xs"
              p="xs"
              overflow="wrap"
              variant={
                selectedMethod === option.value ? "primary" : "secondary"
              }
              disabled={disabled}
              aria-pressed={selectedMethod === option.value}
              onClick={() => onSelect(option.value)}
            >
              {t(
                PRIMARY_LABEL_KEYS[option.value] ?? option.nameKey,
                option.value,
              )}
            </Button>
          ))}
        </div>
      )}
      {additionalOptions.length > 0 && (
        <Select
          value={primaryMethod ? null : selectedMethod}
          onChange={(value) => onSelect(value as SplitMethod | null)}
          placeholder={t("moreOptions", "More Options")}
          data={additionalOptions.map((option) => ({
            value: option.value,
            label: t(option.nameKey, option.value),
          }))}
          disabled={disabled}
          aria-label={t(
            "split.methodSelection.tooltip.title",
            "Choose a split method",
          )}
          comboboxProps={{ withinPortal: true }}
        />
      )}
      {selectedOption?.tooltipKey && (
        <Text size="sm" c="dimmed">
          {t(selectedOption.tooltipKey, "")}
        </Text>
      )}
    </Stack>
  );
};

export default SplitMethodSelector;
