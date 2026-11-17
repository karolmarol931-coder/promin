import { beforeEach, expect, it, vi } from "vitest";
import apiClient from "@editor/services/apiClient";
import { resolveEndpointsAvailability } from "@editor/api/endpointAvailability";

vi.mock("@editor/services/apiClient", () => ({
  default: { get: vi.fn() },
}));

vi.mock("@editor/services/tauriBackendService", () => ({
  tauriBackendService: {
    isOnline: true,
  },
}));

vi.mock("@editor/services/documentPrivacyService", () => ({
  isOffDeviceEndpointName: () => false,
}));

const get = vi.mocked(apiClient.get);

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValueOnce({ data: { dependenciesReady: true } } as never);
  get.mockResolvedValueOnce({
    data: { "text-editor-pdf": { enabled: true, reason: null } },
  } as never);
});

it("queries the requested endpoint so newer tools are not omitted from the server-wide list", async () => {
  const result = await resolveEndpointsAvailability(["text-editor-pdf"]);

  expect(result["text-editor-pdf"]).toEqual({ enabled: true, reason: null });
  expect(get).toHaveBeenNthCalledWith(
    2,
    "/api/v1/config/endpoints-availability?endpoints=text-editor-pdf",
    { suppressErrorToast: true },
  );
});
