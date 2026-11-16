import { expect, test, vi } from "vitest";

vi.mock("@editor/services/operationRouter", () => ({
  operationRouter: {
    getBaseUrl: vi.fn().mockRejectedValue(new Error("Unavailable locally")),
  },
}));

import { operationRouter } from "@editor/services/operationRouter";
import { getPolicyOutputBaseUrl } from "@editor/services/policyOutputBaseUrl";

test("policy outputs fail closed when no local policy endpoint is available", async () => {
  await expect(getPolicyOutputBaseUrl("local")).rejects.toThrow(
    "Unavailable locally",
  );
  expect(operationRouter.getBaseUrl).toHaveBeenCalledWith("/api/v1/policies");
});
