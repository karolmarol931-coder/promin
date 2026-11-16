import {
  SPLIT_METHODS,
  ENDPOINTS,
  type SplitMethod,
} from "@editor/constants/splitConstants";
import { BaseParameters } from "@editor/types/parameters";
import {
  useBaseParameters,
  BaseParametersHook,
} from "@editor/hooks/tools/shared/useBaseParameters";

export interface SplitParameters extends BaseParameters {
  method: SplitMethod | null;
  pages: string;
  hDiv: string;
  vDiv: string;
  merge: boolean;
  splitValue: string;
  bookmarkLevel: string;
  includeMetadata: boolean;
  allowDuplicates: boolean;
  duplexMode: boolean;
  splitMode?: string;
  customPages?: string;
  pageSize?: string;
  xFactor?: string;
  yFactor?: string;
  rightToLeft?: boolean;
}

export type SplitParametersHook = BaseParametersHook<SplitParameters>;

export const defaultParameters: SplitParameters = {
  method: SPLIT_METHODS.BY_PAGES,
  pages: "",
  hDiv: "2",
  vDiv: "2",
  merge: false,
  splitValue: "",
  bookmarkLevel: "1",
  includeMetadata: false,
  allowDuplicates: false,
  duplexMode: false,
  splitMode: "SPLIT_ALL",
  customPages: "",
  pageSize: "A4",
  xFactor: "2",
  yFactor: "2",
  rightToLeft: false,
};

/** Whether these parameters are complete enough to run. Shared by the tool's settings
 * hook and its operationConfig, so the editor and the pipeline builder agree. */
const isPositiveInteger = (value: string, maximum?: number): boolean => {
  if (!/^\d+$/.test(value.trim())) return false;
  const parsed = Number(value);
  return (
    parsed > 0 &&
    Number.isSafeInteger(parsed) &&
    (maximum == null || parsed <= maximum)
  );
};

const isValidPagePointList = (value: string, pageCount?: number): boolean => {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) return false;

  const allIndex = parts.findIndex((part) => part.toLowerCase() === "all");
  if (allIndex !== -1 && parts.length > 1) return false;

  const simplePagePoints = parts.every(
    (part) => /^\d+$/.test(part) || /^(\d+)\s*-\s*(\d*)$/.test(part),
  );
  if (simplePagePoints) {
    let previousCutPage = 0;
    for (const part of parts) {
      const rangeMatch = /^(\d+)\s*-\s*(\d*)$/.exec(part);
      const start = Number(rangeMatch ? rangeMatch[1] : part);
      const hasEnd = Boolean(rangeMatch?.[2]);
      const end = rangeMatch
        ? hasEnd
          ? Number(rangeMatch[2])
          : pageCount
        : start;

      if (pageCount == null && rangeMatch && !hasEnd) {
        if (part !== parts.at(-1)) return false;
        if (start <= previousCutPage) return false;
        previousCutPage = Number.POSITIVE_INFINITY;
        continue;
      }

      const lastListedPage = Math.min(
        end ?? Number.POSITIVE_INFINITY,
        pageCount ?? Number.POSITIVE_INFINITY,
      );
      if (lastListedPage >= start) {
        if (start <= previousCutPage) return false;
        previousCutPage = lastListedPage;
      }
    }
  }

  let hasUsableCutPoint = false;
  for (const part of parts) {
    if (part.toLowerCase() === "all") {
      if (pageCount != null && pageCount <= 1) return false;
      hasUsableCutPoint = true;
      continue;
    }

    const functionMatch = /^(\d*)n(?:([+-])(\d+))?$/i.exec(part);
    if (functionMatch) {
      if (pageCount == null) {
        hasUsableCutPoint = true;
        continue;
      }

      const coefficient = Number(functionMatch[1] || "1");
      const offset = functionMatch[3]
        ? Number(`${functionMatch[2]}${functionMatch[3]}`)
        : 0;
      const firstPage =
        coefficient > 0
          ? Math.max(1, Math.ceil((1 - offset) / coefficient))
          : 1;
      const firstCutPoint = Math.trunc(coefficient * firstPage + offset);
      if (
        firstPage <= pageCount &&
        firstCutPoint > 0 &&
        firstCutPoint < pageCount
      )
        hasUsableCutPoint = true;
      continue;
    }

    const rangeMatch = /^(\d+)\s*-\s*(\d*)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = rangeMatch[2] ? Number(rangeMatch[2]) : pageCount;
      if (!Number.isSafeInteger(start) || start < 1) return false;
      if (
        rangeMatch[2] &&
        (end == null || !Number.isSafeInteger(end) || end < start)
      )
        return false;
      if (pageCount != null && start > pageCount) return false;
      if (pageCount == null || start < pageCount) hasUsableCutPoint = true;
      continue;
    }

    if (!/^\d+$/.test(part)) return false;
    const page = Number(part);
    if (!Number.isSafeInteger(page) || page < 1) return false;
    if (pageCount != null && page > pageCount) return false;
    if (pageCount == null || page < pageCount) hasUsableCutPoint = true;
  }

  return hasUsableCutPoint;
};

const isPositiveSize = (value: string): boolean => {
  const normalized = value.trim().replace(/,/g, ".").replace(/\s/g, "");
  const match = /^(\d+(?:\.\d+)?)(TB|GB|MB|KB|B)?$/i.exec(normalized);
  return (
    match != null && Number(match[1]) > 0 && Number.isFinite(Number(match[1]))
  );
};

export function validateSplitParameters(
  params: SplitParameters,
  pageCount?: number,
): boolean {
  switch (params.method) {
    case SPLIT_METHODS.BY_PAGES:
      return isValidPagePointList(params.pages, pageCount);
    case SPLIT_METHODS.BY_SECTIONS:
      if (
        !isPositiveInteger(params.hDiv, 300) ||
        !isPositiveInteger(params.vDiv, 300)
      )
        return false;
      if (params.splitMode === "CUSTOM") {
        return isValidPagePointList(params.customPages || "");
      }
      return true;
    case SPLIT_METHODS.BY_SIZE:
      return isPositiveSize(params.splitValue);
    case SPLIT_METHODS.BY_PAGE_COUNT:
    case SPLIT_METHODS.BY_DOC_COUNT:
      return isPositiveInteger(params.splitValue);
    case SPLIT_METHODS.BY_CHAPTERS:
      return /^\d+$/.test(params.bookmarkLevel.trim());
    case SPLIT_METHODS.BY_PAGE_DIVIDER:
      return true; // No required parameters
    case SPLIT_METHODS.BY_POSTER:
      return (
        ["A4", "Letter", "A3", "A5", "Legal", "Tabloid"].includes(
          params.pageSize || "",
        ) &&
        isPositiveInteger(params.xFactor || "", 10) &&
        isPositiveInteger(params.yFactor || "", 10)
      );
    default:
      return false;
  }
}

export const useSplitParameters = (): SplitParametersHook => {
  return useBaseParameters({
    defaultParameters,
    endpointName: (params) =>
      params.method
        ? ENDPOINTS[params.method]
        : ENDPOINTS[SPLIT_METHODS.BY_PAGES],
    validateFn: validateSplitParameters,
  });
};
