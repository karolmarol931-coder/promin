import { useTranslation } from "react-i18next";
import { Checkbox, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type { MergePageSizeNormalizationPlan, MergePageSizeSample } from "@editor/tools/merge/pageSizeAnalysis";

interface PageSizeReviewDetailsProps {
  plan: MergePageSizeNormalizationPlan;
  selectedPages: Set<string>;
  onTogglePage: (page: MergePageSizeSample, checked: boolean) => void;
  fileNames?: string[];
  showPageTotal?: boolean;
}

const KNOWN_PAGE_SIZES_MM = [
  { name: "A3", short: 297, long: 420 },
  { name: "A4", short: 210, long: 297 },
  { name: "A5", short: 148, long: 210 },
  { name: "Letter", short: 216, long: 279 },
  { name: "Legal", short: 216, long: 356 },
];

export function pageSizeSampleKey(page: MergePageSizeSample): string {
  return `${page.fileIndex}:${page.pageIndex}`;
}

function pageSizeLabel(width: number, height: number, language: string, millimetersLabel: string): string {
  const shortMillimeters = (Math.min(width, height) * 25.4) / 72;
  const longMillimeters = (Math.max(width, height) * 25.4) / 72;
  const format = (value: number) =>
    new Intl.NumberFormat(language, {
      maximumFractionDigits: 0,
      useGrouping: false,
    }).format(value);
  const size = KNOWN_PAGE_SIZES_MM.find(
    (candidate) => Math.abs(shortMillimeters - candidate.short) <= 2 && Math.abs(longMillimeters - candidate.long) <= 2,
  );

  return `${size ? `${size.name} · ` : ""}${format(shortMillimeters)} × ${format(longMillimeters)} ${millimetersLabel}`;
}

export function PageSizeReviewDetails({
  plan,
  selectedPages,
  onTogglePage,
  fileNames,
  showPageTotal = true,
}: PageSizeReviewDetailsProps) {
  const { t, i18n } = useTranslation();
  const selectedCount = plan.pages.filter((page) => selectedPages.has(pageSizeSampleKey(page))).length;
  const millimetersLabel = t("workbench.pageSizeReview.millimeters", "mm");

  return (
    <Stack gap="md">
      <Text>
        {t(
          fileNames ? "workbench.pageSizeReview.mergeDescription" : "workbench.pageSizeReview.description",
          fileNames
            ? "Only checked pages will be resized in the merged copy. Their contents will be scaled proportionally and centered. Source PDFs will stay unchanged."
            : "Only checked pages will be resized in a new copy. Their contents will be scaled proportionally and centered. The original PDF will stay unchanged.",
        )}
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Paper withBorder radius="md" p="md">
          <Text size="sm" c="dimmed">
            {t(
              fileNames ? "workbench.pageSizeReview.mergeTotalPages" : "workbench.pageSizeReview.totalPages",
              fileNames ? "Pages in selected PDFs" : "Pages in this PDF",
            )}
          </Text>
          <Text size="xl" fw={700}>
            {plan.totalPageCount}
          </Text>
        </Paper>
        <Paper withBorder radius="md" p="md">
          <Text size="sm" c="dimmed">
            {t("workbench.pageSizeReview.referencePages", "Pages with the common size")}
          </Text>
          <Text size="xl" fw={700}>
            {plan.referencePageCount}
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Text size="sm" c="dimmed">
          {t("workbench.pageSizeReview.target", "Most common page size")}
        </Text>
        <Text fw={700}>{pageSizeLabel(plan.portraitWidth, plan.portraitHeight, i18n.language, millimetersLabel)}</Text>
      </Paper>

      <Stack gap="xs">
        <Group justify="space-between" align="baseline">
          <Text fw={700}>{t("workbench.pageSizeReview.pages", "Pages to change in the copy")}</Text>
          <Text size="sm" c="dimmed">
            {t("workbench.pageSizeReview.selectedPages", "Selected: {{count}}", {
              count: selectedCount,
            })}
          </Text>
        </Group>
        {plan.pages.map((page) => {
          const checked = selectedPages.has(pageSizeSampleKey(page));
          return (
            <Paper key={pageSizeSampleKey(page)} withBorder radius="md" p="sm">
              <Checkbox
                checked={checked}
                onChange={(event) => onTogglePage(page, event.currentTarget.checked)}
                label={t(
                  showPageTotal ? "workbench.pageSizeReview.page" : "workbench.pageSizeReview.pageNumber",
                  showPageTotal ? "Page {{page}} of {{total}}" : "Page {{page}}",
                  {
                    page: page.pageIndex + 1,
                    total: plan.totalPageCount,
                  },
                )}
              />
              <Stack gap={2} pl={28}>
                {fileNames && (
                  <Text size="sm" c="dimmed">
                    {fileNames[page.fileIndex] ?? t("workbench.pageSizeReview.file", "File")}
                  </Text>
                )}
                <Text size="sm" c="dimmed">
                  {t("workbench.pageSizeReview.originalSize", "Current size")}:{" "}
                  {pageSizeLabel(page.width, page.height, i18n.language, millimetersLabel)}
                </Text>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
