import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, Stack, Text } from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { Modal } from "@editor/ui/Modal";
import { createToolFlow } from "@editor/components/tools/shared/createToolFlow";
import MergeSettings from "@editor/components/tools/merge/MergeSettings";
import MergeFileSorter from "@editor/components/tools/merge/MergeFileSorter";
import { useMergeParameters } from "@editor/hooks/tools/merge/useMergeParameters";
import { useMergeOperation } from "@editor/hooks/tools/merge/useMergeOperation";
import { useBaseTool } from "@editor/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@editor/types/tool";
import { useMergeTips } from "@editor/components/tooltips/useMergeTips";
import {
  useNavigationState,
  useNavigationActions,
} from "@editor/contexts/NavigationContext";
import type { FileId } from "@editor/types/file";
import {
  analyzeMergePageSizes,
  type MergePageSizeNormalizationPlan,
} from "@editor/tools/merge/pageSizeAnalysis";
import {
  moveMergeFile,
  orderMergeFiles,
  reorderMergeFile,
  reconcileMergeFileOrder,
  sortMergeFiles,
  type MergeMoveDirection,
  type MergeSortType,
} from "@editor/tools/merge/fileOrder";

const Merge = (props: BaseToolProps) => {
  const { t } = useTranslation();
  const mergeTips = useMergeTips();

  const [fileOrder, setFileOrder] = useState<FileId[]>([]);
  const [normalizationReview, setNormalizationReview] =
    useState<MergePageSizeNormalizationPlan | null>(null);
  const [checkingPageSizes, setCheckingPageSizes] = useState(false);
  const orderFiles = useCallback(
    (files: Parameters<typeof orderMergeFiles>[0]) =>
      orderMergeFiles(files, fileOrder),
    [fileOrder],
  );

  const base = useBaseTool(
    "merge",
    useMergeParameters,
    useMergeOperation,
    props,
    {
      minFiles: 2,
      ignoreViewerScope: true,
      orderFiles,
    },
  );

  const reconciledOrder = reconcileMergeFileOrder(
    fileOrder,
    base.selectedFiles,
  );
  useEffect(() => {
    if (
      reconciledOrder.length !== fileOrder.length ||
      reconciledOrder.some((id, index) => id !== fileOrder[index])
    ) {
      setFileOrder(reconciledOrder);
    }
  }, [fileOrder, reconciledOrder]);

  const { workbench } = useNavigationState();
  const { actions: navActions } = useNavigationActions();
  const isViewerMode = workbench === "viewer";

  const hasAutoSwitchedRef = useRef(false);
  const selectedFileKey = base.selectedFiles
    .map((file) => file.fileId)
    .join("|");
  const selectedFileKeyRef = useRef(selectedFileKey);
  selectedFileKeyRef.current = selectedFileKey;
  const previousSelectedFileKey = useRef(selectedFileKey);
  useEffect(() => {
    if (previousSelectedFileKey.current !== selectedFileKey) {
      previousSelectedFileKey.current = selectedFileKey;
      setNormalizationReview(null);
    }
  }, [selectedFileKey]);

  const handleMergeClick = useCallback(async () => {
    if (checkingPageSizes || base.operation.isLoading) return;
    const filesToAnalyze = base.selectedFiles;
    const analysisFileKey = filesToAnalyze.map((file) => file.fileId).join("|");
    setCheckingPageSizes(true);
    let plan: MergePageSizeNormalizationPlan | null = null;
    try {
      plan = await analyzeMergePageSizes(filesToAnalyze);
    } finally {
      setCheckingPageSizes(false);
    }
    if (selectedFileKeyRef.current !== analysisFileKey) return;
    if (plan) {
      setNormalizationReview(plan);
      return;
    }
    await base.handleExecute({ normalizationPlan: null });
  }, [
    base.handleExecute,
    base.operation.isLoading,
    base.selectedFiles,
    checkingPageSizes,
  ]);

  const mergeWithPageSizeChoice = useCallback(
    (plan: MergePageSizeNormalizationPlan | null) => {
      setNormalizationReview(null);
      void base.handleExecute({ normalizationPlan: plan });
    },
    [base.handleExecute],
  );

  useEffect(() => {
    if (isViewerMode && !hasAutoSwitchedRef.current) {
      hasAutoSwitchedRef.current = true;
      navActions.setWorkbench("fileEditor");
    }
  }, []);
  const sortFiles = useCallback(
    (sortType: MergeSortType, ascending: boolean = true) => {
      setFileOrder(
        sortMergeFiles(base.selectedFiles, sortType, ascending).map(
          (file) => file.fileId,
        ),
      );
    },
    [base.selectedFiles],
  );

  const moveFile = useCallback(
    (fileId: FileId, direction: MergeMoveDirection) => {
      setFileOrder((currentOrder) =>
        moveMergeFile(currentOrder, fileId, direction),
      );
    },
    [],
  );

  const reorderFile = useCallback(
    (fileId: FileId, targetFileId: FileId, afterTarget: boolean) => {
      setFileOrder((currentOrder) =>
        reorderMergeFile(currentOrder, fileId, targetFileId, afterTarget),
      );
    },
    [],
  );

  const flow = createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
      minFiles: 2,
    },
    steps: [
      {
        title: t("merge.sortFiles.title", "Arrange files"),
        isCollapsed: base.settingsCollapsed,
        onCollapsedClick: base.settingsCollapsed
          ? base.handleSettingsReset
          : undefined,
        tooltip: mergeTips,
        content: (
          <Stack gap="sm">
            <MergeFileSorter
              files={base.selectedFiles}
              onSortFiles={sortFiles}
              onMoveFile={moveFile}
              onReorderFile={reorderFile}
              disabled={!base.hasFiles || base.endpointLoading}
            />
            <Accordion variant="contained" radius="sm">
              <Accordion.Item value="settings">
                <Accordion.Control>
                  {t("merge.settings.moreOptions", "More options")}
                </Accordion.Control>
                <Accordion.Panel>
                  <MergeSettings
                    parameters={base.params.parameters}
                    onParameterChange={base.params.updateParameter}
                    disabled={base.endpointLoading}
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        ),
      },
    ],
    executeButton: {
      text: checkingPageSizes
        ? t("merge.checkingPageSizes", "Checking page sizes…")
        : t("merge.submit", "Merge PDFs"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: handleMergeClick,
      disabled: checkingPageSizes,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
      disabledReason: isViewerMode ? "viewerMode" : undefined,
    },
    belowExecuteButton: checkingPageSizes ? (
      <Text size="xs" c="dimmed" ta="center" mx="md">
        {t(
          "merge.checkingPageSizesHint",
          "Checking selected PDF pages before merging.",
        )}
      </Text>
    ) : isViewerMode && !base.hasResults ? (
      <Stack align="center" gap={6} mx="md" mt={4}>
        <Text size="xs" c="dimmed" ta="center">
          {t(
            "merge.viewerModeHint",
            "Merge needs 2 or more files. Head to the file editor to select them.",
          )}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navActions.setWorkbench("fileEditor")}
        >
          {t("merge.goToFileEditor", "Go to file editor")}
        </Button>
      </Stack>
    ) : undefined,
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("merge.title", "Merge Results"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });

  return (
    <>
      {flow}
      <Modal
        open={normalizationReview !== null}
        onClose={() => setNormalizationReview(null)}
        title={t("merge.normalize.title", "Unusually sized pages found")}
        subtitle={t(
          "merge.normalize.subtitle",
          "Some pages are much larger or smaller than the main page size.",
        )}
        width="md"
        footer={
          <Stack gap="sm">
            <Button
              onClick={() => mergeWithPageSizeChoice(normalizationReview)}
              disabled={!normalizationReview}
              fullWidth
            >
              {t("merge.normalize.confirm", "Normalize pages and merge")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => mergeWithPageSizeChoice(null)}
              fullWidth
            >
              {t("merge.normalize.keepSizes", "Keep page sizes and merge")}
            </Button>
          </Stack>
        }
      >
        {normalizationReview && (
          <Stack gap="sm">
            <Text>
              {t(
                "merge.normalize.description",
                "You can scale only the unusual pages to the size used by most pages. Content keeps its proportions and is centered without cropping. Original files are not changed.",
              )}
            </Text>
            <Text fw={600}>
              {t("merge.normalize.targetSize", "Main page size")}:{" "}
              {normalizationReview.portraitWidth.toFixed(0)} ×{" "}
              {normalizationReview.portraitHeight.toFixed(0)} pt
            </Text>
            <Text fw={600}>
              {t("merge.normalize.pages", "Pages to normalize")}
            </Text>
            <ul>
              {normalizationReview.pages.slice(0, 8).map((page) => (
                <li key={`${page.fileIndex}:${page.pageIndex}`}>
                  {base.selectedFiles[page.fileIndex]?.name ??
                    t("merge.normalize.unknownFile", "PDF")}
                  {" — "}
                  {t("merge.normalize.pageNumber", "page")} {page.pageIndex + 1}
                </li>
              ))}
            </ul>
            {normalizationReview.pages.length > 8 && (
              <Text size="sm" c="dimmed">
                {t("merge.normalize.morePages", "and {{count}} more pages", {
                  count: normalizationReview.pages.length - 8,
                })}
              </Text>
            )}
            <Text size="sm" c="dimmed">
              {t("merge.normalize.scale", "Approximate size difference")}:{" "}
              {normalizationReview.outlierScale >= 1
                ? `${normalizationReview.outlierScale.toFixed(1)}×`
                : `${(1 / normalizationReview.outlierScale).toFixed(1)}×`}
            </Text>
          </Stack>
        )}
      </Modal>
    </>
  );
};

export default Merge as ToolComponent;
