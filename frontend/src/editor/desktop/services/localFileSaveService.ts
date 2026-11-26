import type { SaveResult, MultiFileSaveResult } from "@editor-core/services/localFileSaveService";
import i18n from "i18next";
import { beginSelfWrite, endSelfWrite } from "@editor/services/diskFileSync";
import { preferencesService } from "@editor/services/preferencesService";
import { recordDiagnosticEvent, recordDiagnosticException } from "@editor/services/diagnosticLog";
export type { SaveResult, MultiFileSaveResult };
import { assertFilesNotBlocked } from "@editor/services/policyFileGuard";

/**
 * Save file data to a local filesystem path (Tauri desktop only)
 *
 * @param data - Blob or File to save
 * @param filePath - Absolute path to save to
 * @returns Result indicating success or failure with error message
 */
export async function saveToLocalPath(
  data: Blob | File,
  filePath: string,
  options: { operationId?: string; action?: string } = {},
): Promise<SaveResult> {
  const startedAt = Date.now();
  recordDiagnosticEvent("info", "exports", "native-write-started", {
    operationId: options.operationId,
    action: options.action,
    phase: "filesystem-write",
    fileSizeBytes: data.size,
  });
  try {
    // Muted before the first byte so the watcher cannot report our own write as an
    // external change. Released by the post-save re-baseline, or by its deadline.
    beginSelfWrite(filePath);
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const arrayBuffer = await data.arrayBuffer();
    assertFilesNotBlocked();
    await writeFile(filePath, new Uint8Array(arrayBuffer));
    recordDiagnosticEvent("info", "exports", "native-write-succeeded", {
      operationId: options.operationId,
      action: options.action,
      phase: "filesystem-write",
      fileSizeBytes: arrayBuffer.byteLength,
      durationMs: Date.now() - startedAt,
    });
    return { success: true };
  } catch (error) {
    endSelfWrite(filePath);
    const message = error instanceof Error ? error.message : String(error);
    recordDiagnosticException("exports", "native-write-failed", error, {
      operationId: options.operationId,
      action: options.action,
      phase: "filesystem-write",
      fileSizeBytes: data.size,
      durationMs: Date.now() - startedAt,
    });
    console.error("[LocalFileSave] Failed to save:", message);
    return { success: false, error: message };
  }
}

/**
 * Show native save dialog and return selected path
 *
 * @param defaultFilename - Suggested filename
 * @param defaultDirectory - Optional default directory
 * @returns Selected file path or null if cancelled
 */
export async function showSaveDialog(
  defaultFilename: string,
  defaultDirectory?: string,
  options: { operationId?: string; action?: string } = {},
): Promise<string | null> {
  const startedAt = Date.now();
  recordDiagnosticEvent("info", "exports", "native-save-dialog-started", {
    operationId: options.operationId,
    action: options.action,
    phase: "save-dialog",
  });
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");

    // Derive the file type filter from the filename extension so the dialog
    // doesn't force a .pdf extension when saving non-PDF outputs (e.g. .docx).
    const ext = defaultFilename.split(".").pop()?.toLowerCase() ?? "";
    const filters = ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [];

    const preferredDirectory = defaultDirectory ?? preferencesService.getPreference("defaultSaveDirectory");
    const selectedPath = await save({
      defaultPath: preferredDirectory ? `${preferredDirectory}/${defaultFilename}` : defaultFilename,
      filters,
      title: i18n.t("workbenchBar.saveAs", "Save As"),
    });

    recordDiagnosticEvent("info", "exports", selectedPath ? "native-save-dialog-selected" : "native-save-dialog-cancelled", {
      operationId: options.operationId,
      action: options.action,
      phase: "save-dialog",
      durationMs: Date.now() - startedAt,
    });
    return selectedPath;
  } catch (error) {
    recordDiagnosticException("exports", "native-save-dialog-failed", error, {
      operationId: options.operationId,
      action: options.action,
      phase: "save-dialog",
      durationMs: Date.now() - startedAt,
    });
    console.error("[SaveDialog] Failed to show dialog:", error);
    throw error;
  }
}

/**
 * Prompt user to select a folder and save multiple files there
 *
 * @param files - Array of files to save
 * @param defaultDirectory - Optional default directory to open dialog in
 * @returns Result with count of files saved
 */
export async function saveMultipleFilesWithPrompt(
  files: (Blob | File)[],
  defaultDirectory?: string,
): Promise<MultiFileSaveResult> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");

    // Prompt user to select folder
    const selectedFolder = await open({
      directory: true,
      multiple: false,
      defaultPath: (defaultDirectory ?? preferencesService.getPreference("defaultSaveDirectory")) || undefined,
      title: i18n.t("desktop.fileSave.saveFilesTitle", "Save {{count}} files", {
        count: files.length,
      }),
    });

    // User cancelled
    if (!selectedFolder) {
      return { success: false, savedCount: 0, cancelledByUser: true };
    }

    // Save each file to the selected folder
    let savedCount = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const fileName = file instanceof File ? file.name : `output_${savedCount + 1}.pdf`;
        const filePath = await join(selectedFolder, fileName);
        const arrayBuffer = await file.arrayBuffer();
        await writeFile(filePath, new Uint8Array(arrayBuffer));
        savedCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${file instanceof File ? file.name : "file"}: ${message}`);
      }
    }

    if (savedCount === files.length) {
      return { success: true, savedCount };
    } else if (savedCount > 0) {
      return {
        success: false,
        savedCount,
        error: `Saved ${savedCount}/${files.length} files. Errors: ${errors.join(", ")}`,
      };
    } else {
      return {
        success: false,
        savedCount: 0,
        error: `Failed to save files: ${errors.join(", ")}`,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[LocalFileSave] Failed to save multiple files:", message);
    return { success: false, savedCount: 0, error: message };
  }
}
