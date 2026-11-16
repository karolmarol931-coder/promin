import { Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { createToolFlow } from "@editor/components/tools/shared/createToolFlow";
import SplitMethodSelector from "@editor/components/tools/split/SplitMethodSelector";
import SplitSettings from "@editor/components/tools/split/SplitSettings";
import { useSplitParameters } from "@editor/hooks/tools/split/useSplitParameters";
import { useSplitOperation } from "@editor/hooks/tools/split/useSplitOperation";
import { useBaseTool } from "@editor/hooks/tools/shared/useBaseTool";
import { useSplitSettingsTips } from "@editor/components/tooltips/useSplitSettingsTips";
import { BaseToolProps, ToolComponent } from "@editor/types/tool";
import {
  METHOD_OPTIONS,
  ENDPOINTS,
  SPLIT_METHODS,
} from "@editor/constants/splitConstants";
import { useMultipleEndpointsEnabled } from "@editor/hooks/useEndpointConfig";
import { useViewScopedFileStubs } from "@editor/hooks/tools/shared/useViewScopedFiles";
import { validateSplitParameters } from "@editor/hooks/tools/split/useSplitParameters";

const Split = (props: BaseToolProps) => {
  const { t } = useTranslation();

  const base = useBaseTool(
    "split",
    useSplitParameters,
    useSplitOperation,
    props,
  );

  // Check which split endpoints are available
  const allSplitEndpoints = useMemo(() => Object.values(ENDPOINTS), []);
  const { endpointStatus } = useMultipleEndpointsEnabled(allSplitEndpoints);

  // Filter METHOD_OPTIONS to only show methods with enabled endpoints
  const availableMethodOptions = useMemo(() => {
    return METHOD_OPTIONS.filter((option) => {
      const endpoint = ENDPOINTS[option.value];
      // If endpoint status is not loaded yet, show all options (optimistic)
      // If endpoint is explicitly disabled (false), hide the option
      return endpointStatus[endpoint] !== false;
    });
  }, [endpointStatus]);

  const settingsTips = useSplitSettingsTips(base.params.parameters.method);
  const fileStubs = useViewScopedFileStubs();
  const pageCounts = fileStubs.map((file) => file.processedFile?.totalPages);
  const allPageCountsKnown =
    pageCounts.length > 0 &&
    pageCounts.every((count): count is number => count != null && count > 0);
  const pageCount = allPageCountsKnown ? Math.min(...pageCounts) : undefined;

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
    },
    steps: [
      {
        title: t("split.steps.chooseMethod", "Choose Method"),
        isCollapsed: base.hasResults,
        onCollapsedClick: base.hasResults
          ? base.handleSettingsReset
          : undefined,
        tooltip:
          base.params.parameters.method === SPLIT_METHODS.BY_PAGES
            ? undefined
            : settingsTips || undefined,
        content: (
          <Stack gap="md">
            <SplitMethodSelector
              options={availableMethodOptions}
              selectedMethod={base.params.parameters.method}
              onSelect={(method) =>
                base.params.updateParameter("method", method)
              }
              disabled={base.endpointLoading}
            />
            {base.params.parameters.method && (
              <SplitSettings
                parameters={base.params.parameters}
                onParameterChange={base.params.updateParameter}
                pageCount={pageCount}
                disabled={base.endpointLoading}
              />
            )}
          </Stack>
        ),
      },
    ],
    executeButton: {
      text: t("split.submit", "Split PDF"),
      loadingText: t("loading"),
      onClick: base.handleExecute,
      isVisible: !base.hasResults,
      endpointEnabled: base.endpointEnabled,
      paramsValid: validateSplitParameters(base.params.parameters, pageCount),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("split.resultsTitle", "Split Results"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

export default Split as ToolComponent;
