import { useTranslation } from "react-i18next";
import { Icon } from "@editor/ui/Icon";
import { RailButton } from "@editor/components/shared/quickNav/QuickNavRailBase";
import type { QuickNavRailFooterExtensionsProps } from "@editor-core/components/shared/quickNav/QuickNavRailFooterExtensions";

export function QuickNavRailFooterExtensions({
  onOpenUpdates,
  updatesActive = false,
}: QuickNavRailFooterExtensionsProps) {
  const { t } = useTranslation();

  if (!onOpenUpdates) return null;

  return (
    <RailButton
      label={t("desktop.updates.label", "Updates and version")}
      icon={<Icon name="refresh-cw" size="1.125rem" />}
      current={updatesActive}
      testId="desktop-updates-button"
      onClick={onOpenUpdates}
    />
  );
}
