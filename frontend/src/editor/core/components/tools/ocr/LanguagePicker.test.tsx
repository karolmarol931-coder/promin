import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import LanguagePicker from "@editor/components/tools/ocr/LanguagePicker";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@editor/services/apiClient", () => ({ default: { get: api.get } }));

vi.mock("react-i18next", () => {
  const t = (key: string, fallback?: unknown) =>
    typeof fallback === "string" ? fallback : key;
  return { useTranslation: () => ({ i18n: { language: "en-US" }, t }) };
});

beforeEach(() => vi.clearAllMocks());

function renderPicker() {
  return render(
    <MantineProvider>
      <LanguagePicker value={[]} onChange={vi.fn()} />
    </MantineProvider>,
  );
}

describe("OCR language availability", () => {
  test("explains when local languages could not be loaded and retries on request", async () => {
    let shouldFail = true;
    api.get.mockImplementation(async () => {
      if (shouldFail) throw new Error("Local service unavailable");
      return { data: { languages: ["eng"] } };
    });
    renderPicker();

    shouldFail = false;
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "dropdownList.selectLanguages",
      }),
    );

    expect(await screen.findByText("English")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  test("explains when no OCR language data is installed", async () => {
    api.get.mockResolvedValue({ data: { languages: [] } });
    renderPicker();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "No OCR languages are installed",
    );
  });
});
