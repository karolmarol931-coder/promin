import { expect, test } from "vitest";
import { getAiBaseUrl } from "@editor/services/aiBaseUrl";

test("AI streams do not resolve a remote server in the local app", async () => {
  await expect(getAiBaseUrl()).rejects.toThrow(
    "AI services are unavailable in the local app.",
  );
});
