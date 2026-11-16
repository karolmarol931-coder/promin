import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppConfigProvider } from "@editor/contexts/AppConfigContext";
import { QuickNavHostProvider } from "@editor/contexts/QuickNavHostContext";
import { QuickNavHostBridge } from "@editor/components/shared/quickNav/QuickNavHostBridge";

vi.mock("@editor/services/thumbnailGenerationService", () => ({
  thumbnailGenerationService: { generateThumbnails: vi.fn(async () => []) },
}));

function renderWithoutFileProvider() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AppConfigProvider
          autoFetch={false}
          initialConfig={{ enableEasterEggs: true }}
        >
          <QuickNavHostProvider>
            <QuickNavHostBridge />
          </QuickNavHostProvider>
        </AppConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("QuickNavHostBridge without a FileContextProvider", () => {
  it("mounts when the file workspace is unavailable", () => {
    expect(() => renderWithoutFileProvider()).not.toThrow();
  });
});
