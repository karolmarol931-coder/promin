import { describe, expect, test } from "vitest";
import { useServerProcessingBlock } from "@editor/hooks/useServerProcessingBlock";

describe("local server processing availability", () => {
  test("keeps server folder processing unavailable", () => {
    expect(useServerProcessingBlock()).toBe(
      "Server folder processing is unavailable in the local app.",
    );
  });
});
