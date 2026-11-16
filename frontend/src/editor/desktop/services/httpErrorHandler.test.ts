import { describe, expect, test, vi } from "vitest";
import { handleHttpError } from "@editor/services/httpErrorHandler";

vi.mock("@editor-core/services/httpErrorHandler", () => ({
  handleHttpError: vi.fn().mockResolvedValue(false),
}));

describe("local API errors", () => {
  test("does not open a sign-in flow for unauthorized local endpoints", async () => {
    const error = {
      isAxiosError: true,
      response: { status: 401, data: { error: "UNAUTHORIZED" } },
    };
    await expect(handleHttpError(error)).resolves.toBe(true);
  });

  test("shows the local permission error", async () => {
    const error = {
      isAxiosError: true,
      response: { status: 403, data: { error: "FORBIDDEN" } },
    };
    await expect(handleHttpError(error)).resolves.toBe(true);
  });

  test("keeps suppressed endpoint probes quiet", async () => {
    const error = {
      isAxiosError: true,
      config: { suppressErrorToast: true },
      response: { status: 500 },
    };
    await expect(handleHttpError(error)).resolves.toBe(false);
  });
});
