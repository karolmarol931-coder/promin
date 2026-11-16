import type { Meta, StoryObj } from "@storybook/react-vite";
import { NavFooter } from "@editor/components/shared/navFooter/NavFooter";

const meta: Meta<typeof NavFooter> = {
  title: "Shared/NavFooter",
  component: NavFooter,
  parameters: { layout: "padded" },
  args: {
    displayName: "Ada Lovelace",
    onOpenSettings: () => {},
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: "16.25rem",
          background: "var(--c-bg)",
          padding: "0.5rem",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NavFooter>;

export const Default: Story = {};

export const WithProfilePicture: Story = {
  args: { profilePictureUrl: "https://example.com/avatar.png" },
};

export const NoSettings: Story = {
  args: { onOpenSettings: undefined },
};

export const Collapsed: Story = {
  args: { collapsed: true },
  decorators: [
    (Story) => (
      <div
        style={{
          width: "3.5rem",
          background: "var(--c-bg)",
          padding: "0.5rem",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
