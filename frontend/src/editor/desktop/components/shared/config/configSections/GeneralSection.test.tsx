import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { expect, it, vi } from "vitest";
import GeneralSection from "@editor/components/shared/config/configSections/GeneralSection";

vi.mock(
  "@editor-core/components/shared/config/configSections/preferences/PreferencesSection",
  () => ({
    default: ({
      editorDefaultsSlot,
      diagnosticsSlot,
      hideAdminBanner,
    }: {
      editorDefaultsSlot?: ReactNode;
      diagnosticsSlot?: ReactNode;
      hideAdminBanner?: boolean;
    }) => (
      <section
        data-testid="preferences"
        data-admin-banner-hidden={String(hideAdminBanner)}
      >
        {editorDefaultsSlot}
        {diagnosticsSlot}
      </section>
    ),
  }),
);
vi.mock(
  "@editor/components/shared/config/configSections/DefaultAppSettings",
  () => ({
    DefaultAppSettings: () => <div>Local PDF defaults</div>,
  }),
);
vi.mock(
  "@editor/components/shared/config/configSections/DiagnosticsCard",
  () => ({ DiagnosticsCard: () => <div>Local diagnostics</div> }),
);
it("keeps local PDF preferences", () => {
  render(
    <MantineProvider>
      <GeneralSection />
    </MantineProvider>,
  );

  expect(screen.getByText("Local PDF defaults")).toBeInTheDocument();
  expect(screen.getByTestId("preferences")).toHaveAttribute(
    "data-admin-banner-hidden",
    "true",
  );
  expect(screen.getByText("Local diagnostics")).toBeInTheDocument();
});
