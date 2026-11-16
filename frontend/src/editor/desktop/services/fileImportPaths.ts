import { invoke } from "@tauri-apps/api/core";
import { pendingFilePathMappings } from "@editor/services/pendingFilePathMappings";

function resolveDroppedPaths(files: File[]): Promise<(string | null)[]> {
  return invoke<(string | null)[]>("resolve_dropped_file_paths", {
    files: files.map(({ name, size, lastModified }) => ({
      name,
      size,
      lastModified,
    })),
  }).catch(() => []);
}

/** Captures drop provenance before UI handlers run. Cleanup removes the app-wide listener. */
export function captureDroppedFilePaths(): () => void {
  const onDrop = (event: DragEvent) => {
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    // Read the drag pasteboard now; addFiles may wait on ZIP extraction or another import.
    const paths = resolveDroppedPaths(files);
    files.forEach((file, index) => {
      pendingFilePathMappings.set(
        file,
        paths.then((paths) => paths[index] || undefined),
      );
    });
  };
  document.addEventListener("drop", onDrop, true);
  return () => document.removeEventListener("drop", onDrop, true);
}

/** Returns the original path for this File only; generated files have no disk source. */
export async function sourcePathForFile(
  file: File,
): Promise<string | undefined> {
  if (pendingFilePathMappings.has(file))
    return pendingFilePathMappings.get(file);
  return undefined;
}
