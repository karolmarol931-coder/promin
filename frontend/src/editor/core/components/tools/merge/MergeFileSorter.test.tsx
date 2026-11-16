import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { FileId } from "@editor/types/file";
import MergeFileSorter from "@editor/components/tools/merge/MergeFileSorter";

const mockT = vi.fn((key: string, options?: { fileName?: string }) =>
  options?.fileName ? `mock-${key}-${options.fileName}` : `mock-${key}`,
);
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("MergeFileSorter", () => {
  const mockOnSortFiles = vi.fn();
  const mockOnMoveFile = vi.fn();
  const mockOnReorderFile = vi.fn();
  const files = [
    Object.assign(new File(["one"], "one.pdf"), {
      fileId: "one" as FileId,
      quickKey: "one.pdf|3|0",
    }),
    Object.assign(new File(["two"], "two.pdf"), {
      fileId: "two" as FileId,
      quickKey: "two.pdf|3|0",
    }),
    Object.assign(new File(["three"], "three.pdf"), {
      fileId: "three" as FileId,
      quickKey: "three.pdf|5|0",
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows the merge order and accessible arrow controls", () => {
    render(
      <TestWrapper>
        <MergeFileSorter
          files={files}
          onSortFiles={mockOnSortFiles}
          onMoveFile={mockOnMoveFile}
        />
      </TestWrapper>,
    );

    const list = screen.getByRole("list", {
      name: "mock-merge.sortBy.orderLabel",
    });
    expect(list.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByText("one.pdf")).toBeInTheDocument();
    expect(screen.getByText("two.pdf")).toBeInTheDocument();
    expect(screen.getByText("three.pdf")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "mock-merge.sortBy.moveUp-one.pdf" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "mock-merge.sortBy.moveUp-two.pdf" }),
    );
    expect(mockOnMoveFile).toHaveBeenCalledWith("two", "up");
  });

  test("reorders files by dragging one onto another", () => {
    render(
      <TestWrapper>
        <MergeFileSorter
          files={files}
          onSortFiles={mockOnSortFiles}
          onReorderFile={mockOnReorderFile}
        />
      </TestWrapper>,
    );

    const source = screen.getByText("one.pdf").closest("li");
    const target = screen.getByText("two.pdf").closest("li");
    if (!source || !target) throw new Error("Expected both file rows");
    const dataTransfer = { effectAllowed: "", setData: vi.fn() };

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.drop(target, { dataTransfer, clientY: 0 });

    expect(mockOnReorderFile).toHaveBeenCalledWith("one", "two", false);
  });

  test("keeps automatic sorting collapsed under More options", () => {
    render(
      <TestWrapper>
        <MergeFileSorter
          files={files}
          onSortFiles={mockOnSortFiles}
          onReorderFile={mockOnReorderFile}
        />
      </TestWrapper>,
    );

    const optionsControl = screen.getByRole("button", {
      name: "mock-merge.sortBy.advancedOptions",
    });
    expect(optionsControl).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(optionsControl);
    expect(optionsControl).toHaveAttribute("aria-expanded", "true");
  });

  test("shows quick sorting with multiple files and applies only when requested", () => {
    render(
      <TestWrapper>
        <MergeFileSorter files={files} onSortFiles={mockOnSortFiles} />
      </TestWrapper>,
    );

    expect(mockOnSortFiles).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "mock-merge.sortBy.sort" }),
    );

    expect(mockOnSortFiles).toHaveBeenCalledWith("filename", true);
  });

  test("disables file order controls while the merge operation is running", () => {
    render(
      <TestWrapper>
        <MergeFileSorter
          files={files}
          onSortFiles={mockOnSortFiles}
          onMoveFile={mockOnMoveFile}
          disabled
        />
      </TestWrapper>,
    );

    expect(
      screen.getByRole("button", {
        name: "mock-merge.sortBy.moveDown-one.pdf",
      }),
    ).toBeDisabled();
    expect(screen.getByText("one.pdf").closest("li")).not.toHaveAttribute(
      "draggable",
      "true",
    );
  });
});
