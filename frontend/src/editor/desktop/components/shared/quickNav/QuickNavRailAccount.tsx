import { useTranslation } from "react-i18next";
import { Icon } from "@editor/ui/Icon";
import { RailButton } from "@editor-core/components/shared/quickNav/QuickNavRailBase";
import type { QuickNavRailAccountProps } from "@editor-core/components/shared/quickNav/QuickNavRailAccount";

export function QuickNavRailAccount({
  onOpen,
  active = false,
}: QuickNavRailAccountProps) {
  const { t } = useTranslation();
  const label = t("settings.title", "Settings");

  return (
    <RailButton
      label={label}
      icon={<Icon name="settings" size="1.125rem" />}
      current={active}
      testId="config-button"
      tourId="config-button"
      onClick={onOpen}
    />
  );
}
