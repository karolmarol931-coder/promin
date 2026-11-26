import { describe, expect, it } from "vitest";
import { detectMergePageSizeOutliers, type MergePageSizeSample } from "@editor/tools/merge/pageSizeAnalysis";

const a4: MergePageSizeSample[] = Array.from({ length: 5 }, (_, pageIndex) => ({
  fileIndex: 0,
  pageIndex,
  width: 595.28,
  height: 841.89,
}));

describe("merge page size analysis", () => {
  it("identifies one oversized sixth page among five A4 pages", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4,
      {
        fileIndex: 0,
        pageIndex: 5,
        width: 2432,
        height: 3440,
      },
    ]);

    expect(plan?.pages).toEqual([
      {
        fileIndex: 0,
        pageIndex: 5,
        width: 2432,
        height: 3440,
      },
    ]);
    expect(plan?.totalPageCount).toBe(6);
    expect(plan?.referencePageCount).toBe(5);
  });

  it("flags a page with the same shape but a much larger physical size", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4.slice(0, 3),
      {
        fileIndex: 1,
        pageIndex: 0,
        width: 2432,
        height: 3440,
      },
    ]);

    expect(plan).not.toBeNull();
    expect(plan?.portraitWidth).toBeCloseTo(595.28);
    expect(plan?.portraitHeight).toBeCloseTo(841.89);
    expect(plan?.pages).toEqual([
      {
        fileIndex: 1,
        pageIndex: 0,
        width: 2432,
        height: 3440,
      },
    ]);
    expect(plan?.outlierScale).toBeGreaterThan(4);
  });

  it("does not guess a target when two differently sized pages are split evenly", () => {
    const plan = detectMergePageSizeOutliers([
      a4[0],
      {
        fileIndex: 1,
        pageIndex: 0,
        width: 2432,
        height: 3440,
      },
    ]);

    expect(plan).toBeNull();
  });

  it("does not guess a target when two size groups have equal page counts", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4.slice(0, 2),
      ...Array.from({ length: 2 }, (_, pageIndex) => ({
        fileIndex: 1,
        pageIndex,
        width: 2432,
        height: 3440,
      })),
    ]);

    expect(plan).toBeNull();
  });

  it("does not recommend resizing when the leading size group is only slightly larger", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4.slice(0, 3),
      ...Array.from({ length: 2 }, (_, pageIndex) => ({
        fileIndex: 1,
        pageIndex,
        width: 2432,
        height: 3440,
      })),
    ]);

    expect(plan).toBeNull();
  });

  it("offers a clear 4-to-2 majority while changing only the two larger pages", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4.slice(0, 4),
      ...Array.from({ length: 2 }, (_, pageIndex) => ({
        fileIndex: 1,
        pageIndex,
        width: 2432,
        height: 3440,
      })),
    ]);

    expect(plan?.referencePageCount).toBe(4);
    expect(
      plan?.pages.map(({ fileIndex, pageIndex }) => `${fileIndex}:${pageIndex}`),
    ).toEqual(["1:0", "1:1"]);
  });

  it("does not treat standard A3 and A5 sheets as scan-size outliers", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4.slice(0, 3),
      { fileIndex: 1, pageIndex: 0, width: 841.89, height: 1190.55 },
      { fileIndex: 2, pageIndex: 0, width: 419.53, height: 595.28 },
    ]);

    expect(plan).toBeNull();
  });

  it("detects an unusually small scan page only when the size gap is clear", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4,
      { fileIndex: 1, pageIndex: 0, width: 198, height: 280 },
    ]);

    expect(plan?.pages.map(({ fileIndex, pageIndex }) => `${fileIndex}:${pageIndex}`)).toEqual([
      "1:0",
    ]);
    expect(plan?.outlierScale).toBeLessThan(1);
  });

  it("does not flag normal A4 and Letter pages", () => {
    const plan = detectMergePageSizeOutliers([
      a4[0],
      {
        fileIndex: 1,
        pageIndex: 0,
        width: 612,
        height: 792,
      },
    ]);

    expect(plan).toBeNull();
  });

  it("still detects a scaled A4 page among mixed A4 and Letter inputs", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4.slice(0, 3),
      {
        fileIndex: 1,
        pageIndex: 0,
        width: 612,
        height: 792,
      },
      {
        fileIndex: 2,
        pageIndex: 0,
        width: 2432,
        height: 3440,
      },
    ]);

    expect(plan?.pages).toEqual([
      {
        fileIndex: 2,
        pageIndex: 0,
        width: 2432,
        height: 3440,
      },
    ]);
  });

  it("treats portrait and landscape pages of the same size as one group", () => {
    const plan = detectMergePageSizeOutliers([
      a4[0],
      {
        fileIndex: 1,
        pageIndex: 0,
        width: 841.89,
        height: 595.28,
      },
    ]);

    expect(plan).toBeNull();
  });

  it("treats A4 and Letter as normal paper sizes rather than scan outliers", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4.slice(0, 3),
      {
        fileIndex: 1,
        pageIndex: 0,
        width: 612,
        height: 792,
      },
    ]);

    expect(plan).toBeNull();
  });
});
