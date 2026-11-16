import axios from "axios";
import { beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
  online: true,
  getBaseUrl: vi.fn(async () => "http://127.0.0.1:62994"),
  alert: vi.fn(),
}));

vi.mock("@editor-core/services/apiClientSetup", () => ({
  setupApiInterceptors: vi.fn(),
}));
vi.mock("@editor/services/tauriBackendService", () => ({
  tauriBackendService: {
    getBackendUrl: () => "http://127.0.0.1:62994",
    get isOnline() {
      return state.online;
    },
  },
}));
vi.mock("@editor/services/operationRouter", () => ({
  operationRouter: { getBaseUrl: state.getBaseUrl },
}));
vi.mock("@editor/components/toast", () => ({ alert: state.alert }));
vi.mock("@editor/constants/backendErrors", () => ({
  createBackendNotReadyError: () => new Error("local backend not ready"),
}));
vi.mock("@editor/i18n", () => ({
  default: { t: (_key: string, fallback: string) => fallback },
}));

import {
  getAuthHeaders,
  setupApiInterceptors,
} from "@editor/services/apiClientSetup";

beforeEach(() => {
  state.online = true;
  state.alert.mockClear();
  state.getBaseUrl.mockClear().mockResolvedValue("http://127.0.0.1:62994");
});

describe("local desktop API client", () => {
  test("uses the bundled backend without credentials", async () => {
    const client = axios.create({
      adapter: async (config) => ({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      }),
    });
    setupApiInterceptors(client);

    await client.post("/api/v1/misc/compress-pdf", new FormData());

    expect(state.getBaseUrl).toHaveBeenCalledWith(
      "/api/v1/misc/compress-pdf",
      undefined,
    );
    expect(await getAuthHeaders()).toEqual({});
  });

  test("blocks mutations until the bundled backend is ready", async () => {
    state.online = false;
    const client = axios.create();
    setupApiInterceptors(client);

    await expect(client.post("/api/v1/misc/compress-pdf")).rejects.toThrow(
      "local backend not ready",
    );
    expect(state.alert).toHaveBeenCalledOnce();
  });
});
