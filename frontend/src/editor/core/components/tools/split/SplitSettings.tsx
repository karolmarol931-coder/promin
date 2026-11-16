import {
  NumberInput,
  Paper,
  Stack,
  TextInput,
  Checkbox,
  Anchor,
  List,
  Text,
  Select,
} from "@mantine/core";
import { Icon } from "@editor/ui/Icon";
import { useTranslation } from "react-i18next";
import { SPLIT_METHODS } from "@editor/constants/splitConstants";
import {
  SplitParameters,
  validateSplitParameters,
} from "@editor/hooks/tools/split/useSplitParameters";
import { Z_INDEX_AUTOMATE_DROPDOWN } from "@editor/styles/zIndex";

export interface SplitSettingsProps {
  parameters: SplitParameters;
  onParameterChange: <K extends keyof SplitParameters>(
    key: K,
    value: SplitParameters[K],
  ) => void;
  pageCount?: number;
  disabled?: boolean;
}

const SplitSettings = ({
  parameters,
  onParameterChange,
  pageCount,
  disabled = false,
}: SplitSettingsProps) => {
  const { t } = useTranslation();
  const getPageSplitPreview = (): {
    count: number;
    ranges: string[];
  } | null => {
    if (!pageCount || !parameters.pages.trim()) return null;
    if (parameters.pages.trim().toLowerCase() === "all") {
      if (pageCount <= 1) return null;
      return {
        count: pageCount,
        ranges: Array.from({ length: Math.min(pageCount, 4) }, (_, index) =>
          String(index + 1),
        ),
      };
    }

    if (!validateSplitParameters(parameters, pageCount)) return null;

    let cutCount = 0;
    let firstPage = 1;
    const ranges: string[] = [];
    for (const token of parameters.pages.split(",")) {
      const trimmed = token.trim();
      const range = /^(\d+)\s*-\s*(\d*)$/.exec(trimmed);
      const start = range ? Number(range[1]) : Number(trimmed);
      const end = range ? (range[2] ? Number(range[2]) : pageCount) : start;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end))
        return null;
      const lastCutPage = Math.min(end, pageCount - 1);
      const tokenCutCount = Math.max(0, lastCutPage - start + 1);
      for (
        let page = start;
        page <= lastCutPage && ranges.length < 4;
        page += 1
      ) {
        ranges.push(
          firstPage === page ? `${firstPage}` : `${firstPage}–${page}`,
        );
        firstPage = page + 1;
      }
      firstPage = start + tokenCutCount;
      cutCount += tokenCutCount;
    }

    if (cutCount === 0) return null;
    const count = cutCount + 1;
    if (firstPage <= pageCount && ranges.length < 4) {
      ranges.push(
        firstPage === pageCount ? `${firstPage}` : `${firstPage}–${pageCount}`,
      );
    }
    return { count, ranges };
  };

  const getFixedPageCountPreview = (): {
    count: number;
    ranges: string[];
  } | null => {
    if (
      parameters.method !== SPLIT_METHODS.BY_PAGE_COUNT ||
      pageCount == null ||
      pageCount <= 0
    )
      return null;

    const pagesPerFile = Number(parameters.splitValue);
    if (!Number.isSafeInteger(pagesPerFile) || pagesPerFile <= 0) return null;

    const count = Math.ceil(pageCount / pagesPerFile);
    const ranges = Array.from({ length: Math.min(count, 4) }, (_, index) => {
      const start = index * pagesPerFile + 1;
      const end = Math.min(start + pagesPerFile - 1, pageCount);
      return start === end ? String(start) : `${start}–${end}`;
    });
    return { count, ranges };
  };

  const renderByPagesForm = () => {
    const isInvalid =
      parameters.pages.trim() !== "" &&
      !validateSplitParameters(parameters, pageCount);
    const splitPreview = getPageSplitPreview();

    const previewMoreCount = splitPreview
      ? splitPreview.count - splitPreview.ranges.length
      : 0;

    return (
      <Stack gap="sm">
        <TextInput
          label={t("split.pages.label", "Start new PDFs after page(s)")}
          description={t("split.pages.description")}
          placeholder={t("split.pages.placeholder", "Example: 3, 8")}
          value={parameters.pages}
          onChange={(event) => onParameterChange("pages", event.target.value)}
          error={
            isInvalid
              ? t(
                  "split.pages.invalid",
                  "Введите правильные номера страниц. Нельзя разделить после последней страницы.",
                )
              : undefined
          }
          disabled={disabled || pageCount === 1}
        />

        {pageCount === 1 ? (
          <Text size="sm" c="orange">
            {t("split.pages.invalid")}
          </Text>
        ) : null}

        {splitPreview && (
          <Paper id="split-page-preview" p="sm" radius="md" withBorder>
            <Text size="sm" aria-live="polite">
              {t(
                "split.pages.preview",
                "{{count}} files will be created: {{ranges}}{{more}}",
                {
                  count: splitPreview.count,
                  ranges: splitPreview.ranges.join(" · "),
                  more:
                    previewMoreCount > 0
                      ? t("split.pages.previewMore", " and {{count}} more", {
                          count: previewMoreCount,
                        })
                      : "",
                },
              )}
            </Text>
          </Paper>
        )}
      </Stack>
    );
  };

  const renderBySectionsForm = () => (
    <Stack gap="sm">
      <TextInput
        label={t("split-by-sections.horizontal.label", "Horizontal Divisions")}
        type="number"
        min="1"
        max="300"
        value={parameters.hDiv}
        onChange={(e) => onParameterChange("hDiv", e.target.value)}
        placeholder={t(
          "split-by-sections.horizontal.placeholder",
          "Enter number of horizontal divisions",
        )}
        disabled={disabled}
      />
      <TextInput
        label={t("split-by-sections.vertical.label", "Vertical Divisions")}
        type="number"
        min="1"
        max="300"
        value={parameters.vDiv}
        onChange={(e) => onParameterChange("vDiv", e.target.value)}
        placeholder={t(
          "split-by-sections.vertical.placeholder",
          "Enter number of vertical divisions",
        )}
        disabled={disabled}
      />
      <Select
        label={t("split-by-sections.splitMode.label", "Split Mode")}
        value={parameters.splitMode || "SPLIT_ALL"}
        onChange={(value) =>
          onParameterChange("splitMode", value || "SPLIT_ALL")
        }
        description={t(
          "split-by-sections.splitMode.description",
          "Choose how to split the pages",
        )}
        data={[
          {
            value: "SPLIT_ALL",
            label: t("split-by-sections.splitMode.splitAll", "Split all pages"),
          },
          {
            value: "SPLIT_ALL_EXCEPT_FIRST",
            label: t(
              "split-by-sections.splitMode.splitAllExceptFirst",
              "Split all except first",
            ),
          },
          {
            value: "SPLIT_ALL_EXCEPT_LAST",
            label: t(
              "split-by-sections.splitMode.splitAllExceptLast",
              "Split all except last",
            ),
          },
          {
            value: "SPLIT_ALL_EXCEPT_FIRST_AND_LAST",
            label: t(
              "split-by-sections.splitMode.splitAllExceptFirstAndLast",
              "Split all except first and last",
            ),
          },
          {
            value: "CUSTOM",
            label: t("split-by-sections.splitMode.custom", "Custom pages"),
          },
        ]}
        disabled={disabled}
        comboboxProps={{
          withinPortal: true,
          zIndex: Z_INDEX_AUTOMATE_DROPDOWN,
        }}
      />
      {parameters.splitMode === "CUSTOM" && (
        <TextInput
          label={t(
            "split-by-sections.customPages.label",
            "Custom Page Numbers",
          )}
          placeholder={t(
            "split-by-sections.customPages.placeholder",
            "e.g. 2,4,6",
          )}
          value={parameters.customPages || ""}
          onChange={(e) => onParameterChange("customPages", e.target.value)}
          disabled={disabled}
        />
      )}
      <Checkbox
        label={t("split-by-sections.merge", "Merge sections into one PDF")}
        checked={parameters.merge}
        onChange={(e) => onParameterChange("merge", e.currentTarget.checked)}
        disabled={disabled}
      />
    </Stack>
  );

  const renderSplitValueForm = () => {
    let label, placeholder;
    let description: string | undefined;

    switch (parameters.method) {
      case SPLIT_METHODS.BY_SIZE:
        label = t("split.value.fileSize.label", "File Size");
        placeholder = t("split.value.fileSize.placeholder", "e.g. 10MB, 500KB");
        description = t(
          "split.value.fileSize.description",
          "Splits only between pages. A single large page can exceed this size.",
        );
        break;
      case SPLIT_METHODS.BY_PAGE_COUNT:
        label = t("split.value.pageCount.label", "Pages per File");
        placeholder = t("split.value.pageCount.placeholder", "e.g. 5, 10");
        break;
      case SPLIT_METHODS.BY_DOC_COUNT:
        label = t("split.value.docCount.label", "Number of Files");
        placeholder = t("split.value.docCount.placeholder", "e.g. 3, 5");
        break;
      default:
        label = t("split-by-size-or-count.value.label", "Split Value");
        placeholder = t(
          "split-by-size-or-count.value.placeholder",
          "e.g. 10MB or 5 pages",
        );
    }

    if (
      parameters.method === SPLIT_METHODS.BY_PAGE_COUNT ||
      parameters.method === SPLIT_METHODS.BY_DOC_COUNT
    ) {
      const pageCountPreview = getFixedPageCountPreview();
      const previewMoreCount = pageCountPreview
        ? pageCountPreview.count - pageCountPreview.ranges.length
        : 0;

      return (
        <Stack gap="sm">
          <NumberInput
            label={label}
            placeholder={
              parameters.method === SPLIT_METHODS.BY_PAGE_COUNT ? "5" : "3"
            }
            value={parameters.splitValue}
            onChange={(value) => onParameterChange("splitValue", String(value))}
            min={1}
            decimalScale={0}
            allowNegative={false}
            disabled={disabled}
          />
          {pageCountPreview && (
            <Paper p="sm" radius="md" withBorder>
              <Text size="sm" aria-live="polite">
                {t(
                  "split.pages.preview",
                  "{{count}} files will be created: {{ranges}}{{more}}",
                  {
                    count: pageCountPreview.count,
                    ranges: pageCountPreview.ranges.join(" · "),
                    more:
                      previewMoreCount > 0
                        ? t("split.pages.previewMore", " and {{count}} more", {
                            count: previewMoreCount,
                          })
                        : "",
                  },
                )}
              </Text>
            </Paper>
          )}
        </Stack>
      );
    }

    return (
      <TextInput
        label={label}
        description={description}
        placeholder={placeholder}
        value={parameters.splitValue}
        onChange={(e) => onParameterChange("splitValue", e.target.value)}
        disabled={disabled}
      />
    );
  };

  const renderByChaptersForm = () => (
    <Stack gap="sm">
      <TextInput
        label={t("splitByChapters.bookmarkLevel", "Bookmark Level")}
        type="number"
        value={parameters.bookmarkLevel}
        onChange={(e) => onParameterChange("bookmarkLevel", e.target.value)}
        disabled={disabled}
      />
      <Checkbox
        label={t("splitByChapters.includeMetadata", "Include Metadata")}
        checked={parameters.includeMetadata}
        onChange={(e) =>
          onParameterChange("includeMetadata", e.currentTarget.checked)
        }
        disabled={disabled}
      />
      <Checkbox
        label={t(
          "splitByChapters.allowDuplicates",
          "Allow Duplicate Bookmarks",
        )}
        checked={parameters.allowDuplicates}
        onChange={(e) =>
          onParameterChange("allowDuplicates", e.currentTarget.checked)
        }
        disabled={disabled}
      />
    </Stack>
  );

  const renderByPageDividerForm = () => (
    <Stack gap="sm">
      <List size="sm" spacing={4} c="dimmed">
        {[1, 2, 3, 4].map((step) => (
          <List.Item key={step}>
            {t(`split.tooltip.byPageDivider.bullet${step}`)}
          </List.Item>
        ))}
      </List>
      <Anchor
        href="/files/Auto%20Splitter%20Divider%20(with%20instructions).pdf"
        download="promin-auto-split-divider.pdf"
        size="sm"
        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <Icon name="download" size="2rem" />
        {t(
          "autoSplitPDF.dividerDownload2",
          "Download 'Auto Splitter Divider (with instructions).pdf'",
        )}
      </Anchor>

      <Checkbox
        label={t(
          "autoSplitPDF.duplexMode",
          "Duplex Mode (Front and back scanning)",
        )}
        checked={parameters.duplexMode}
        onChange={(e) =>
          onParameterChange("duplexMode", e.currentTarget.checked)
        }
        disabled={disabled}
      />
    </Stack>
  );

  const renderByPosterForm = () => (
    <Stack gap="sm">
      <Select
        label={t("split.poster.pageSize.label", "Target Page Size")}
        description={t(
          "split.poster.pageSize.description",
          "Size of output pages for printing",
        )}
        value={parameters.pageSize || "A4"}
        onChange={(value) => onParameterChange("pageSize", value || "A4")}
        data={[
          {
            value: "A4",
            label: t("split.poster.pageSize.options.a4", "A4 (210 × 297 mm)"),
          },
          {
            value: "Letter",
            label: t(
              "split.poster.pageSize.options.letter",
              "Letter (8.5 × 11 in)",
            ),
          },
          {
            value: "A3",
            label: t("split.poster.pageSize.options.a3", "A3 (297 × 420 mm)"),
          },
          {
            value: "A5",
            label: t("split.poster.pageSize.options.a5", "A5 (148 × 210 mm)"),
          },
          {
            value: "Legal",
            label: t(
              "split.poster.pageSize.options.legal",
              "Legal (8.5 × 14 in)",
            ),
          },
          {
            value: "Tabloid",
            label: t(
              "split.poster.pageSize.options.tabloid",
              "Tabloid (11 × 17 in)",
            ),
          },
        ]}
        disabled={disabled}
        comboboxProps={{
          withinPortal: true,
          zIndex: Z_INDEX_AUTOMATE_DROPDOWN,
        }}
      />
      <TextInput
        label={t("split.poster.xFactor.label", "Horizontal Divisions")}
        description={t(
          "split.poster.xFactor.description",
          "Number of columns to split each page into",
        )}
        type="number"
        min="1"
        max="10"
        value={parameters.xFactor || 2}
        onChange={(e) => onParameterChange("xFactor", e.target.value)}
        placeholder="2"
        disabled={disabled}
      />
      <TextInput
        label={t("split.poster.yFactor.label", "Vertical Divisions")}
        description={t(
          "split.poster.yFactor.description",
          "Number of rows to split each page into",
        )}
        type="number"
        min="1"
        max="10"
        value={parameters.yFactor || 2}
        onChange={(e) => onParameterChange("yFactor", e.target.value)}
        placeholder="2"
        disabled={disabled}
      />
      <Checkbox
        label={t("split.poster.rightToLeft", "Split right-to-left")}
        checked={parameters.rightToLeft || false}
        onChange={(e) =>
          onParameterChange("rightToLeft", e.currentTarget.checked)
        }
        disabled={disabled}
      />
    </Stack>
  );

  // Don't render anything if no method is selected
  if (!parameters.method) {
    return (
      <Stack gap="sm">
        <Text c="dimmed" ta="center">
          {t(
            "split.settings.selectMethodFirst",
            "Please select a split method first",
          )}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {/* Method-Specific Form */}
      {parameters.method === SPLIT_METHODS.BY_PAGES && renderByPagesForm()}
      {parameters.method === SPLIT_METHODS.BY_SECTIONS &&
        renderBySectionsForm()}
      {(parameters.method === SPLIT_METHODS.BY_SIZE ||
        parameters.method === SPLIT_METHODS.BY_PAGE_COUNT ||
        parameters.method === SPLIT_METHODS.BY_DOC_COUNT) &&
        renderSplitValueForm()}
      {parameters.method === SPLIT_METHODS.BY_CHAPTERS &&
        renderByChaptersForm()}
      {parameters.method === SPLIT_METHODS.BY_PAGE_DIVIDER &&
        renderByPageDividerForm()}
      {parameters.method === SPLIT_METHODS.BY_POSTER && renderByPosterForm()}
    </Stack>
  );
};

export default SplitSettings;
