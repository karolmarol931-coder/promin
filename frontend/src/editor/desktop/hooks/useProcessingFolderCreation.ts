import type { ProcessingFolderCreation } from "@editor-core/hooks/useProcessingFolderCreation";

export type { ProcessingFolderCreation };

export const canCreateProcessingFolders = false;

export function useProcessingFolderCreation(): ProcessingFolderCreation {
  return { dialog: null };
}
