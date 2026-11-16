import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProcessingFolderCreation } from "@editor/hooks/useProcessingFolderCreation";

describe("desktop processing-folder setup", () => {
  it("does not expose an account-only folder setup action", () => {
    const { result } = renderHook(useProcessingFolderCreation);

    expect(result.current.open).toBeUndefined();
    expect(result.current.dialog).toBeNull();
  });
});
