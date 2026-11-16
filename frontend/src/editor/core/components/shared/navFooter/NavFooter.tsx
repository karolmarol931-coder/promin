import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@mantine/core";
import { Icon } from "@editor/ui/Icon";
import { Avatar, NavSurface } from "@editor/ui";
import "@editor/components/shared/navFooter/NavFooter.css";

export interface NavFooterProps {
  displayName: string;
  profilePictureUrl?: string | null;
  onOpenSettings?: () => void;
  showAccount?: boolean;
  collapsed?: boolean;
  className?: string;
}

let hasPlayedEnter = false;

export function NavFooter({
  displayName,
  profilePictureUrl,
  onOpenSettings,
  showAccount = true,
  collapsed = false,
  className,
}: NavFooterProps) {
  const { t } = useTranslation();
  const [animate] = useState(() => {
    if (hasPlayedEnter) return false;
    hasPlayedEnter = true;
    return true;
  });

  if (!showAccount) return null;

  const settingsLabel = t("fileSidebar.openSettings", "Open settings");
  const accountLabel = onOpenSettings
    ? `${displayName} - ${settingsLabel}`
    : displayName;

  return (
    <NavSurface
      className={["nav-footer", className ?? ""].filter(Boolean).join(" ")}
      data-collapsed={collapsed || undefined}
      data-animate={animate || undefined}
    >
      <div className="nav-footer__slot">
        <Tooltip
          label={accountLabel}
          position="right"
          withinPortal
          disabled={!collapsed}
        >
          <button
            type="button"
            className="nav-footer__row nav-footer__account"
            onClick={onOpenSettings ? () => onOpenSettings() : undefined}
            disabled={!onOpenSettings}
            data-testid={onOpenSettings ? "config-button" : undefined}
            data-tour={onOpenSettings ? "config-button" : undefined}
            aria-label={accountLabel}
          >
            <span aria-hidden>
              <Avatar
                size="sm"
                name={displayName}
                src={profilePictureUrl ?? undefined}
              />
            </span>
            {!collapsed && (
              <span className="nav-footer__row-label sidebar-content-fade">
                {displayName}
              </span>
            )}
            {onOpenSettings && !collapsed && (
              <span className="nav-footer__trailing" aria-hidden>
                <Icon name="settings" size="1.1rem" />
              </span>
            )}
          </button>
        </Tooltip>
      </div>
    </NavSurface>
  );
}
