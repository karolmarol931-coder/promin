/**
 * OnboardingModalSlide
 *
 * Editor-flow adapter over the shared {@link OnboardingSlideShell}: maps a
 * SLIDE_DEFINITIONS entry (hero + buttons) and its resolved content onto the
 * shell so the editor onboarding renders the same card as every other flow.
 */

import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "@editor/ui/Icon";
import type {
  SlideDefinition,
  ButtonAction,
  ButtonDefinition,
} from "@editor/components/onboarding/onboardingFlowConfig";
import type { OnboardingRuntimeState } from "@editor/components/onboarding/orchestrator/onboardingConfig";
import type { SlideConfig } from "@editor/types/types";
import OnboardingSlideShell, {
  ShellHero,
  type ShellButton,
} from "@editor/components/onboarding/OnboardingSlideShell";
interface OnboardingModalSlideProps {
  slideDefinition: SlideDefinition;
  slideContent: SlideConfig;
  runtimeState: OnboardingRuntimeState;
  modalSlideCount: number;
  currentModalSlideIndex: number;
  onSkip: () => void;
  onAction: (action: ButtonAction) => void;
  allowDismiss?: boolean;
}

const HERO_ICON: Record<string, IconName> = {
  rocket: "rocket",
  shield: "shield-check",
  lock: "lock",
};

export default function OnboardingModalSlide({
  slideDefinition,
  slideContent,
  runtimeState,
  modalSlideCount,
  currentModalSlideIndex,
  onSkip,
  onAction,
  allowDismiss = true,
}: OnboardingModalSlideProps) {
  const { t } = useTranslation();
  const flowState = { selectedRole: runtimeState.selectedRole };

  const heroType = slideDefinition.hero.type;
  const hero = (
    <ShellHero>
      {HERO_ICON[heroType] ? (
        <Icon name={HERO_ICON[heroType]} size={30} />
      ) : null}
    </ShellHero>
  );

  const resolveLabel = (button: ButtonDefinition) => {
    const label = button.label ?? "";
    if (!label) return "";
    const fallback = label.split(".").pop() || label;
    return t(label, fallback);
  };

  const buttons: ShellButton[] = slideDefinition.buttons.map((button) => ({
    key: button.key,
    back: button.type === "icon",
    label: resolveLabel(button),
    primary: (button.variant ?? "secondary") === "primary",
    accent: button.accent,
    action: button.action,
    disabled: button.disabledWhen?.(flowState) ?? false,
  }));

  return (
    <OnboardingSlideShell
      hero={hero}
      slideKey={slideContent.key}
      title={slideContent.title}
      body={slideContent.body}
      stepIndex={currentModalSlideIndex}
      stepCount={modalSlideCount}
      buttons={buttons}
      onAction={(action) => onAction(action as ButtonAction)}
      onClose={onSkip}
      allowDismiss={allowDismiss}
    />
  );
}
