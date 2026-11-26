import type { StirlingFile } from "@editor/types/fileContext";

const FILES_ADDED_EVENT = "promin:workbench-files-added";

export function publishWorkbenchFilesAdded(files: StirlingFile[]): void {
  if (files.length === 0 || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StirlingFile[]>(FILES_ADDED_EVENT, { detail: files }));
}

export function subscribeToWorkbenchFilesAdded(onFilesAdded: (files: StirlingFile[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    onFilesAdded((event as CustomEvent<StirlingFile[]>).detail);
  };
  window.addEventListener(FILES_ADDED_EVENT, listener);
  return () => window.removeEventListener(FILES_ADDED_EVENT, listener);
}
