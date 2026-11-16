import React, { useEffect, useRef, useState } from "react";
import { Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Button } from "@editor/ui/Button";
import { Icon } from "@editor/ui/Icon";
import ErrorNotification from "@editor/components/tools/shared/ErrorNotification";
import ResultsPreview from "@editor/components/tools/shared/ResultsPreview";
import { SuggestedToolsSection } from "@editor/components/tools/shared/SuggestedToolsSection";
import { ToolOperationHook } from "@editor/hooks/tools/shared/useToolOperation";
import { Tooltip } from "@editor/components/shared/Tooltip";
import { useFileActionTerminology } from "@editor/hooks/useFileActionTerminology";
import { useFileActionIcons } from "@editor/hooks/useFileActionIcons";
import { saveOperationResults } from "@editor/services/operationResultsSaveService";
import { useFileActions, useFileSelectors } from "@editor/contexts/FileContext";
import i18n from "@editor/i18n";

/**
 * Nearest scrolling ancestor - in the right rail that is the tool panel's
 * ScrollArea viewport, whose overflow is `scroll`, not `auto`.
 */
function findScrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      /(auto|scroll|overlay)/.test(overflowY) &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export interface ReviewToolStepProps<TParams = unknown> {
  isVisible: boolean;
  operation: ToolOperationHook<TParams>;
  title?: string;
  onFileClick?: (file: File) => void;
  onUndo?: () => void;
  notice?: React.ReactNode;
  isCollapsed?: boolean;
  onCollapsedClick?: () => void;
}

function ReviewStepContent<TParams = unknown>({
  operation,
  onFileClick,
  onUndo,
  notice,
}: {
  operation: ToolOperationHook<TParams>;
  onFileClick?: (file: File) => void;
  onUndo?: () => void;
  notice?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const terminology = useFileActionTerminology();
  const icons = useFileActionIcons();
  const stepRef = useRef<HTMLDivElement>(null);
  const { actions: fileActions } = useFileActions();
  const selectors = useFileSelectors();
  const [isSaving, setIsSaving] = useState(false);
  const [savedResult, setSavedResult] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleUndo = async () => {
    try {
      onUndo?.();
    } catch (error) {
      // Error is already handled by useToolOperation, just reset loading state
      console.error("Undo operation failed:", error);
    }
  };

  const previewFiles =
    operation.files?.map((file, index) => ({
      file,
      thumbnail: operation.thumbnails[index],
    })) || [];

  const handleDownload = async () => {
    if (!operation.downloadUrl) return;
    setIsSaving(true);
    setSavedResult(false);
    setSaveError(null);
    try {
      const result = await saveOperationResults({
        downloadUrl: operation.downloadUrl,
        downloadFilename: operation.downloadFilename || "download",
        downloadLocalPath: operation.downloadLocalPath,
        outputFileIds: operation.outputFileIds,
        outputFiles: operation.files,
        getFile: (fileId) => selectors.getFile(fileId),
        getStub: (fileId) => selectors.getStirlingFileStub(fileId),
        markSaved: (fileId, savedPath) => {
          const stub = selectors.getStirlingFileStub(fileId);
          fileActions.updateStirlingFileStub(fileId, {
            localFilePath: stub?.localFilePath ?? savedPath,
            isDirty: false,
          });
        },
      });
      if (result && !result.cancelled) setSavedResult(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ReviewToolStep] Failed to download file:", message);
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setSavedResult(false);
    setSaveError(null);
  }, [operation.downloadUrl, operation.outputFileIds]);

  // Reveal the results when they appear, or the download button lands below the
  // fold behind a tall settings step and reads as missing.
  useEffect(() => {
    const hasContent =
      previewFiles.length > 0 ||
      operation.downloadUrl ||
      operation.errorMessage;
    if (!stepRef.current || !hasContent) return;

    // Small delay so the step has been laid out before it is measured.
    const timer = setTimeout(() => {
      const step = stepRef.current;
      const scroller = step && findScrollParent(step);
      if (!step || !scroller) return;

      const stepRect = step.getBoundingClientRect();
      const viewRect = scroller.getBoundingClientRect();
      // Move the least that brings the step into view, and only ever the panel
      // itself - scrollIntoView() drags every ancestor and unpins the header.
      const delta = Math.min(
        stepRect.top - viewRect.top,
        stepRect.bottom - viewRect.bottom,
      );
      if (delta > 1) {
        scroller.scrollTo({
          top: scroller.scrollTop + delta,
          behavior: "smooth",
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [previewFiles.length, operation.downloadUrl, operation.errorMessage]);

  return (
    <Stack gap="sm" ref={stepRef}>
      <ErrorNotification
        error={operation.errorMessage}
        onClose={operation.clearError}
      />
      <ErrorNotification error={saveError} onClose={() => setSaveError(null)} />

      {notice}

      {previewFiles.length > 0 && (
        <ResultsPreview
          files={previewFiles}
          onFileClick={onFileClick}
          isGeneratingThumbnails={operation.isGeneratingThumbnails}
        />
      )}

      {onUndo && (
        <Tooltip
          position="left"
          content={t(
            "undoOperationTooltip",
            "Click to undo the last operation and restore the original files",
          )}
        >
          <Button
            leftSection={<Icon name="undo-2" />}
            variant="secondary"
            accent="neutral"
            onClick={handleUndo}
            fullWidth
          >
            {t("undo", "Undo")}
          </Button>
        </Tooltip>
      )}
      {operation.downloadUrl && (
        <Button
          data-testid="download-result-button"
          leftSection={<Icon name={icons.download} />}
          fullWidth
          loading={isSaving}
          disabled={isSaving}
          style={{ marginBottom: "1rem" }}
          onClick={handleDownload}
        >
          {terminology.download}
        </Button>
      )}
      {savedResult && (
        <Text size="sm" c="green" role="status" aria-live="polite">
          {t("saved", "Saved")}
        </Text>
      )}

      <SuggestedToolsSection />
    </Stack>
  );
}

export function createReviewToolStep<TParams = unknown>(
  createStep: (
    title: string,
    props: {
      isVisible?: boolean;
      isCollapsed?: boolean;
      onCollapsedClick?: () => void;
      _excludeFromCount?: boolean;
      _noPadding?: boolean;
    },
    children?: React.ReactNode,
  ) => React.ReactElement,
  props: ReviewToolStepProps<TParams>,
): React.ReactElement {
  return createStep(
    i18n.t("review", "Review"),
    {
      isVisible: props.isVisible,
      isCollapsed: props.isCollapsed,
      onCollapsedClick: props.onCollapsedClick,
      _excludeFromCount: true,
      _noPadding: true,
    },
    <ReviewStepContent
      operation={props.operation}
      onFileClick={props.onFileClick}
      onUndo={props.onUndo}
      notice={props.notice}
    />,
  );
}
