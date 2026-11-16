import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { QuickNavRailAccount } from "@editor/components/shared/quickNav/QuickNavRailAccount";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

it("opens local settings without presenting account identity", () => {
  const onOpen = vi.fn();

  render(
    <QuickNavRailAccount
      identity={{
        displayName: "Grace Hopper",
        profilePictureUrl: "https://example.com/avatar.png",
      }}
      onOpen={onOpen}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(onOpen).toHaveBeenCalledOnce();
  expect(screen.queryByText("Grace Hopper")).toBeNull();
  expect(screen.queryByRole("img")).toBeNull();
});
