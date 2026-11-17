import { readDir, readFile } from "@tauri-apps/plugin-fs";
import { pendingFilePathMappings } from "@editor/services/pendingFilePathMappings";

const FILES_PER_BATCH = 4;

function joinPath(directory: string, name: string): string {
  const separator = directory.includes("\\") ? "\\" : "/";
  const base = directory.endsWith(separator)
    ? directory.slice(0, -separator.length)
    : directory;
  return `${base}${separator}${name}`;
}

async function collectPdfPaths(directory: string): Promise<string[]> {
  const entries = await readDir(directory);
  const paths: string[] = [];

  for (const entry of entries) {
    if (!entry.name || entry.name.startsWith(".")) continue;
    const path = joinPath(directory, entry.name);
    if (entry.isDirectory && !entry.isSymlink) {
      paths.push(...(await collectPdfPaths(path)));
    } else if (entry.isFile && !entry.isSymlink && /\.pdf$/i.test(entry.name)) {
      paths.push(path);
    }
  }

  return paths;
}

export async function importPdfFolder(
  directory: string,
  addFiles: (files: File[]) => Promise<unknown>,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ imported: number; skipped: number }> {
  const paths = await collectPdfPaths(directory);
  let imported = 0;
  let skipped = 0;

  for (let start = 0; start < paths.length; start += FILES_PER_BATCH) {
    const batch = paths.slice(start, start + FILES_PER_BATCH);
    const results = await Promise.allSettled(
      batch.map(async (path) => {
        const bytes = await readFile(path);
        const name = path.split(/[\\/]/).pop() || "document.pdf";
        const file = new File([new Uint8Array(bytes)], name, {
          type: "application/pdf",
        });
        pendingFilePathMappings.set(file, path);
        return file;
      }),
    );
    const files = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    skipped += results.length - files.length;
    if (files.length > 0) {
      await addFiles(files);
      imported += files.length;
    }
    onProgress?.(Math.min(start + batch.length, paths.length), paths.length);
  }

  return { imported, skipped };
}
