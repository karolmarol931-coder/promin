import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

const mocks = vi.hoisted(() => ({
  addFiles: vi.fn(),
  setWorkbench: vi.fn(),
  analyze: vi.fn(),
  normalize: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
vi.mock("@editor/contexts/NavigationContext", () => ({
  useNavigationActions: () => ({ actions: { setWorkbench: mocks.setWorkbench } }),
}));
vi.mock("@editor/hooks/useFileHandler", () => ({
  useFileHandler: () => ({ addFiles: mocks.addFiles }),
}));
vi.mock("@editor/tools/merge/pageSizeAnalysis", () => ({
  analyzeMergePageSizes: mocks.analyze,
}));
vi.mock("@editor/services/normalizePdfPageSizes", () => ({
  normalizePdfPageSizes: mocks.normalize,
}));
vi.mock("@editor/ui/Modal", () => ({
  Modal: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    footer: React.ReactNode;
  }) =>
    open ? (
      <section role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
        {footer}
      </section>
    ) : null,
}));

import ImportedPdfPageSizeReview from "@editor/components/layout/ImportedPdfPageSizeReview";
import { publishWorkbenchFilesAdded } from "@editor/services/workbenchFileEvents";
import type { StirlingFile } from "@editor/types/fileContext";

const plan = {
  portraitWidth: 595,
  portraitHeight: 842,
  pages: [{ fileIndex: 0, pageIndex: 5 }],
  outlierScale: 4.1,
};

function pdfFile(name: string, fileId: string) {
  const file = new File(["source"], name, { type: "application/pdf" });
  Object.defineProperty(file, "fileId", { value: fileId });
  return file as File & { fileId: string };
}

describe("ImportedPdfPageSizeReview", () => {
  beforeEach(() => {
    mocks.addFiles.mockReset();
    mocks.setWorkbench.mockReset();
    mocks.analyze.mockReset().mockResolvedValue(plan);
    mocks.normalize.mockReset();
  });

  it("offers a normalized copy for a newly imported single PDF and opens it", async () => {
    const source = pdfFile("merged_11.pdf", "source-id");
    const normalized = new File(["normalized"], "merged_11_normalized.pdf", {
      type: "application/pdf",
    });
    mocks.normalize.mockResolvedValue(normalized);
    mocks.addFiles.mockResolvedValue([normalized]);
    render(
      <MantineProvider env="test">
        <ImportedPdfPageSizeReview />
      </MantineProvider>,
    );

    act(() => {
      publishWorkbenchFilesAdded([source as StirlingFile]);
    });

    expect(await screen.findByRole("dialog", { name: "Different page sizes found" })).toBeInTheDocument();
    expect(mocks.analyze).toHaveBeenCalledExactlyOnceWith([source]);
    expect(screen.getByText(/Pages to normalize/)).toHaveTextContent("6");

    fireEvent.click(screen.getByRole("button", { name: "Create normalized copy and open it" }));

    await waitFor(() => expect(mocks.normalize).toHaveBeenCalledExactlyOnceWith(source, plan));
    expect(mocks.addFiles).toHaveBeenCalledExactlyOnceWith([normalized], { selectFiles: true });
    expect(mocks.setWorkbench).toHaveBeenCalledExactlyOnceWith("viewer");
  });
});
