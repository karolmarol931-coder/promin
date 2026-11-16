import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import OnboardingSlideShell, {
  ShellHero,
  type ShellButton,
} from "@editor/components/onboarding/OnboardingSlideShell";

const ONBOARDING_KEY = "promin-desktop-onboarding-seen.v1";

export function DesktopOnboardingModal() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(ONBOARDING_KEY),
  );
  const buttons: ShellButton[] = useMemo(
    () => [
      {
        key: "welcome-start",
        label: t("onboarding.buttons.getStarted", "Get started"),
        primary: true,
        action: "start",
      },
    ],
    [t],
  );

  if (!visible) return null;

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
  };

  return (
    <OnboardingSlideShell
      opened
      hero={<ShellHero appIcon />}
      slideKey="desktop-local-welcome"
      title={
        <Trans
          i18nKey="onboarding.desktopWelcome.title"
          defaults="Welcome to Promin <product>Desktop</product>"
          components={{ product: <span /> }}
        />
      }
      body={
        <Trans
          i18nKey="onboarding.desktopWelcome.body"
          defaults="There's a whole host of new changes to explore, including <strong>Agent Chat</strong>, automatic document <strong>classification</strong>, and more."
          components={{ strong: <strong /> }}
        />
      }
      stepIndex={0}
      stepCount={1}
      buttons={buttons}
      onAction={finish}
      onClose={finish}
      allowDismiss
    />
  );
}
