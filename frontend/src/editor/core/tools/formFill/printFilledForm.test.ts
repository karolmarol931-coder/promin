import { beforeEach, describe, expect, it, vi } from "vitest";

const { enforceExportPolicies, assertFilesNotBlocked, printPdfFile } =
  vi.hoisted(() => ({
    enforceExportPolicies: vi.fn(),
    assertFilesNotBlocked: vi.fn(),
    printPdfFile: vi.fn(),
  }));

vi.mock("@editor/services/policyExport", () => ({ enforceExportPolicies }));
vi.mock("@editor/services/policyFileGuard", () => ({
  assertFilesNotBlocked,
}));
vi.mock("@editor/services/printPdfFileService", () => ({ printPdfFile }));

import { printFilledForm } from "@editor/tools/formFill/printFilledForm";

describe("printFilledForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceExportPolicies.mockImplementation(async (files: File[]) => files);
    printPdfFile.mockResolvedValue(undefined);
  });

  it("prints a flattened PDF created from the current form values", async () => {
    const source = new File(["source"], "application.pdf", {
      type: "application/pdf",
    });
    const filled = new Blob(["filled values"], { type: "application/pdf" });
    const submitForm = vi.fn().mockResolvedValue(filled);

    await expect(printFilledForm(source, "file-1", submitForm)).resolves.toBe(
      "printed",
    );

    expect(submitForm).toHaveBeenCalledWith(source, true);
    expect(printPdfFile).toHaveBeenCalledTimes(1);
    const printedFile = printPdfFile.mock.calls[0][0] as File;
    expect(printedFile).not.toBe(source);
    expect(printedFile.name).toBe(source.name);
    const printedContents = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(printedFile);
    });
    expect(printedContents).toBe("filled values");
  });

  it("stops when export policy replaces the prepared print file", async () => {
    const source = new File(["source"], "application.pdf", {
      type: "application/pdf",
    });
    const submitForm = vi
      .fn()
      .mockResolvedValue(new Blob(["filled"], { type: "application/pdf" }));
    const policyFile = new File(["policy"], "application.pdf", {
      type: "application/pdf",
    });
    enforceExportPolicies.mockResolvedValue([policyFile]);

    await expect(printFilledForm(source, "file-1", submitForm)).resolves.toBe(
      "policy-applied",
    );

    expect(printPdfFile).not.toHaveBeenCalled();
  });
});
