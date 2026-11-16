import { StirlingFileStub } from "@editor/types/fileContext";
import { fileOpenService } from "@editor/services/fileOpenService";
import type { OpenInNewWindowApi } from "@editor-core/extensions/openInNewWindow";

/**
 * Opens a stored file in a new Tauri window through the shared IndexedDB store.
 */
export function useOpenInNewWindow(): OpenInNewWindowApi {
  return {
    canOpenInNewWindow: (file: StirlingFileStub) => Boolean(file.id),
    openInNewWindow: (file: StirlingFileStub) => {
      if (file.id) {
        fileOpenService.openFilesInNewWindow([file.id]);
      }
    },
  };
}
