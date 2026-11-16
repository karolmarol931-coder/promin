import { afterEach, describe, expect, test, vi } from "vitest";

const openExternalMock = vi.fn<() => Promise<void>>();

vi.mock("@editor/platform/openExternal", () => ({
  openExternal: () => openExternalMock(),
}));

import { openExternalTab } from "@editor/platform/openExternalTab";
import { expectConsole } from "@editor/tests/failOnConsole";

describe("openExternalTab (desktop/Tauri)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    openExternalMock.mockReset();
  });

  test("routes valid links through the desktop external-link seam", async () => {
    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as Window | null);

    await openExternalTab("https://example.com/");

    expect(openExternalMock).toHaveBeenCalledOnce();
    expect(openSpy).not.toHaveBeenCalled();
  });

  test.each(["javascript:alert(1)", "file:///etc/passwd", "ftp://example.com"])(
    "refuses to hand %s to the OS",
    async (url) => {
      expectConsole.warn(/Refused to open unsafe URL/);

      await openExternalTab(url);

      expect(openExternalMock).not.toHaveBeenCalled();
    },
  );
});
