import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@editor/services/apiClient";
import { normalizePdfPageSizes } from "@editor/services/normalizePdfPageSizes";

vi.mock("@editor/services/apiClient", () => ({
  default: { post: vi.fn() },
}));

describe("normalizePdfPageSizes", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: new Blob(["normalized"], { type: "application/pdf" }),
    } as never);
  });

  it("sends selected page indexes and returns a separate PDF copy", async () => {
    const source = new File(["source"], "merged_11.pdf", {
      type: "application/pdf",
    });
    const result = await normalizePdfPageSizes(source, {
      portraitWidth: 595,
      portraitHeight: 842,
      totalPageCount: 8,
      referencePageCount: 6,
      pages: [
        { fileIndex: 0, pageIndex: 5, width: 2432, height: 3440 },
        { fileIndex: 0, pageIndex: 7, width: 2432, height: 3440 },
      ],
      outlierScale: 4.1,
    });

    const [endpoint, formData, config] = vi.mocked(apiClient.post).mock.calls[0];
    expect(endpoint).toBe("/api/v1/general/normalize-page-sizes");
    expect((formData as FormData).get("pageIndexes")).toBe("5,7");
    expect((formData as FormData).get("portraitWidth")).toBe("595");
    expect((formData as FormData).get("portraitHeight")).toBe("842");
    expect(config).toMatchObject({ responseType: "blob" });
    expect(result).not.toBe(source);
    expect(result.name).toBe("merged_11_normalized.pdf");
    expect(result.type).toBe("application/pdf");
    expect(await result.text()).toBe("normalized");
  });
});
