import { renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useSettingsNav } from "@editor/components/settings/useSettingsNav";

it("shows only local preferences and app information", () => {
  const { result } = renderHook(() => useSettingsNav(() => {}));

  expect(result.current.pending).toBe(false);
  expect(
    result.current.sections.flatMap((section) =>
      section.items.map((item) => item.key),
    ),
  ).toEqual(["general", "about"]);
});

it("routes old help, legal, account, and keyboard shortcut links locally", () => {
  const { result } = renderHook(() => useSettingsNav(() => {}));

  expect(result.current.aliases).toMatchObject({
    help: "about",
    legal: "about",
    backendThirdPartyLicenses: "about",
    frontendThirdPartyLicenses: "about",
    account: "general",
    hotkeys: "general",
  });
  expect(result.current.aliases).not.toHaveProperty("plan");
});
