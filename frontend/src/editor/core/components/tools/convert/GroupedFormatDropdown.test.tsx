import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import GroupedFormatDropdown from "@editor/components/tools/convert/GroupedFormatDropdown";

vi.mock("react-i18next", () => {
  const t = (key: string, fallback?: unknown) =>
    typeof fallback === "string" ? fallback : key;
  return { useTranslation: () => ({ t }) };
});

const options = [
  { value: "pdf", label: "PDF", group: "Documents" },
  { value: "docx", label: "Word document", group: "Documents" },
  { value: "png", label: "PNG image", group: "Images" },
];

function renderDropdown(onChange = vi.fn()) {
  render(
    <MantineProvider>
      <GroupedFormatDropdown
        value=""
        placeholder="Choose a format"
        options={options}
        onChange={onChange}
      />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Choose a format" }));
  return { onChange };
}

describe("GroupedFormatDropdown search", () => {
  test("filters formats by their display name and file extension", async () => {
    renderDropdown();
    const search = await screen.findByRole("textbox", {
      name: "convert.formatSearchPlaceholder",
    });

    fireEvent.change(search, { target: { value: "docx" } });

    expect(screen.getByTestId("format-option-docx")).toBeInTheDocument();
    expect(screen.queryByTestId("format-option-pdf")).toBeNull();
  });

  test("keeps the groups and explains when a search has no matches", async () => {
    renderDropdown();
    const search = await screen.findByRole("textbox", {
      name: "convert.formatSearchPlaceholder",
    });

    fireEvent.change(search, { target: { value: "unknown" } });

    expect(
      screen.getByText("convert.formatSearchNoResults"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Documents")).toBeNull();
  });
});
