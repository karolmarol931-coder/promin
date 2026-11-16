import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppProviders } from "@editor/components/AppProviders";

const { initializeBackend } = vi.hoisted(() => ({
  initializeBackend: vi.fn(),
}));

vi.mock("@editor-core/components/AppProviders", () => ({
  AppProviders: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@editor/hooks/useBackendInitializer", () => ({
  useBackendInitializer: initializeBackend,
}));
vi.mock("@editor/components/DesktopConfigSync", () => ({
  DesktopConfigSync: () => null,
}));
vi.mock("@editor/components/DesktopQueryCacheReset", () => ({
  DesktopQueryCacheReset: () => null,
}));
vi.mock("@editor/components/SaveShortcutListener", () => ({
  SaveShortcutListener: () => null,
}));
vi.mock("@editor/components/shared/DiskConflictHost", () => ({
  DiskConflictHost: () => null,
}));

it("starts the local backend without adding account or update prompts", () => {
  initializeBackend.mockClear();

  render(<AppProviders>Workbench</AppProviders>);

  expect(initializeBackend).toHaveBeenCalledWith(true);
  expect(screen.getByText("Workbench")).toBeInTheDocument();
  expect(screen.queryByText(/sign in|log in/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/update available/i)).not.toBeInTheDocument();
});
