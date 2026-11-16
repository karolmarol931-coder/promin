import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import SplitMethodSelector from "@editor/components/tools/split/SplitMethodSelector";
import {
  METHOD_OPTIONS,
  SPLIT_METHODS,
} from "@editor/constants/splitConstants";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => `translated:${key}` }),
}));

describe("SplitMethodSelector", () => {
  test("shows clear primary methods and explains the selected method", () => {
    const onSelect = vi.fn();
    render(
      <MantineProvider>
        <SplitMethodSelector
          options={METHOD_OPTIONS}
          selectedMethod={SPLIT_METHODS.BY_PAGES}
          onSelect={onSelect}
        />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("button", {
        name: "translated:split.methods.byPages.name",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    const pageCountButton = screen.getByRole("button", {
      name: "translated:split.methods.byPageCount.name",
    });
    expect(pageCountButton).toBeInTheDocument();
    expect(pageCountButton).toHaveClass("sui-btn--wrap");
    expect(
      screen.getByRole("button", {
        name: "translated:split.methods.bySize.name",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("translated:split.methods.byPages.tooltip"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "translated:split.methods.byPageCount.name",
      }),
    );
    expect(onSelect).toHaveBeenCalledWith(SPLIT_METHODS.BY_PAGE_COUNT);
  });
});
