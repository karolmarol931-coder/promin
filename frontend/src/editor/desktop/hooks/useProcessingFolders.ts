import { useProcessingFolders as useCoreProcessingFolders } from "@editor-core/hooks/useProcessingFolders";
import type { FolderRecord } from "@editor/types/folder";

export type {
  MountedFileState,
  ProcessingFolderState,
  ProcessingRunInfo,
} from "@editor-core/hooks/useProcessingFolders";
import type {
  ProcessingFoldersApi as CoreProcessingFoldersApi,
  ProcessingRecordSummary as CoreProcessingRecordSummary,
} from "@editor-core/hooks/useProcessingFolders";
import type { WireRoutingRule } from "@editor/policies/types";

export interface ProcessingRecordSummary extends CoreProcessingRecordSummary {
  categoryId?: string;
  outputIds?: string[];
  routingRules?: WireRoutingRule[];
}

export interface ProcessingFoldersApi extends Omit<
  CoreProcessingFoldersApi,
  "recordFor"
> {
  recordFor: (folder: FolderRecord) => ProcessingRecordSummary | undefined;
}

export function useProcessingFolders(): ProcessingFoldersApi {
  return useCoreProcessingFolders();
}
