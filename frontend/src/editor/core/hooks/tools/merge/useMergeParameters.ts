import { BaseParameters } from "@editor/types/parameters";
import type { MergePageSizeNormalizationPlan } from "@editor/tools/merge/pageSizeAnalysis";
import {
  BaseParametersHook,
  useBaseParameters,
} from "@editor/hooks/tools/shared/useBaseParameters";

export interface MergeParameters extends BaseParameters {
  removeDigitalSignature: boolean;
  generateTableOfContents: boolean;
  normalizationPlan?: MergePageSizeNormalizationPlan | null;
}

export const defaultParameters: MergeParameters = {
  removeDigitalSignature: false,
  generateTableOfContents: false,
  normalizationPlan: null,
};

export type MergeParametersHook = BaseParametersHook<MergeParameters>;

export const useMergeParameters = (): MergeParametersHook => {
  return useBaseParameters({
    defaultParameters,
    endpointName: "merge-pdfs",
  });
};
