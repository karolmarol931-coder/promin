import type { ToolRegistryEntry } from "@editor/data/toolsTaxonomy";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ToolButton from "@editor/components/tools/toolPicker/ToolButton";

const state = vi.hoisted(() => ({
  availability: {} as Record<string, object>,
}));

vi.mock("@editor-core/components/tools/toolPicker/ToolButton", () => ({
  default: ({ tool }: { tool: { name: string } }) => (
    <button type="button">{tool.name}</button>
  ),
}));
vi.mock("@editor/contexts/ToolWorkflowContext", () => ({
  useToolWorkflowData: () => ({ toolAvailability: state.availability }),
}));
vi.mock("@editor/contexts/AppConfigContext", () => ({
  useAppConfig: () => ({ config: { premiumEnabled: false } }),
}));
vi.mock("@editor/hooks/useLocalProcessingOnly", () => ({
  useLocalProcessingOnly: () => true,
}));

const tool = {
  name: "Repair",
  component: () => null,
} as unknown as ToolRegistryEntry;

beforeEach(() => {
  state.availability = {};
});

it("hides tools unavailable on the local backend", () => {
  state.availability = {
    repair: { available: false, reason: "missingDependency" },
  };

  const { container } = render(
    <ToolButton
      id="repair"
      tool={tool}
      isSelected={false}
      onSelect={() => {}}
    />,
  );

  expect(container.firstChild).toBeNull();
});

it("keeps compact endpoint tools in place when the local backend disables them", () => {
  state.availability = {
    repair: { available: false, reason: "missingDependency" },
  };

  render(
    <ToolButton
      id="repair"
      tool={{ ...tool, endpoints: ["repair-pdf"] }}
      isSelected={false}
      onSelect={() => {}}
      showDescription
    />,
  );

  expect(screen.getByRole("button", { name: "Repair" })).toBeInTheDocument();
});

it("keeps compact recommendations mounted when endpoint loading hides them from the registry", () => {
  const { rerender } = render(
    <ToolButton
      id="repair"
      tool={{ ...tool, endpoints: ["repair-pdf"] }}
      isSelected={false}
      onSelect={() => {}}
      showDescription
    />,
  );

  state.availability = {
    repair: { available: false, reason: "missingDependency" },
  };
  rerender(
    <ToolButton
      id="repair"
      tool={{ ...tool, endpoints: ["repair-pdf"], hiddenFromToolList: true }}
      isSelected={false}
      onSelect={() => {}}
      showDescription
    />,
  );

  expect(screen.getByRole("button", { name: "Repair" })).toBeInTheDocument();
});

it("continues hiding pipeline-only tools from the compact list", () => {
  const { container } = render(
    <ToolButton
      id="classify"
      tool={{
        ...tool,
        component: null,
        endpoints: ["classify-and-label"],
        hiddenFromToolList: true,
      }}
      isSelected={false}
      onSelect={() => {}}
      showDescription
    />,
  );

  expect(container.firstChild).toBeNull();
});

it("keeps locally available tools in the picker", () => {
  state.availability = { repair: { available: true } };

  render(
    <ToolButton
      id="repair"
      tool={tool}
      isSelected={false}
      onSelect={() => {}}
    />,
  );

  expect(screen.getByRole("button", { name: "Repair" })).toBeInTheDocument();
});
