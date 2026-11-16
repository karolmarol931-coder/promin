import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
      title={t("onboarding.desktopWelcome.title", "Welcome to Promin")}
      body={t(
        "onboarding.desktopWelcome.body",
        "Your PDFs stay on this Mac. Promin processes documents using its local app and bundled services.",
      )}
      stepIndex={0}
      stepCount={1}
      buttons={buttons}
      onAction={finish}
      onClose={finish}
      allowDismiss
    />
  );
}
