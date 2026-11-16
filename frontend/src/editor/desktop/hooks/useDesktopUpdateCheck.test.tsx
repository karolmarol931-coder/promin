import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isTauri: vi.fn<() => boolean>(),
  windowLabel: "main",
  check: vi.fn(),
  downloadAndInstall: vi.fn(),
  closeUpdate: vi.fn(),
  alert: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ isTauri: mocks.isTauri }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ label: mocks.windowLabel }),
}));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));
vi.mock("@editor/i18n", () => ({
  default: { t: (_key: string, fallback: string) => fallback },
}));
vi.mock("@editor/components/toast", () => ({ alert: mocks.alert }));

let useDesktopUpdateCheck: typeof import("@editor/hooks/useDesktopUpdateCheck").useDesktopUpdateCheck;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.isTauri.mockReturnValue(true);
  mocks.windowLabel = "main";
  mocks.check.mockResolvedValue(null);
  mocks.downloadAndInstall.mockResolvedValue(undefined);
  mocks.closeUpdate.mockResolvedValue(undefined);
  ({ useDesktopUpdateCheck } =
    await import("@editor/hooks/useDesktopUpdateCheck"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("desktop update lifecycle", () => {
  it("installs a found update and tells the user to reopen Promin", async () => {
    const update = {
      version: "3.2.4",
      downloadAndInstall: mocks.downloadAndInstall,
      close: mocks.closeUpdate,
    };
    mocks.check.mockResolvedValue(update);
    const setInterval = vi.spyOn(window, "setInterval");
    const clearInterval = vi.spyOn(window, "clearInterval");

    const { unmount } = renderHook(useDesktopUpdateCheck);

    await waitFor(() => expect(mocks.alert).toHaveBeenCalledOnce());

    expect(mocks.check).toHaveBeenCalledWith({ timeout: 20_000 });
    expect(mocks.downloadAndInstall).toHaveBeenCalledWith(undefined, {
      timeout: 7_200_000,
    });
    expect(mocks.closeUpdate).toHaveBeenCalledOnce();
    expect(mocks.alert).toHaveBeenCalledWith({
      alertType: "neutral",
      title: "Update ready",
      body: "The new version will be active the next time you open Promin.",
      durationMs: 8000,
      expandable: false,
    });
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 28_800_000);

    unmount();
    expect(clearInterval).toHaveBeenCalledWith(
      setInterval.mock.results[0].value,
    );
  });

  it("keeps the current app running if the update server is unreachable", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.check.mockRejectedValue(new Error("network unavailable"));

    const { unmount } = renderHook(useDesktopUpdateCheck);

    await waitFor(() =>
      expect(warning).toHaveBeenCalledWith(
        "[DesktopUpdater] Update check or installation failed",
        expect.any(Error),
      ),
    );

    expect(mocks.downloadAndInstall).not.toHaveBeenCalled();
    expect(mocks.alert).not.toHaveBeenCalled();
    unmount();
  });

  it("skips updater checks outside the main Tauri window", () => {
    mocks.windowLabel = "settings";

    const { unmount } = renderHook(useDesktopUpdateCheck);

    expect(mocks.check).not.toHaveBeenCalled();
    unmount();
  });

  it("does not check for updates in a web build", () => {
    mocks.isTauri.mockReturnValue(false);

    const { unmount } = renderHook(useDesktopUpdateCheck);

    expect(mocks.check).not.toHaveBeenCalled();
    unmount();
  });
});
