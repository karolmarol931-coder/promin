import type { FileId } from "@editor/types/fileContext";
import type { OperationSaveContext } from "@editor-core/services/operationResultsSaveService";
import {
  downloadFromUrl,
  DownloadResult,
} from "@editor/services/downloadService";
// Save through the export gateway so a "run on export" policy enforces before
// the file is written out (no-op when no such policy is active).
import { downloadFileWithPolicy as downloadFile } from "@editor/services/exportWithPolicy";

export type { OperationSaveContext };

export async function saveOperationResults(
  context: OperationSaveContext,
): Promise<DownloadResult | null> {
  if (!context.downloadUrl) return null;

  const outputFileIds = context.outputFileIds ?? [];
  const outputFiles = outputFileIds.map(
    (fileId, index) =>
      context.getFile(fileId as FileId) ?? context.outputFiles?.[index],
  );

  if (
    outputFileIds.length > 0 &&
    outputFiles.every((file): file is File => file instanceof File)
  ) {
    const savedPaths: string[] = [];
    for (const [index, fileId] of outputFileIds.entries()) {
      const file = outputFiles[index];
      const typedFileId = fileId as FileId;
      const stub = context.getStub(typedFileId);

      const result = await downloadFile({
        data: file,
        filename: file.name,
        localPath: stub?.localFilePath,
        fileId: typedFileId,
      });

      if (result.cancelled) return result;
      if (!result.savedPath) return result;

      savedPaths.push(result.savedPath);
      context.markSaved(typedFileId, result.savedPath);
    }
    return savedPaths.length === 1 ? { savedPath: savedPaths[0] } : {};
  }

  const result = await downloadFromUrl(
    context.downloadUrl,
    context.downloadFilename || "download",
    context.downloadLocalPath || undefined,
  );

  if (outputFileIds.length === 1 && result.savedPath) {
    context.markSaved(outputFileIds[0] as FileId, result.savedPath);
  }

  return result;
}
