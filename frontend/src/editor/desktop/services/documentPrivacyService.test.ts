import { beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
  localUrl: "http://127.0.0.1:62994" as string | null,
  fetch: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-http", () => ({ fetch: state.fetch }));
vi.mock("@editor/services/tauriBackendService", () => ({
  tauriBackendService: { getBackendUrl: () => state.localUrl },
}));
vi.mock("@editor/i18n", () => ({
  default: { t: (_key: string, fallback: string) => fallback },
}));
vi.mock("@editor/services/tauriLocalProxy", () => ({
  shouldUseFastLocalTransport: () => false,
  materializeLocalFormData: async (formData: FormData) => formData,
}));

import { create } from "@editor/services/tauriHttpClient";

beforeEach(() => {
  state.localUrl = "http://127.0.0.1:62994";
  state.fetch
    .mockReset()
    .mockImplementation(
      async () =>
        new Response("{}", { headers: { "Content-Type": "application/json" } }),
    );
});

describe("local document request boundary", () => {
  test.each([
    "https://cloud.example/api/v1/misc/compress-pdf",
    "https://upload.example/object?signature=abc",
    "http://127.0.0.1:7777/api/v1/misc/compress-pdf",
    "http://127.0.0.1:62994/api/v1/ai/orchestrate/stream",
    "http://127.0.0.1:62994/api/v1/storage/files",
    "http://127.0.0.1:62994/api/v1/sharing/create",
    "http://127.0.0.1:62994/api/v1/security/timestamp-pdf",
    "http://127.0.0.1:62994/api/v1/convert/url/pdf",
  ])("blocks %s before sending document data", async (url) => {
    const body = new FormData();
    body.append("fileInput", new File(["private"], "private.pdf"));

    await expect(create().post(url, body)).rejects.toThrow(
      "This feature is unavailable in the local app.",
    );
    expect(state.fetch).not.toHaveBeenCalled();
  });

  test("allows supported local PDF processing without credentials", async () => {
    const body = new FormData();
    body.append("fileInput", new File(["private"], "private.pdf"));

    await create().post(
      "http://127.0.0.1:62994/api/v1/misc/compress-pdf",
      body,
      { headers: { Authorization: "Bearer ignored" }, withCredentials: true },
    );

    expect(state.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:62994/api/v1/misc/compress-pdf",
      expect.objectContaining({
        body,
        credentials: "omit",
        maxRedirections: 0,
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      }),
    );
  });

  test("blocks local operations until the bundled backend address is known", async () => {
    state.localUrl = null;

    await expect(
      create().post(
        "http://127.0.0.1:62994/api/v1/misc/compress-pdf",
        "private",
      ),
    ).rejects.toThrow();
    expect(state.fetch).not.toHaveBeenCalled();
  });
});
