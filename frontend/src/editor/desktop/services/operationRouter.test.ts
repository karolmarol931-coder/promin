import { beforeEach, describe, expect, test, vi } from "vitest";

const local = vi.hoisted(() => ({
  backendUrl: "http://127.0.0.1:62994" as string | null,
  supported: true,
}));

vi.mock("@editor/services/tauriBackendService", () => ({
  tauriBackendService: { getBackendUrl: () => local.backendUrl },
}));
vi.mock("@editor/services/endpointAvailabilityService", () => ({
  endpointAvailabilityService: {
    isEndpointSupportedLocally: vi.fn(async () => local.supported),
  },
}));
vi.mock("@editor/i18n", () => ({
  default: { t: (_key: string, fallback: string) => fallback },
}));

import { operationRouter } from "@editor/services/operationRouter";
import { endpointAvailabilityService } from "@editor/services/endpointAvailabilityService";

beforeEach(() => {
  local.backendUrl = "http://127.0.0.1:62994";
  local.supported = true;
  vi.mocked(endpointAvailabilityService.isEndpointSupportedLocally).mockClear();
});

describe("local-only operation routing", () => {
  test("routes supported PDF operations to the bundled backend", async () => {
    await expect(
      operationRouter.getBaseUrl("/api/v1/misc/compress-pdf"),
    ).resolves.toBe("http://127.0.0.1:62994");
    expect(
      endpointAvailabilityService.isEndpointSupportedLocally,
    ).toHaveBeenCalledWith("compress-pdf", "http://127.0.0.1:62994");
  });

  test("rejects tools that are not available locally", async () => {
    local.supported = false;
    await expect(
      operationRouter.getBaseUrl("/api/v1/misc/ocr-pdf"),
    ).rejects.toThrow("unavailable in the local app");
  });

  test.each([
    "https://cloud.example/api/v1/misc/compress-pdf",
    "https://server.example/api/v1/convert/pdf/word",
    "/api/v1/ai/orchestrate/stream",
    "/api/v1/storage/files",
    "/api/v1/policies/run",
    "/api/v1/convert/url/pdf",
  ])("rejects off-device operation %s", async (endpoint) => {
    await expect(operationRouter.getBaseUrl(endpoint)).rejects.toThrow(
      "unavailable in the local app",
    );
  });

  test("fails while the local backend is starting", async () => {
    local.backendUrl = null;
    await expect(
      operationRouter.getBaseUrl("/api/v1/misc/compress-pdf"),
    ).rejects.toThrow("Local backend is still starting");
  });
});
