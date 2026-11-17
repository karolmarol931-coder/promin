import { beforeEach, expect, it, vi } from "vitest";
import { importPdfFolder } from "@editor/services/pdfFolderImport";

const state = vi.hoisted(() => ({
  directories: {} as Record<string, Array<Record<string, unknown>>>,
  files: {} as Record<string, Uint8Array>,
  mapped: [] as Array<{ file: File; path: string }>,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn(async (path: string) => state.directories[path] ?? []),
  readFile: vi.fn(async (path: string) => {
    const bytes = state.files[path];
    if (!bytes) throw new Error("Unreadable");
    return bytes;
  }),
}));

vi.mock("@editor/services/pendingFilePathMappings", () => ({
  pendingFilePathMappings: {
    set: (file: File, path: string) => state.mapped.push({ file, path }),
  },
}));

beforeEach(() => {
  state.directories = {
    "/docs": [
      { name: "one.pdf", isFile: true, isDirectory: false, isSymlink: false },
      { name: "notes.txt", isFile: true, isDirectory: false, isSymlink: false },
      { name: ".hidden", isFile: false, isDirectory: true, isSymlink: false },
      { name: "nested", isFile: false, isDirectory: true, isSymlink: false },
      { name: "linked", isFile: false, isDirectory: true, isSymlink: true },
    ],
    "/docs/nested": [
      { name: "two.PDF", isFile: true, isDirectory: false, isSymlink: false },
    ],
  };
  state.files = {
    "/docs/one.pdf": new Uint8Array([1]),
    "/docs/nested/two.PDF": new Uint8Array([2]),
  };
  state.mapped = [];
});

it("imports PDFs recursively, preserves disk paths, and reports progress", async () => {
  const added: File[] = [];
  const progress: Array<[number, number]> = [];

  const result = await importPdfFolder(
    "/docs",
    async (files) => {
      added.push(...files);
    },
    (completed, total) => progress.push([completed, total]),
  );

  expect(result).toEqual({ imported: 2, skipped: 0 });
  expect(added.map((file) => file.name)).toEqual(["one.pdf", "two.PDF"]);
  expect(state.mapped.map(({ path }) => path)).toEqual([
    "/docs/one.pdf",
    "/docs/nested/two.PDF",
  ]);
  expect(progress).toEqual([[2, 2]]);
});

it("continues importing readable PDFs when another file cannot be read", async () => {
  state.directories["/docs"].push({
    name: "unreadable.pdf",
    isFile: true,
    isDirectory: false,
    isSymlink: false,
  });
  const addFiles = vi.fn(async () => {});

  const result = await importPdfFolder("/docs", addFiles);

  expect(result).toEqual({ imported: 2, skipped: 1 });
  expect(addFiles).toHaveBeenCalledTimes(1);
});
