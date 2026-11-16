import { describe, it, expect } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NavFooter } from "@editor/components/shared/navFooter/NavFooter";

function withProviders(ui: React.ReactNode) {
  return <MantineProvider>{ui}</MantineProvider>;
}

function renderFooter() {
  const { container } = render(
    withProviders(<NavFooter displayName="admin" onOpenSettings={() => {}} />),
  );
  return container.querySelector(".nav-footer") as HTMLElement;
}

describe("NavFooter", () => {
  it("animates only on its first mount in the page session", () => {
    expect(renderFooter().dataset.animate).toBe("true");
    cleanup();
    expect(renderFooter().dataset.animate).toBeUndefined();
  });

  it("can omit the account row when the rail owns it", () => {
    const { container } = render(
      withProviders(<NavFooter displayName="admin" showAccount={false} />),
    );
    expect(container.querySelector(".nav-footer")).toBeNull();
  });
});
