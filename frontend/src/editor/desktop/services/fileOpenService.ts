import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readFile } from "@tauri-apps/plugin-fs";

export interface FileOpenService {
  getOpenedFiles(): Promise<string[]>;
  readFileAsArrayBuffer(
    filePath: string,
  ): Promise<{ fileName: string; arrayBuffer: ArrayBuffer } | null>;
  clearOpenedFiles(): Promise<void>;
  onFileOpened(callback: (filePath: string) => void): () => void;
  openInNewWindow(paths?: string[]): Promise<void>;
  openFilesInNewWindow(fileIds: string[]): Promise<void>;
  popWindowFileIds(): Promise<string[]>;
}

class TauriFileOpenService implements FileOpenService {
  async getOpenedFiles(): Promise<string[]> {
    try {
      return await invoke<string[]>("pop_opened_files");
    } catch (error) {
      console.error("Failed to get opened files:", error);
      return [];
    }
  }

  async readFileAsArrayBuffer(
    filePath: string,
  ): Promise<{ fileName: string; arrayBuffer: ArrayBuffer } | null> {
    try {
      const fileData = await readFile(filePath);
      const fileName = filePath.split(/[\\/]/).pop() || "opened-file.pdf";
      const arrayBuffer =
        fileData.byteOffset === 0 &&
        fileData.byteLength === fileData.buffer.byteLength
          ? fileData.buffer
          : fileData.buffer.slice(
              fileData.byteOffset,
              fileData.byteOffset + fileData.byteLength,
            );

      return { fileName, arrayBuffer };
    } catch (error) {
      console.error("Failed to read file:", error);
      return null;
    }
  }

  async clearOpenedFiles(): Promise<void> {
    try {
      await invoke("clear_opened_files");
    } catch (error) {
      console.error("Failed to clear opened files:", error);
    }
  }

  async openInNewWindow(paths: string[] = []): Promise<void> {
    try {
      const label = await invoke<string>("open_in_new_window", { paths });
      console.log(`Spawned new window: ${label}`);
    } catch (error) {
      console.error("Failed to open in new window:", error);
    }
  }

  async openFilesInNewWindow(fileIds: string[]): Promise<void> {
    try {
      const label = await invoke<string>("open_files_in_new_window", {
        fileIds,
      });
      console.log(`Spawned new window ${label} for stored files:`, fileIds);
    } catch (error) {
      console.error("Failed to open files in new window:", error);
    }
  }

  async popWindowFileIds(): Promise<string[]> {
    try {
      return await invoke<string[]>("pop_window_file_ids");
    } catch (error) {
      console.error("Failed to pop window file ids:", error);
      return [];
    }
  }

  onFileOpened(callback: (filePath: string) => void): () => void {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void listen<string>("file-opened", (event) => callback(event.payload))
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch((error) => {
        console.error("Failed to listen for opened files:", error);
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }
}

export const fileOpenService: FileOpenService = new TauriFileOpenService();
