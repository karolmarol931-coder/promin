import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { OCRParameters } from "@editor-core/hooks/tools/ocr/useOCRParameters";
import { defaultParameters } from "@editor-core/hooks/tools/ocr/useOCRParameters";
import {
  defineCustomTool,
  useToolOperation,
} from "@editor/hooks/tools/shared/useToolOperation";
import { createStandardErrorHandler } from "@editor/utils/toolErrorHandler";
import { runLocalOcr } from "@editor/services/ocr/localOcrService";

const OCR_ENDPOINT = "/api/v1/misc/ocr-pdf" as const;

export const ocrOperationConfig = defineCustomTool<OCRParameters>({
  operationType: "ocr",
  endpoint: OCR_ENDPOINT,
  defaultParameters,
  validateParams: (parameters) => parameters.languages.length > 0,
  customProcessor: async (parameters, files, reportProgress) => ({
    files: await runLocalOcr(parameters, files, reportProgress),
  }),
});

export {
  buildOCRFormData,
  ocrResponseHandler,
} from "@editor-core/hooks/tools/ocr/useOCROperation";

export function useOCROperation() {
  const { t } = useTranslation();
  const customProcessor = useCallback(ocrOperationConfig.customProcessor, []);
  return useToolOperation<OCRParameters>({
    ...ocrOperationConfig,
    customProcessor: async (parameters, files, reportProgress) => {
      try {
        return await customProcessor(parameters, files, reportProgress);
      } catch (error) {
        const message = (error as { message?: string }).message;
        if (message === "OCR_NO_SCANNED_PAGES") {
          throw new Error(
            t(
              "ocr.local.noScannedPages",
              "No scanned pages were found. This PDF already contains selectable text.",
            ),
            { cause: error },
          );
        }
        if (message === "OCR_TEXT_ALREADY_PRESENT") {
          throw new Error(
            t(
              "ocr.local.textAlreadyPresent",
              "This PDF already contains selectable text. Choose Force OCR to rebuild it.",
            ),
            { cause: error },
          );
        }
        throw error;
      }
    },
    getErrorMessage: (error) =>
      createStandardErrorHandler(t("ocr.error.failed", "OCR operation failed"))(
        error,
      ),
  });
}
