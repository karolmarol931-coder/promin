import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { TestQueryProvider } from "@editor/tests/utils/TestQueryProvider";
import { useGroupEnabled } from "@editor/hooks/useGroupEnabled";
import { fetchGroupEnabled } from "@editor/api/config";

vi.mock("@editor/api/config", () => ({ fetchGroupEnabled: vi.fn() }));

const mockFetch = vi.mocked(fetchGroupEnabled);

describe("local dependency availability", () => {
  it("reads the dependency status from the bundled backend", async () => {
    mockFetch.mockResolvedValue(true);

    const { result } = renderHook(() => useGroupEnabled("ImageMagick"), {
      wrapper: TestQueryProvider,
    });

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("ImageMagick");
  });

  it("keeps a missing local dependency disabled", async () => {
    mockFetch.mockResolvedValue(false);

    const { result } = renderHook(() => useGroupEnabled("ImageMagick"), {
      wrapper: TestQueryProvider,
    });

    await waitFor(() => expect(result.current.enabled).toBe(false));
  });
});
