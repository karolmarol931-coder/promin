import { describe, expect, test } from "vitest";
import {
  buildSplitFormData,
  getSplitEndpoint,
  splitFromApiParams,
  splitToApiParams,
} from "@editor/hooks/tools/split/useSplitOperation";
import {
  SplitParameters,
  defaultParameters,
  validateSplitParameters,
} from "@editor/hooks/tools/split/useSplitParameters";
import { SPLIT_METHODS } from "@editor/constants/splitConstants";

const params = (overrides: Partial<SplitParameters>): SplitParameters => ({
  ...defaultParameters,
  ...overrides,
});

describe("validateSplitParameters", () => {
  test.each(["2", "1,3", "1,3,5-10", "2n+1", "all"])(
    "accepts supported page cuts: %s",
    (pages) => {
      expect(
        validateSplitParameters(
          params({ method: SPLIT_METHODS.BY_PAGES, pages }),
        ),
      ).toBe(true);
    },
  );

  test.each(["", "0", "1,,2", "2-1", "-2", "abc"])(
    "rejects malformed page cuts: %s",
    (pages) => {
      expect(
        validateSplitParameters(
          params({ method: SPLIT_METHODS.BY_PAGES, pages }),
        ),
      ).toBe(false);
    },
  );

  test.each(["5,2", "2,2", "2-4,4", "all,2"])(
    "rejects page cuts that the backend cannot safely order: %s",
    (pages) => {
      expect(
        validateSplitParameters(
          params({ method: SPLIT_METHODS.BY_PAGES, pages }),
          10,
        ),
      ).toBe(false);
    },
  );

  test.each(["2,5", "2-4,5", "2,10"])(
    "accepts ascending page cuts: %s",
    (pages) => {
      expect(
        validateSplitParameters(
          params({ method: SPLIT_METHODS.BY_PAGES, pages }),
          10,
        ),
      ).toBe(true);
    },
  );

  test("rejects a cut after the last page and accepts a real cut", () => {
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_PAGES, pages: "2" }),
        2,
      ),
    ).toBe(false);
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_PAGES, pages: "2" }),
        3,
      ),
    ).toBe(true);
  });

  test("rejects split-all and page functions that cannot cut a one-page PDF", () => {
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_PAGES, pages: "all" }),
        1,
      ),
    ).toBe(false);
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_PAGES, pages: "n" }),
        1,
      ),
    ).toBe(false);
  });

  test("rejects a page function when all its cuts fall after the final page", () => {
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_PAGES, pages: "2n+1" }),
        3,
      ),
    ).toBe(false);
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_PAGES, pages: "2n+1" }),
        4,
      ),
    ).toBe(true);
  });

  test.each([
    { method: SPLIT_METHODS.BY_SIZE, splitValue: "500KB", valid: true },
    { method: SPLIT_METHODS.BY_SIZE, splitValue: "0MB", valid: false },
    { method: SPLIT_METHODS.BY_SIZE, splitValue: "large", valid: false },
    { method: SPLIT_METHODS.BY_PAGE_COUNT, splitValue: "5", valid: true },
    { method: SPLIT_METHODS.BY_PAGE_COUNT, splitValue: "0", valid: false },
    { method: SPLIT_METHODS.BY_DOC_COUNT, splitValue: "3", valid: true },
    { method: SPLIT_METHODS.BY_DOC_COUNT, splitValue: "2.5", valid: false },
  ])("validates numeric split settings: %o", ({ valid, ...overrides }) => {
    expect(
      validateSplitParameters(params(overrides as Partial<SplitParameters>)),
    ).toBe(valid);
  });

  test("rejects invalid section and poster divisions", () => {
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_SECTIONS, hDiv: "0" }),
      ),
    ).toBe(false);
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_SECTIONS, hDiv: "301" }),
      ),
    ).toBe(false);
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_POSTER, xFactor: "11" }),
      ),
    ).toBe(false);
    expect(
      validateSplitParameters(
        params({ method: SPLIT_METHODS.BY_POSTER, xFactor: "2.5" }),
      ),
    ).toBe(false);
  });
});

describe("splitToApiParams", () => {
  test("byPages sends pageNumbers", () => {
    expect(
      splitToApiParams(
        params({ method: SPLIT_METHODS.BY_PAGES, pages: "2,5" }),
      ),
    ).toEqual({ pageNumbers: "2,5" });
  });

  test("bySections sends divisions and split mode without custom pages", () => {
    expect(
      splitToApiParams(
        params({
          method: SPLIT_METHODS.BY_SECTIONS,
          hDiv: "3",
          vDiv: "2",
          merge: true,
          splitMode: "SPLIT_ALL",
        }),
      ),
    ).toEqual({
      horizontalDivisions: 3,
      verticalDivisions: 2,
      merge: true,
      splitMode: "SPLIT_ALL",
    });
  });

  test("bySections includes pageNumbers only for CUSTOM mode", () => {
    expect(
      splitToApiParams(
        params({
          method: SPLIT_METHODS.BY_SECTIONS,
          splitMode: "CUSTOM",
          customPages: "1,2",
        }),
      ),
    ).toMatchObject({ splitMode: "CUSTOM", pageNumbers: "1,2" });
  });

  test.each([
    { method: SPLIT_METHODS.BY_SIZE, splitType: 0 },
    { method: SPLIT_METHODS.BY_PAGE_COUNT, splitType: 1 },
    { method: SPLIT_METHODS.BY_DOC_COUNT, splitType: 2 },
  ])("$method maps to splitType $splitType", ({ method, splitType }) => {
    expect(splitToApiParams(params({ method, splitValue: "5" }))).toEqual({
      splitType,
      splitValue: "5",
    });
  });

  test("byChapters converts bookmarkLevel to a number", () => {
    expect(
      splitToApiParams(
        params({
          method: SPLIT_METHODS.BY_CHAPTERS,
          bookmarkLevel: "2",
          includeMetadata: true,
        }),
      ),
    ).toEqual({
      bookmarkLevel: 2,
      includeMetadata: true,
      allowDuplicates: false,
    });
  });

  test("byPageDivider sends duplexMode", () => {
    expect(
      splitToApiParams(
        params({ method: SPLIT_METHODS.BY_PAGE_DIVIDER, duplexMode: true }),
      ),
    ).toEqual({ duplexMode: true });
  });

  test("byPoster maps the factors to the spec's xFactor/yFactor fields", () => {
    expect(
      splitToApiParams(
        params({
          method: SPLIT_METHODS.BY_POSTER,
          pageSize: "A4",
          xFactor: "3",
          yFactor: "2",
          rightToLeft: true,
        }),
      ),
    ).toEqual({ pageSize: "A4", xFactor: 3, yFactor: 2, rightToLeft: true });
  });

  // A cleared numeric field arrives as "". It must fall back to the default,
  // not Number("") === 0, which the backend turns into an empty/degenerate PDF.
  test("byPoster falls back to the default factor for empty fields", () => {
    expect(
      splitToApiParams(
        params({ method: SPLIT_METHODS.BY_POSTER, xFactor: "", yFactor: "" }),
      ),
    ).toMatchObject({ xFactor: 2, yFactor: 2 });
  });

  test("bySections falls back to the default divisions for empty fields", () => {
    expect(
      splitToApiParams(
        params({ method: SPLIT_METHODS.BY_SECTIONS, hDiv: "", vDiv: "" }),
      ),
    ).toMatchObject({ horizontalDivisions: 2, verticalDivisions: 2 });
  });

  test("byChapters falls back to the default bookmark level for an empty field", () => {
    expect(
      splitToApiParams(
        params({ method: SPLIT_METHODS.BY_CHAPTERS, bookmarkLevel: "" }),
      ),
    ).toMatchObject({ bookmarkLevel: 1 });
  });
});

describe("split round-trip", () => {
  test.each<Partial<SplitParameters>>([
    { method: SPLIT_METHODS.BY_PAGES, pages: "2,5" },
    {
      method: SPLIT_METHODS.BY_SECTIONS,
      hDiv: "3",
      vDiv: "2",
      merge: true,
      splitMode: "SPLIT_ALL",
    },
    {
      method: SPLIT_METHODS.BY_SECTIONS,
      splitMode: "CUSTOM",
      customPages: "1,2",
    },
    { method: SPLIT_METHODS.BY_SIZE, splitValue: "10MB" },
    { method: SPLIT_METHODS.BY_PAGE_COUNT, splitValue: "5" },
    { method: SPLIT_METHODS.BY_DOC_COUNT, splitValue: "3" },
    {
      method: SPLIT_METHODS.BY_CHAPTERS,
      bookmarkLevel: "2",
      includeMetadata: true,
    },
    { method: SPLIT_METHODS.BY_PAGE_DIVIDER, duplexMode: true },
    {
      method: SPLIT_METHODS.BY_POSTER,
      pageSize: "A4",
      xFactor: "3",
      yFactor: "2",
    },
  ])("toApiParams(fromApiParams(x)) reproduces x for %o", (overrides) => {
    const api = splitToApiParams(params(overrides));
    const roundTripped = splitToApiParams(params(splitFromApiParams(api)));

    expect(roundTripped).toEqual(api);
  });
});

describe("getSplitEndpoint", () => {
  test.each([
    { method: SPLIT_METHODS.BY_PAGES, endpoint: "/api/v1/general/split-pages" },
    {
      method: SPLIT_METHODS.BY_SECTIONS,
      endpoint: "/api/v1/general/split-pdf-by-sections",
    },
    {
      method: SPLIT_METHODS.BY_SIZE,
      endpoint: "/api/v1/general/split-by-size-or-count",
    },
    {
      method: SPLIT_METHODS.BY_CHAPTERS,
      endpoint: "/api/v1/general/split-pdf-by-chapters",
    },
    {
      method: SPLIT_METHODS.BY_PAGE_DIVIDER,
      endpoint: "/api/v1/misc/auto-split-pdf",
    },
    {
      method: SPLIT_METHODS.BY_POSTER,
      endpoint: "/api/v1/general/split-for-poster-print",
    },
  ])("$method routes to $endpoint", ({ method, endpoint }) => {
    expect(getSplitEndpoint(params({ method }))).toBe(endpoint);
  });
});

describe("buildSplitFormData", () => {
  test("appends the file and the serialized parameters", () => {
    const file = new File(["x"], "test.pdf", { type: "application/pdf" });
    const formData = buildSplitFormData(
      params({ method: SPLIT_METHODS.BY_PAGES, pages: "3" }),
      file,
    );

    expect(formData.get("fileInput")).toBe(file);
    expect(formData.get("pageNumbers")).toBe("3");
  });
});
