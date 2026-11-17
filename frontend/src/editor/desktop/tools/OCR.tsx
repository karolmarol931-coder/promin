import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useViewScopedFiles } from "@editor/hooks/tools/shared/useViewScopedFiles";
import { createToolFlow } from "@editor/components/tools/shared/createToolFlow";
import OCRSettings from "@editor/components/tools/ocr/OCRSettings";
import { useOCRParameters } from "@editor/hooks/tools/ocr/useOCRParameters";
import { useOCROperation } from "@editor/hooks/tools/ocr/useOCROperation";
import type { BaseToolProps, ToolComponent } from "@editor/types/tool";

const OCR = ({ onPreviewFile, onComplete, onError }: BaseToolProps) => {
  const { t } = useTranslation();
  const selectedFiles = useViewScopedFiles();
  const parameters = useOCRParameters();
  const operation = useOCROperation();
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const hasFiles = selectedFiles.length > 0;
  const hasResults =
    operation.files.length > 0 || operation.downloadUrl !== null;

  useEffect(() => {
    operation.resetResults();
    onPreviewFile?.(null);
  }, [parameters.parameters]);

  useEffect(() => {
    if (hasFiles && !hasResults) setSettingsExpanded(true);
  }, [hasFiles, hasResults]);

  useEffect(() => {
    if (hasResults) setSettingsExpanded(false);
  }, [hasResults]);

  const handleOcr = async () => {
    try {
      await operation.executeOperation(parameters.parameters, selectedFiles);
      if (operation.files.length > 0) onComplete?.(operation.files);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "OCR operation failed",
      );
    }
  };

  return createToolFlow({
    files: {
      selectedFiles:
        operation.getEligibleFiles?.(parameters.parameters, selectedFiles) ??
        selectedFiles,
      isCollapsed: hasResults,
    },
    steps: [
      {
        title: t("ocr.settings.title", "Settings"),
        isCollapsed: !hasFiles || !settingsExpanded,
        onCollapsedClick: hasResults
          ? operation.resetResults
          : () => setSettingsExpanded((expanded) => !expanded),
        content: (
          <OCRSettings
            parameters={parameters.parameters}
            onParameterChange={parameters.updateParameter}
            disabled={operation.isLoading}
          />
        ),
      },
    ],
    executeButton: {
      text: t("ocr.operation.submit", "Recognize text"),
      loadingText: t("loading"),
      onClick: handleOcr,
      isVisible: !hasResults,
      endpointEnabled: true,
      paramsValid: parameters.validateParameters(),
    },
    review: {
      isVisible: hasResults,
      operation,
      title: t("ocr.results.title", "OCR Results"),
      onFileClick: (file) => {
        onPreviewFile?.(file);
        sessionStorage.setItem("previousMode", "ocr");
      },
      onUndo: async () => {
        await operation.undoOperation();
        onPreviewFile?.(null);
      },
    },
  });
};

OCR.tool = () => useOCROperation;

export default OCR as ToolComponent;
