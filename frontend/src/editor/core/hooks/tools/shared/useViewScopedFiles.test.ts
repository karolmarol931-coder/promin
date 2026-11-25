import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockViewer = { activeFileIndex: 0 };
const mockNavigation = { workbench: "viewer" };
const mockFiles: { files: unknown[]; fileStubs: unknown[] } = {
  files: [],
  fileStubs: [],
};
const mockSelection: { selectedFiles: unknown[]; selectedFileIds: string[] } = {
  selectedFiles: [],
  selectedFileIds: [],
};

vi.mock("@editor/contexts/ViewerContext", () => ({
  useViewer: () => mockViewer,
}));

vi.mock("@editor/contexts/NavigationContext", () => ({
  useNavigationState: () => mockNavigation,
}));

vi.mock("@editor/contexts/FileContext", () => ({
  useAllFiles: () => mockFiles,
  useSelectedFiles: () => mockSelection,
}));

import {
  useViewScopedFiles,
  useViewScopedFileStubs,
} from "@editor/hooks/tools/shared/useViewScopedFiles";

const file = (id: string) => ({ fileId: id, name: `${id}.pdf` });
const stub = (id: string) => ({
  id,
  name: `${id}.pdf`,
  thumbnailUrl: `${id}.png`,
});

function setState(opts: {
  workbench?: string;
  activeFileIndex?: number;
  files?: unknown[];
  fileStubs?: unknown[];
  selectedFiles?: unknown[];
  selectedFileIds?: string[];
}) {
  mockNavigation.workbench = opts.workbench ?? "viewer";
  mockViewer.activeFileIndex = opts.activeFileIndex ?? 0;
  mockFiles.files = opts.files ?? [];
  mockFiles.fileStubs = opts.fileStubs ?? [];
  mockSelection.selectedFiles = opts.selectedFiles ?? [];
  mockSelection.selectedFileIds = opts.selectedFileIds ?? [];
}

describe("useViewScopedFileStubs", () => {
  it("follows the viewer's active file rather than the first loaded one", () => {
    setState({
      files: [file("a"), file("b"), file("c")],
      fileStubs: [stub("a"), stub("b"), stub("c")],
      activeFileIndex: 2,
    });

    const { result } = renderHook(() => useViewScopedFileStubs());

    expect(result.current.map((s) => s.id)).toEqual(["c"]);
  });

  it("re-resolves when the viewer switches files", () => {
    setState({
      files: [file("a"), file("b")],
      fileStubs: [stub("a"), stub("b")],
      activeFileIndex: 0,
    });

    const { result, rerender } = renderHook(() => useViewScopedFileStubs());
    expect(result.current.map((s) => s.id)).toEqual(["a"]);

    setState({
      files: [file("a"), file("b")],
      fileStubs: [stub("a"), stub("b")],
      activeFileIndex: 1,
    });
    rerender();

    expect(result.current.map((s) => s.id)).toEqual(["b"]);
  });

  it("matches by id, not position, when the two lists are out of step", () => {
    // A stub exists before its bytes load, so the stub list can be longer than
    // (and offset from) the file list.
    setState({
      files: [file("b")],
      fileStubs: [stub("a"), stub("b")],
      activeFileIndex: 0,
    });

    const { result } = renderHook(() => useViewScopedFileStubs());

    expect(result.current.map((s) => s.id)).toEqual(["b"]);
  });

  it("returns every stub outside the viewer, mirroring useViewScopedFiles", () => {
    setState({
      workbench: "fileEditor",
      files: [file("a"), file("b")],
      fileStubs: [stub("a"), stub("b")],
    });

    const stubs = renderHook(() => useViewScopedFileStubs()).result.current;
    const files = renderHook(() => useViewScopedFiles()).result.current;

    expect(stubs.map((s) => s.id)).toEqual(["a", "b"]);
    expect(stubs).toHaveLength(files.length);
  });

  it("scopes file-editor tools to the selected files in selection order", () => {
    const allFiles = [file("a"), file("b"), file("c"), file("d")];
    setState({
      workbench: "fileEditor",
      files: allFiles,
      fileStubs: allFiles.map(({ fileId }) => stub(fileId)),
      selectedFiles: [allFiles[2], allFiles[0], allFiles[1]],
      selectedFileIds: ["c", "a", "b"],
    });

    const { result } = renderHook(() => useViewScopedFiles());
    const { result: stubResult } = renderHook(() => useViewScopedFileStubs());

    expect(result.current.map(({ fileId }) => fileId)).toEqual(["c", "a", "b"]);
    expect(stubResult.current.map(({ id }) => id)).toEqual(["c", "a", "b"]);
  });

  it("falls back to all loaded files when the file-editor selection is empty", () => {
    setState({
      workbench: "fileEditor",
      files: [file("a"), file("b"), file("c")],
      fileStubs: [stub("a"), stub("b"), stub("c")],
    });

    const { result } = renderHook(() => useViewScopedFiles());

    expect(result.current.map(({ fileId }) => fileId)).toEqual(["a", "b", "c"]);
  });

  it("drops stubs with no loaded file instead of returning undefined holes", () => {
    setState({
      workbench: "fileEditor",
      files: [file("a")],
      fileStubs: [stub("a"), stub("orphan")],
    });

    const { result } = renderHook(() => useViewScopedFileStubs());

    expect(result.current.map((s) => s.id)).toEqual(["a"]);
  });
});
