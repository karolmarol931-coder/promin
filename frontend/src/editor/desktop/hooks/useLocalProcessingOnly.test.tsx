import { expect, test } from "vitest";
import { useLocalProcessingOnly } from "@editor/hooks/useLocalProcessingOnly";

test("always requires local document processing", () => {
  expect(useLocalProcessingOnly()).toBe(true);
});
