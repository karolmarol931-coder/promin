import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  downloadFile: vi.fn(),
  downloadFromUrl: vi.fn(),
}));

vi.mock("@editor/services/exportWithPolicy", () => ({
  downloadFileWithPolicy: mocks.downloadFile,
}));

vi.mock("@editor/services/downloadService", () => ({
  downloadFromUrl: mocks.downloadFromUrl,
}));

import { saveOperationResults } from "@editor/services/operationResultsSaveService";

describe("desktop operation result saving", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.downloadFile.mockResolvedValue({ savedPath: "/tmp/result.pdf" });
    mocks.downloadFromUrl.mockResolvedValue({ savedPath: "/tmp/result.pdf" });
  });

  it("saves the returned file when it is no longer in the file cache", async () => {
    const file = new File(["result"], "result.pdf", {
      type: "application/pdf",
    });
    const markSaved = vi.fn();

    const result = await saveOperationResults({
      downloadUrl: "blob:result",
      downloadFilename: "result.pdf",
      outputFileIds: ["result-id"],
      outputFiles: [file],
      getFile: () => undefined,
      getStub: () => undefined,
      markSaved,
    });

    expect(mocks.downloadFile).toHaveBeenCalledWith({
      data: file,
      filename: "result.pdf",
      localPath: undefined,
      fileId: "result-id",
    });
    expect(mocks.downloadFromUrl).not.toHaveBeenCalled();
    expect(markSaved).toHaveBeenCalledWith("result-id", "/tmp/result.pdf");
    expect(result).toEqual({ savedPath: "/tmp/result.pdf" });
  });
});
