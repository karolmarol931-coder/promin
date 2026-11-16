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
      hideAdminBanner,
    }: {
      editorDefaultsSlot?: ReactNode;
      hideAdminBanner?: boolean;
    }) => (
      <section
        data-testid="preferences"
        data-admin-banner-hidden={String(hideAdminBanner)}
      >
        {editorDefaultsSlot}
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
});
