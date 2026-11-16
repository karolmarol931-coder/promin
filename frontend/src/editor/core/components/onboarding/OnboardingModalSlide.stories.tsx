import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import OnboardingModalSlide from "@editor/components/onboarding/OnboardingModalSlide";
import {
  SLIDE_DEFINITIONS,
  type SlideId,
  type SlideFactoryParams,
} from "@editor/components/onboarding/onboardingFlowConfig";
import {
  DEFAULT_RUNTIME_STATE,
  type OnboardingRuntimeState,
} from "@editor/components/onboarding/orchestrator/onboardingConfig";

/**
 * Every onboarding modal slide, rendered through the real
 * {@link OnboardingModalSlide} + {@link SLIDE_DEFINITIONS} so design changes
 * here reflect the production flow. Each story is one slide (or a meaningful
 * variant of one), including its hero, stepper and action buttons.
 */

// Sensible defaults for every slide factory; individual stories override the
// few fields their slide actually reads.
const BASE_PARAMS: SlideFactoryParams = {
  selectedRole: null,
  onRoleSelect: () => {},
  firstLoginUsername: "admin",
  onPasswordChanged: () => {},
  usingDefaultCredentials: false,
  onMfaSetupComplete: () => {},
};

interface SlideStageProps {
  slideId: SlideId;
  params?: Partial<SlideFactoryParams>;
  runtime?: Partial<OnboardingRuntimeState>;
  allowDismiss?: boolean;
  /**
   * Total steps in the flow. Defaults to 1 → a single standalone card with no
   * progress bar or step pill. Set > 1
   * only to demonstrate the stepped-flow treatment.
   */
  stepCount?: number;
  /** 0-based active step, used only when stepCount > 1. */
  stepIndex?: number;
}

function SlideStage({
  slideId,
  params,
  runtime,
  allowDismiss = true,
  stepCount = 1,
  stepIndex = 0,
}: SlideStageProps) {
  const merged: SlideFactoryParams = { ...BASE_PARAMS, ...params };
  // Live role selection so the SecurityCheck dropdown + its gated "Next" button
  // behave the same way they do in the real flow.
  const [selectedRole, setSelectedRole] = useState(merged.selectedRole);

  const definition = SLIDE_DEFINITIONS[slideId];
  const slideContent = definition.createSlide({
    ...merged,
    selectedRole,
    onRoleSelect: setSelectedRole,
  });

  const runtimeState: OnboardingRuntimeState = {
    ...DEFAULT_RUNTIME_STATE,
    ...runtime,
    selectedRole,
  };

  return (
    <OnboardingModalSlide
      slideDefinition={definition}
      slideContent={slideContent}
      runtimeState={runtimeState}
      modalSlideCount={stepCount}
      currentModalSlideIndex={stepIndex}
      onSkip={() => {}}
      onAction={() => {}}
      allowDismiss={allowDismiss}
    />
  );
}

const meta: Meta<typeof SlideStage> = {
  title: "Onboarding/Modal Slides",
  component: SlideStage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof SlideStage>;

/** Initial welcome slide with a rocket hero. */
export const Welcome: Story = { args: { slideId: "welcome" } };

/** The only stepped example: a multi-step flow shows the step pill + progress
 * bar. Every other story is a standalone single card (no steps). */
export const SteppedFlowExample: Story = {
  args: { slideId: "welcome", stepCount: 3, stepIndex: 1 },
};

/** Force a password change on first login (user types current + new). */
export const FirstLogin: Story = { args: { slideId: "first-login" } };

/** First login when the account is still on the default `stirling` password —
 * the current-password field is hidden. */
export const FirstLoginDefaultCredentials: Story = {
  args: {
    slideId: "first-login",
    params: { usingDefaultCredentials: true },
  },
};

/** Role confirmation — the "Next" button stays disabled until a role is picked. */
export const SecurityCheck: Story = { args: { slideId: "security-check" } };

/** Quick tour offer before dropping the user into the tools. */
export const TourOverview: Story = { args: { slideId: "tour-overview" } };

/** Two-factor setup (fetches a QR on mount; shows its error state without a
 * backend in Storybook). */
export const MfaSetup: Story = { args: { slideId: "mfa-setup" } };
