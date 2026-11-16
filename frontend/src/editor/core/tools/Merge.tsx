import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, Stack, Text } from "@mantine/core";
import { Button } from "@editor/ui/Button";
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
    { minFiles: 2, ignoreViewerScope: true, orderFiles },
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

  return createToolFlow({
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
      text: t("merge.submit", "Merge PDFs"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
      disabledReason: isViewerMode ? "viewerMode" : undefined,
    },
    belowExecuteButton:
      isViewerMode && !base.hasResults ? (
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
};

export default Merge as ToolComponent;
