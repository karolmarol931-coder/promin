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
  useTranslation: () => ({
    t: (_key: string, fallback: string, options?: Record<string, string | number>) =>
      Object.entries(options ?? {}).reduce(
        (value, [key, replacement]) => value.replaceAll(`{{${key}}}`, String(replacement)),
        fallback,
      ),
    i18n: { language: "en-US" },
  }),
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
  totalPageCount: 6,
  referencePageCount: 5,
  pages: [{ fileIndex: 0, pageIndex: 5, width: 2432, height: 3440 }],
  outlierScale: 4.1,
};

function pdfFile(name: string, fileId: string) {
  const file = new File(["source"], name, { type: "application/pdf" });
  Object.defineProperty(file, "fileId", { value: fileId });
  return file as File & { fileId: string };
}

function renderReview(source: File) {
  render(
    <MantineProvider env="test">
      <ImportedPdfPageSizeReview />
    </MantineProvider>,
  );
  act(() => {
    publishWorkbenchFilesAdded([source as StirlingFile]);
  });
}

describe("ImportedPdfPageSizeReview", () => {
  beforeEach(() => {
    mocks.addFiles.mockReset();
    mocks.setWorkbench.mockReset();
    mocks.analyze.mockReset().mockResolvedValue(plan);
    mocks.normalize.mockReset();
    mocks.addFiles.mockResolvedValue([new File(["copy"], "adjusted.pdf")]);
  });

  it("identifies the last page as the only suggested change in the six-page PDF", async () => {
    renderReview(pdfFile("merged_11.pdf", "source-id"));

    expect(await screen.findByRole("dialog", { name: "Different page sizes in this PDF" })).toBeInTheDocument();
    expect(screen.getByText("Pages in this PDF").parentElement).toHaveTextContent("6");
    expect(screen.getByText("Pages with the common size").parentElement).toHaveTextContent("5");
    expect(screen.getByRole("checkbox", { name: /Page 6 of 6/ })).toBeChecked();
    expect(screen.getByText(/858 × 1213 mm/)).toBeInTheDocument();
    expect(screen.getByText("A4 · 210 × 297 mm")).toBeInTheDocument();
  });

  it("keeps the primary action disabled until a page is selected", async () => {
    renderReview(pdfFile("merged_11.pdf", "source-id"));
    const checkbox = await screen.findByRole("checkbox", { name: /Page 6 of 6/ });
    const button = screen.getByRole("button", {
      name: "Create a copy with selected pages resized",
    });

    expect(button).toBeEnabled();
    fireEvent.click(checkbox);
    expect(button).toBeDisabled();
    fireEvent.click(checkbox);
    expect(button).toBeEnabled();
  });

  it("resizes only the pages that remain selected", async () => {
    const multiPagePlan = {
      ...plan,
      totalPageCount: 8,
      referencePageCount: 6,
      pages: [
        { fileIndex: 0, pageIndex: 5, width: 2432, height: 3440 },
        { fileIndex: 0, pageIndex: 7, width: 2432, height: 3440 },
      ],
    };
    mocks.analyze.mockResolvedValue(multiPagePlan);
    const source = pdfFile("merged_11.pdf", "source-id");
    const normalized = new File(["normalized"], "merged_11_normalized.pdf", {
      type: "application/pdf",
    });
    mocks.normalize.mockResolvedValue(normalized);
    renderReview(source);

    const lastPage = await screen.findByRole("checkbox", { name: /Page 8 of 8/ });
    fireEvent.click(lastPage);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Create a copy with selected pages resized",
      }),
    );

    const selectedPlan = {
      ...multiPagePlan,
      pages: [multiPagePlan.pages[0]],
    };
    await waitFor(() => expect(mocks.normalize).toHaveBeenCalledExactlyOnceWith(source, selectedPlan));
    expect(mocks.addFiles).toHaveBeenCalledExactlyOnceWith([normalized], {
      selectFiles: true,
    });
    expect(mocks.setWorkbench).toHaveBeenCalledExactlyOnceWith("viewer");
  });
});
