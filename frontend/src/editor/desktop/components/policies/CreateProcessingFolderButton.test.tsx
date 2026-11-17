import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, expect, it, vi } from "vitest";
import { CreateProcessingFolderButton } from "@editor/components/policies/CreateProcessingFolderButton";

const mocks = vi.hoisted(() => ({
  pickDirectory: vi.fn(),
  importPdfFolder: vi.fn(),
  addFiles: vi.fn(),
  toast: {
    show: vi.fn(() => "folder-import"),
    update: vi.fn(),
    updateProgress: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === "string" ? fallback : (fallback?.defaultValue ?? key),
  }),
}));
vi.mock("@editor/services/directoryPicker", () => ({
  pickDirectory: mocks.pickDirectory,
}));
vi.mock("@editor/services/pdfFolderImport", () => ({
  importPdfFolder: mocks.importPdfFolder,
}));
vi.mock("@editor/hooks/useFileHandler", () => ({
  useFileHandler: () => ({ addFiles: mocks.addFiles }),
}));
vi.mock("@editor/components/toast/ToastContext", () => ({
  useToast: () => mocks.toast,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pickDirectory.mockResolvedValue({ path: "/docs", name: "docs" });
  mocks.importPdfFolder.mockImplementation(async (_path, addFiles) => {
    await addFiles([
      new File(["%PDF"], "file.pdf", { type: "application/pdf" }),
    ]);
    return { imported: 1, skipped: 0 };
  });
});

it("lets desktop users add PDFs from a local folder without account access", async () => {
  render(
    <MantineProvider env="test">
      <CreateProcessingFolderButton />
    </MantineProvider>,
  );

  const button = screen.getByRole("button", { name: "Добавить PDF из папки" });
  expect(button).toBeEnabled();
  fireEvent.click(button);

  await waitFor(() => {
    expect(mocks.pickDirectory).toHaveBeenCalledOnce();
    expect(mocks.importPdfFolder).toHaveBeenCalledOnce();
    expect(mocks.addFiles).toHaveBeenCalledOnce();
  });
  expect(mocks.importPdfFolder).toHaveBeenCalledWith(
    "/docs",
    expect.any(Function),
    expect.any(Function),
  );
});
