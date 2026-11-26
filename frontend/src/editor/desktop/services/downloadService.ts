import type { DownloadRequest, DownloadResult } from "@editor-core/services/downloadService";
import { assertFilesNotBlocked } from "@editor/services/policyFileGuard";
import { saveToLocalPath, showSaveDialog } from "@editor/services/localFileSaveService";
import { createDiagnosticOperationId, recordDiagnosticEvent, recordDiagnosticException } from "@editor/services/diagnosticLog";

export type { DownloadRequest, DownloadResult };

export async function downloadFile(request: DownloadRequest): Promise<DownloadResult> {
  const startedAt = Date.now();
  const operationId = request.operationId ?? createDiagnosticOperationId();
  const action = request.action ?? "file-export";
  recordDiagnosticEvent("info", "exports", "desktop-download-started", {
    operationId,
    action,
    phase: request.localPath ? "overwrite" : "save-as",
    fileSizeBytes: request.data.size,
  });
  try {
    assertFilesNotBlocked([request.fileId]);
    if (request.localPath) {
      const result = await saveToLocalPath(request.data, request.localPath, { operationId, action });
      if (!result.success) {
        throw new Error(result.error || "Failed to save file");
      }
      recordDiagnosticEvent("info", "exports", "desktop-download-succeeded", {
        operationId,
        action,
        phase: "overwrite",
        fileSizeBytes: request.data.size,
        durationMs: Date.now() - startedAt,
      });
      return { savedPath: request.localPath };
    }

    const savePath = await showSaveDialog(request.filename, undefined, {
      operationId,
      action,
    });
    if (!savePath) {
      recordDiagnosticEvent("info", "exports", "desktop-download-cancelled", {
        operationId,
        action,
        phase: "save-as",
        durationMs: Date.now() - startedAt,
      });
      return { cancelled: true };
    }

    assertFilesNotBlocked([request.fileId]);
    const result = await saveToLocalPath(request.data, savePath, {
      operationId,
      action,
    });
    if (!result.success) {
      throw new Error(result.error || "Failed to save file");
    }

    recordDiagnosticEvent("info", "exports", "desktop-download-succeeded", {
      operationId,
      action,
      phase: "save-as",
      fileSizeBytes: request.data.size,
      durationMs: Date.now() - startedAt,
    });
    return { savedPath: savePath };
  } catch (error) {
    recordDiagnosticException("exports", "desktop-download-failed", error, {
      operationId,
      action,
      phase: request.localPath ? "overwrite" : "save-as",
      fileSizeBytes: request.data.size,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

export async function downloadFromUrl(url: string, filename: string, localPath?: string): Promise<DownloadResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const blob = await response.blob();
  return downloadFile({ data: blob, filename, localPath });
}
