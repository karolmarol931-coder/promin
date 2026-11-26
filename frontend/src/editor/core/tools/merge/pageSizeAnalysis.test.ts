import { describe, expect, it } from "vitest";
import {
  detectMergePageSizeOutliers,
  type MergePageSizeSample,
} from "@editor/tools/merge/pageSizeAnalysis";

const a4: MergePageSizeSample[] = Array.from({ length: 5 }, (_, pageIndex) => ({
  fileIndex: 0,
  pageIndex,
  width: 595.28,
  height: 841.89,
}));

describe("merge page size analysis", () => {
  it("flags a page with the same shape but a much larger physical size", () => {
    const plan = detectMergePageSizeOutliers([
      ...a4,
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
    expect(plan?.pages).toEqual([{ fileIndex: 1, pageIndex: 0 }]);
    expect(plan?.outlierScale).toBeGreaterThan(4);
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
      a4[0],
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

    expect(plan?.pages).toEqual([{ fileIndex: 2, pageIndex: 0 }]);
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
});
