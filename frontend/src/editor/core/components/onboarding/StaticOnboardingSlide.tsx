import OnboardingModalSlide from "@editor/components/onboarding/OnboardingModalSlide";
import {
  SLIDE_DEFINITIONS,
  type ButtonAction,
  type ButtonDefinition,
  type SlideFactoryParams,
  type SlideId,
} from "@editor/components/onboarding/onboardingFlowConfig";
import type { OnboardingRuntimeState } from "@editor/components/onboarding/orchestrator/onboardingConfig";

interface StaticOnboardingSlideProps {
  slideId: SlideId;
  runtimeState: OnboardingRuntimeState;
  onSkip: () => void;
  onAction: (action: ButtonAction) => void;
  allowDismiss?: boolean;
  /** Slide-specific createSlide params layered over the empty defaults. */
  params?: Partial<SlideFactoryParams>;
  /** Optional transform of the definition's buttons (e.g. drop a back button). */
  transformButtons?: (buttons: ButtonDefinition[]) => ButtonDefinition[];
}

/**
 * Renders first-login and required-MFA slides outside the normal step flow.
 * Keeping each slide in its own component gives its hooks a stable scope as
 * the active interrupt changes.
 */
export default function StaticOnboardingSlide({
  slideId,
  runtimeState,
  onSkip,
  onAction,
  allowDismiss,
  params,
  transformButtons,
}: StaticOnboardingSlideProps) {
  const base = SLIDE_DEFINITIONS[slideId];
  const definition = transformButtons
    ? { ...base, buttons: transformButtons(base.buttons) }
    : base;

  const slideContent = definition.createSlide({
    selectedRole: null,
    onRoleSelect: () => {},
    ...params,
  });

  return (
    <OnboardingModalSlide
      slideDefinition={definition}
      slideContent={slideContent}
      runtimeState={runtimeState}
      modalSlideCount={1}
      currentModalSlideIndex={0}
      onSkip={onSkip}
      onAction={onAction}
      allowDismiss={allowDismiss}
    />
  );
}
