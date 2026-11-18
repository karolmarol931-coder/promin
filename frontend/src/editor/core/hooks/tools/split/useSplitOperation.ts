import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  useToolOperation,
  ToolOperationConfig,
  defineSingleFileTool,
} from "@editor/hooks/tools/shared/useToolOperation";
import {
  objectToFormData,
  type ToolApiParams,
  type ToolEndpoint,
} from "@editor/hooks/tools/shared/toolApiMapping";
import { createStandardErrorHandler } from "@editor/utils/toolErrorHandler";
import {
  validateSplitParameters,
  SplitParameters,
  defaultParameters,
} from "@editor/hooks/tools/split/useSplitParameters";
import {
  SPLIT_METHODS,
  type SplitMethod,
} from "@editor/constants/splitConstants";
import { zipFileService } from "@editor/services/zipFileService";

// Split routes to a different endpoint per method. This map is the single source
// of truth: getSplitEndpoint returns from it, and the mapper types below are
// derived from it, so the endpoint posted and the request shape checked can
// never point at different endpoints.
const SPLIT_ENDPOINTS = {
  [SPLIT_METHODS.BY_PAGES]: "/api/v1/general/split-pages",
  [SPLIT_METHODS.BY_SECTIONS]: "/api/v1/general/split-pdf-by-sections",
  [SPLIT_METHODS.BY_SIZE]: "/api/v1/general/split-by-size-or-count",
  [SPLIT_METHODS.BY_PAGE_COUNT]: "/api/v1/general/split-by-size-or-count",
  [SPLIT_METHODS.BY_DOC_COUNT]: "/api/v1/general/split-by-size-or-count",
  [SPLIT_METHODS.BY_CHAPTERS]: "/api/v1/general/split-pdf-by-chapters",
  [SPLIT_METHODS.BY_PAGE_DIVIDER]: "/api/v1/misc/auto-split-pdf",
  [SPLIT_METHODS.BY_POSTER]: "/api/v1/general/split-for-poster-print",
} as const satisfies Record<SplitMethod, ToolEndpoint>;

type SplitEndpoint = (typeof SPLIT_ENDPOINTS)[SplitMethod];
type SplitApiParams = ToolApiParams[SplitEndpoint];
type SectionsApiParams =
  ToolApiParams[(typeof SPLIT_ENDPOINTS)[typeof SPLIT_METHODS.BY_SECTIONS]];
type PosterApiParams =
  ToolApiParams[(typeof SPLIT_ENDPOINTS)[typeof SPLIT_METHODS.BY_POSTER]];

// Convert the tool's UI parameters into the request body for the routed endpoint.
export const splitToApiParams = (
  parameters: SplitParameters,
): SplitApiParams => {
  // Use BY_PAGES as default if no method is selected
  const method = parameters.method || SPLIT_METHODS.BY_PAGES;

  switch (method) {
    case SPLIT_METHODS.BY_PAGES:
      return { pageNumbers: parameters.pages };
    case SPLIT_METHODS.BY_SECTIONS: {
      const sections: SectionsApiParams = {
        horizontalDivisions: Number(parameters.hDiv || "2"),
        verticalDivisions: Number(parameters.vDiv || "2"),
        merge: parameters.merge ?? false,
        splitMode: (parameters.splitMode ||
          "SPLIT_ALL") as SectionsApiParams["splitMode"],
      };
      if (parameters.splitMode === "CUSTOM" && parameters.customPages) {
        sections.pageNumbers = parameters.customPages;
      }
      return sections;
    }
    case SPLIT_METHODS.BY_SIZE:
      return { splitType: 0, splitValue: parameters.splitValue };
    case SPLIT_METHODS.BY_PAGE_COUNT:
      return { splitType: 1, splitValue: parameters.splitValue };
    case SPLIT_METHODS.BY_DOC_COUNT:
      return { splitType: 2, splitValue: parameters.splitValue };
    case SPLIT_METHODS.BY_CHAPTERS:
      return {
        bookmarkLevel: Number(parameters.bookmarkLevel || "1"),
        includeMetadata: parameters.includeMetadata ?? false,
        allowDuplicates: parameters.allowDuplicates ?? false,
      };
    case SPLIT_METHODS.BY_PAGE_DIVIDER:
      return { duplexMode: parameters.duplexMode ?? false };
    case SPLIT_METHODS.BY_POSTER:
      return {
        pageSize: (parameters.pageSize || "A4") as PosterApiParams["pageSize"],
        xFactor: Number(parameters.xFactor || "2"),
        yFactor: Number(parameters.yFactor || "2"),
        rightToLeft: parameters.rightToLeft ?? false,
      };
    default:
      throw new Error(`Unknown split method: ${method}`);
  }
};

// Reconstruct the tool's UI parameters from a stored request body. The step
// carries no explicit method, so it is inferred from the fields present.
export const splitFromApiParams = (
  apiParams: SplitApiParams,
): Partial<SplitParameters> => {
  if ("pageSize" in apiParams) {
    return {
      method: SPLIT_METHODS.BY_POSTER,
      pageSize: apiParams.pageSize,
      xFactor:
        apiParams.xFactor !== undefined ? `${apiParams.xFactor}` : undefined,
      yFactor:
        apiParams.yFactor !== undefined ? `${apiParams.yFactor}` : undefined,
      rightToLeft: apiParams.rightToLeft ?? defaultParameters.rightToLeft,
    };
  }
  if ("horizontalDivisions" in apiParams || "verticalDivisions" in apiParams) {
    return {
      method: SPLIT_METHODS.BY_SECTIONS,
      hDiv:
        apiParams.horizontalDivisions !== undefined
          ? `${apiParams.horizontalDivisions}`
          : undefined,
      vDiv:
        apiParams.verticalDivisions !== undefined
          ? `${apiParams.verticalDivisions}`
          : undefined,
      merge: apiParams.merge ?? false,
      splitMode: apiParams.splitMode ?? "SPLIT_ALL",
      customPages:
        apiParams.splitMode === "CUSTOM"
          ? apiParams.pageNumbers
          : defaultParameters.customPages,
    };
  }
  if ("bookmarkLevel" in apiParams) {
    return {
      method: SPLIT_METHODS.BY_CHAPTERS,
      bookmarkLevel:
        apiParams.bookmarkLevel !== undefined
          ? `${apiParams.bookmarkLevel}`
          : "",
      includeMetadata: apiParams.includeMetadata ?? false,
      allowDuplicates: apiParams.allowDuplicates ?? false,
    };
  }
  if ("splitType" in apiParams) {
    const methodBySplitType = {
      0: SPLIT_METHODS.BY_SIZE,
      1: SPLIT_METHODS.BY_PAGE_COUNT,
      2: SPLIT_METHODS.BY_DOC_COUNT,
    } as const;
    return {
      method: methodBySplitType[apiParams.splitType as 0 | 1 | 2],
      splitValue: apiParams.splitValue ?? "",
    };
  }
  if ("duplexMode" in apiParams) {
    return {
      method: SPLIT_METHODS.BY_PAGE_DIVIDER,
      duplexMode: apiParams.duplexMode ?? false,
    };
  }
  const pages = "pageNumbers" in apiParams ? apiParams.pageNumbers : undefined;
  return {
    method: SPLIT_METHODS.BY_PAGES,
    pages: pages ?? defaultParameters.pages,
  };
};

// Static functions that can be used by both the hook and automation executor
export const buildSplitFormData = (
  parameters: SplitParameters,
  file: File,
): FormData =>
  objectToFormData(splitToApiParams(parameters), { fileInput: file });

export const getSplitEndpoint = (parameters: SplitParameters): SplitEndpoint =>
  // Default to BY_PAGES when no method is selected yet.
  SPLIT_ENDPOINTS[parameters.method ?? SPLIT_METHODS.BY_PAGES];

export const extractSplitResultFiles = async (blob: Blob): Promise<File[]> => {
  const archive =
    blob instanceof File
      ? blob
      : new File([blob], "split-results.zip", { type: "application/zip" });
  const extraction = await zipFileService.extractAllFiles(archive);

  if (
    !extraction.success ||
    extraction.extractedFiles.length === 0 ||
    extraction.errors.length > 0 ||
    extraction.extractedCount !== extraction.totalFiles
  ) {
    throw new Error(
      extraction.errors.join(" ") || "Split did not return all result files.",
    );
  }

  const allResultsArePdfs = extraction.extractedFiles.every((file) =>
    file.name.toLowerCase().endsWith(".pdf"),
  );
  if (!allResultsArePdfs) {
    throw new Error("Split returned files that are not PDFs.");
  }

  return extraction.extractedFiles;
};

// Static configuration object
export const splitOperationConfig = defineSingleFileTool({
  validateParams: validateSplitParameters,
  buildFormData: buildSplitFormData,
  toApiParams: splitToApiParams,
  fromApiParams: splitFromApiParams,
  operationType: "split",
  endpoint: getSplitEndpoint,
  // Full routing set: a stored step maps back to Split though its `method` selector is frontend-only.
  endpoints: Array.from(new Set(Object.values(SPLIT_ENDPOINTS))),
  defaultParameters,
});

export const useSplitOperation = () => {
  const { t } = useTranslation();

  const responseHandler = useCallback(
    async (blob: Blob, _originalFiles: File[]): Promise<File[]> => {
      return await extractSplitResultFiles(blob);
    },
    [],
  );

  const splitConfig: ToolOperationConfig<SplitParameters> = {
    ...splitOperationConfig,
    responseHandler,
    getErrorMessage: createStandardErrorHandler(
      t("split.error.failed", "An error occurred while splitting the PDF."),
    ),
  };

  return useToolOperation(splitConfig);
};
