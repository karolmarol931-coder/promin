import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopOnboardingModal } from "@editor/components/DesktopOnboardingModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
  Trans: ({ defaults }: { defaults: string }) =>
    defaults.replace(/<\/?[a-z][^>]*>/gi, ""),
}));

vi.mock("@editor/components/onboarding/OnboardingSlideShell", () => ({
  default: ({
    opened,
    title,
    body,
    buttons,
    onAction,
  }: {
    opened: boolean;
    title: ReactNode;
    body: ReactNode;
    buttons: Array<{ label: string }>;
    onAction: () => void;
  }) =>
    opened ? (
      <div role="dialog">
        <h1>{title}</h1>
        <p>{body}</p>
        <button onClick={onAction}>{buttons[0].label}</button>
      </div>
    ) : null,
  ShellHero: () => null,
}));

describe("DesktopOnboardingModal", () => {
  beforeEach(() => localStorage.clear());

  it("renders the welcome content without showing markup", () => {
    render(<DesktopOnboardingModal />);

    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveTextContent("Welcome to Promin Desktop");
    expect(dialog).toHaveTextContent("Agent Chat");
    expect(dialog).toHaveTextContent("classification");
    expect(dialog).not.toHaveTextContent(/<\/?(product|strong)>/);
    expect(screen.queryByText(/sign in|server/i)).toBeNull();
  });

  it("dismisses the welcome once the user continues", () => {
    render(<DesktopOnboardingModal />);

    fireEvent.click(screen.getByRole("button", { name: "Get started" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("promin-desktop-onboarding-seen.v1")).toBe(
      "true",
    );
  });
});
