import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopOnboardingModal } from "@editor/components/DesktopOnboardingModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
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
    title: string;
    body: string;
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

  it("explains that document processing stays on this Mac", () => {
    render(<DesktopOnboardingModal />);

    expect(screen.getByRole("dialog")).toHaveTextContent("Welcome to Promin");
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Your PDFs stay on this Mac.",
    );
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
