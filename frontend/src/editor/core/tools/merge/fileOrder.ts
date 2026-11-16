import type { FileId } from "@editor/types/file";
import type { StirlingFile } from "@editor/types/fileContext";

export type MergeSortType = "filename" | "dateModified";
export type MergeMoveDirection = "up" | "down";

export function reconcileMergeFileOrder(
  currentOrder: readonly FileId[],
  files: readonly StirlingFile[],
): FileId[] {
  const currentIds = new Set(files.map((file) => file.fileId));
  const retained = currentOrder.filter((id) => currentIds.has(id));
  const retainedIds = new Set(retained);
  const added = files
    .map((file) => file.fileId)
    .filter((id) => !retainedIds.has(id));

  return [...retained, ...added];
}

export function orderMergeFiles(
  files: readonly StirlingFile[],
  order: readonly FileId[],
): StirlingFile[] {
  const positions = new Map(order.map((id, index) => [id, index]));

  return files
    .map((file, originalIndex) => ({
      file,
      position: positions.get(file.fileId) ?? order.length + originalIndex,
    }))
    .sort((a, b) => a.position - b.position)
    .map(({ file }) => file);
}

export function moveMergeFile(
  order: readonly FileId[],
  fileId: FileId,
  direction: MergeMoveDirection,
): FileId[] {
  const index = order.indexOf(fileId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= order.length) {
    return [...order];
  }

  const nextOrder = [...order];
  [nextOrder[index], nextOrder[targetIndex]] = [
    nextOrder[targetIndex],
    nextOrder[index],
  ];

  return nextOrder;
}

export function reorderMergeFile(
  order: readonly FileId[],
  fileId: FileId,
  targetFileId: FileId,
  afterTarget = false,
): FileId[] {
  if (fileId === targetFileId) return [...order];

  const sourceIndex = order.indexOf(fileId);
  const targetIndex = order.indexOf(targetFileId);
  if (sourceIndex < 0 || targetIndex < 0) return [...order];

  const nextOrder = [...order];
  nextOrder.splice(sourceIndex, 1);
  const adjustedTargetIndex = nextOrder.indexOf(targetFileId);
  nextOrder.splice(adjustedTargetIndex + Number(afterTarget), 0, fileId);
  return nextOrder;
}

export function sortMergeFiles(
  files: readonly StirlingFile[],
  sortType: MergeSortType,
  ascending: boolean,
): StirlingFile[] {
  const sorted = [...files].sort((a, b) => {
    const comparison =
      sortType === "filename"
        ? a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        : a.lastModified - b.lastModified;

    return ascending ? comparison : -comparison;
  });

  return sorted;
}
