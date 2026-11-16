import { describe, expect, test } from "vitest";
import type { FileId } from "@editor/types/file";
import type { StirlingFile } from "@editor/types/fileContext";
import {
  moveMergeFile,
  orderMergeFiles,
  reorderMergeFile,
  reconcileMergeFileOrder,
  sortMergeFiles,
} from "@editor/tools/merge/fileOrder";

const makeFile = (id: string, name: string, lastModified = 0): StirlingFile =>
  Object.assign(new File([name], name, { lastModified }), {
    fileId: id as FileId,
    quickKey: `${name}|${name.length}|${lastModified}`,
  });

describe("merge file order", () => {
  test("retains the operation order, removes absent files, and appends new files", () => {
    const files = [
      makeFile("a", "a.pdf"),
      makeFile("c", "c.pdf"),
      makeFile("d", "d.pdf"),
    ];

    expect(
      reconcileMergeFileOrder(["c", "removed", "a"] as FileId[], files),
    ).toEqual(["c", "a", "d"]);
  });

  test("orders only the files passed to the merge operation without mutating them", () => {
    const files = [makeFile("a", "a.pdf"), makeFile("b", "b.pdf")];
    const order = ["b", "a"] as FileId[];

    expect(orderMergeFiles(files, order)).toEqual([files[1], files[0]]);
    expect(files).toEqual([files[0], files[1]]);
  });

  test("moves a file by one position and leaves boundary or missing moves unchanged", () => {
    const order = ["a", "b", "c"] as FileId[];

    expect(moveMergeFile(order, "b" as FileId, "up")).toEqual(["b", "a", "c"]);
    expect(moveMergeFile(order, "b" as FileId, "down")).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(moveMergeFile(order, "a" as FileId, "up")).toEqual(order);
    expect(moveMergeFile(order, "c" as FileId, "down")).toEqual(order);
    expect(moveMergeFile(order, "missing" as FileId, "up")).toEqual(order);
  });

  test("moves a dragged file before or after its target", () => {
    const order = ["a", "b", "c"] as FileId[];

    expect(reorderMergeFile(order, "a" as FileId, "c" as FileId)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(reorderMergeFile(order, "c" as FileId, "a" as FileId, true)).toEqual(
      ["a", "c", "b"],
    );
    expect(reorderMergeFile(order, "missing" as FileId, "a" as FileId)).toEqual(
      order,
    );
  });

  test("sorts names naturally and dates in either direction", () => {
    const files = [
      makeFile("ten", "page10.pdf", 30),
      makeFile("two", "page2.pdf", 10),
      makeFile("one", "page1.pdf", 20),
    ];

    expect(
      sortMergeFiles(files, "filename", true).map((file) => file.name),
    ).toEqual(["page1.pdf", "page2.pdf", "page10.pdf"]);
    expect(
      sortMergeFiles(files, "dateModified", false).map((file) => file.name),
    ).toEqual(["page10.pdf", "page1.pdf", "page2.pdf"]);
    expect(files.map((file) => file.name)).toEqual([
      "page10.pdf",
      "page2.pdf",
      "page1.pdf",
    ]);
  });
});
