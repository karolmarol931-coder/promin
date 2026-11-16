import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

const viewer = { activeFileIndex: 0 };
const files = {
  files: [
    { fileId: "a", name: "alpha.pdf" },
    { fileId: "b", name: "beta.pdf" },
  ],
  fileStubs: [
    { id: "a", name: "alpha.pdf", thumbnailUrl: "alpha.png" },
    { id: "b", name: "beta.pdf", thumbnailUrl: "beta.png" },
  ],
};

vi.mock("@editor/contexts/ViewerContext", () => ({ useViewer: () => viewer }));
vi.mock("@editor/contexts/NavigationContext", () => ({
  useNavigationState: () => ({ workbench: "viewer" }),
}));
vi.mock("@editor/contexts/FileContext", () => ({ useAllFiles: () => files }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string, values?: Record<string, unknown>) =>
      (fallback ?? _key).replace(/{{(\w+)}}/g, (_, name: string) =>
        String(values?.[name] ?? ""),
      ),
  }),
}));

import RotateSettings from "@editor/components/tools/rotate/RotateSettings";

const parameters = {
  parameters: { angle: 0 },
  rotateClockwise: vi.fn(),
  rotateAnticlockwise: vi.fn(),
  updateParameter: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  parameters.parameters.angle = 0;
});

const renderAt = (activeFileIndex: number) => {
  viewer.activeFileIndex = activeFileIndex;
  return render(
    <MantineProvider>
      <RotateSettings parameters={parameters as never} />
    </MantineProvider>,
  );
};

describe("RotateSettings preview", () => {
  it("previews the viewer's active file, not the first loaded one", () => {
    renderAt(1);

    expect(screen.getByAltText("Preview of beta.pdf")).toBeInTheDocument();
    expect(screen.queryByAltText("Preview of alpha.pdf")).toBeNull();
  });

  it("follows the viewer when the active file changes", () => {
    const { rerender } = renderAt(0);
    expect(screen.getByAltText("Preview of alpha.pdf")).toBeInTheDocument();

    viewer.activeFileIndex = 1;
    rerender(
      <MantineProvider>
        <RotateSettings parameters={parameters as never} />
      </MantineProvider>,
    );

    expect(screen.getByAltText("Preview of beta.pdf")).toBeInTheDocument();
  });

  it("shows the normalized angle and resets it to zero", () => {
    parameters.parameters.angle = -90;
    renderAt(0);

    expect(screen.getByText("Rotation: 270°")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(parameters.updateParameter).toHaveBeenCalledWith("angle", 0);
  });

  it("rotates with arrow keys only when the panel itself has focus", () => {
    renderAt(0);
    const panel = screen.getByRole("region", { name: "Rotation controls" });

    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(parameters.rotateClockwise).not.toHaveBeenCalled();

    panel.focus();
    fireEvent.keyDown(panel, { key: "ArrowRight" });
    expect(parameters.rotateClockwise).toHaveBeenCalledOnce();

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Rotate Anticlockwise" }),
      { key: "ArrowLeft" },
    );
    expect(parameters.rotateAnticlockwise).not.toHaveBeenCalled();
  });
});
