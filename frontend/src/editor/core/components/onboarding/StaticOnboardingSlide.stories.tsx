import type { Meta, StoryObj } from "@storybook/react-vite";
import StaticOnboardingSlide from "@editor/components/onboarding/StaticOnboardingSlide";
import { DEFAULT_RUNTIME_STATE } from "@editor/components/onboarding/orchestrator/onboardingConfig";

/**
 * Renders the "interrupt" onboarding modals — slides shown outside the normal
 * step flow for first-login password changes and required MFA setup.
 */
const meta = {
  title: "Onboarding/Static Onboarding Slide",
  component: StaticOnboardingSlide,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StaticOnboardingSlide>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Forced password change on first login with the default credentials. */
export const FirstLogin: Story = {
  args: {
    slideId: "first-login",
    runtimeState: {
      ...DEFAULT_RUNTIME_STATE,
      requiresPasswordChange: true,
      firstLoginUsername: "admin",
      usingDefaultCredentials: true,
    },
    params: {
      firstLoginUsername: "admin",
      onPasswordChanged: () => {},
      usingDefaultCredentials: true,
    },
    onSkip: () => {},
    onAction: () => {},
    allowDismiss: false,
  },
};

/** Two-factor setup, triggered when the account requires MFA. */
export const MfaSetup: Story = {
  args: {
    slideId: "mfa-setup",
    runtimeState: { ...DEFAULT_RUNTIME_STATE, requiresMfaSetup: true },
    params: { onMfaSetupComplete: () => {} },
    onSkip: () => {},
    onAction: () => {},
    allowDismiss: false,
  },
};
