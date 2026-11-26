import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SettingsCard } from "@editor/components/shared/config/SettingsCard";
import { AdminSetupBanner } from "@editor/components/shared/config/configSections/preferences/AdminSetupBanner";
import { AppearanceCard } from "@editor/components/shared/config/configSections/preferences/AppearanceCard";
import { EditorDefaultsCard } from "@editor/components/shared/config/configSections/preferences/EditorDefaultsCard";
import { DownloadsCard } from "@editor/components/shared/config/configSections/preferences/DownloadsCard";
import { HotkeysCard } from "@editor/components/shared/config/configSections/preferences/HotkeysCard";
import "@editor/components/shared/config/configSections/preferences/PreferencesSection.css";

export interface PreferencesSectionProps {
  /** Whether login is enforced by the host. */
  hideAdminBanner?: boolean;
  /**
   * The Account and Two-factor cards. Core has no accounts, so the flavors that
   * do pass them in (AccountCards) rather than core reaching into proprietary.
   * The slot supplies its own `<section>` wrappers and anchors.
   */
  accountSlot?: ReactNode;
  /** Extra rows under Editor defaults: login landing, desktop file defaults. */
  editorDefaultsSlot?: ReactNode;
  /** Extra controls in the Downloads card for platform-specific save preferences. */
  downloadsSlot?: ReactNode;
  /** Platform-provided local diagnostic tools. */
  diagnosticsSlot?: ReactNode;
}

/** True when the URL deep-links at the shortcuts card, which starts collapsed. */
function focusIsHotkeys(): boolean {
  const anchor = window.location.hash.replace(/^#/, "");
  return anchor === "hotkeys" || anchor.startsWith("setting-hotkeys");
}

/**
 * Everything you set for yourself, previously three nav rows (General, Keyboard
 * Shortcuts and Account). None of them saves through the admin API, so this page
 * has no draft and no save footer: every control writes as you touch it.
 *
 * The old General row was one unlabelled card of unrelated controls; it is split
 * into Appearance, Editor defaults and Downloads so each can
 * be linked to. Shortcuts stays last and collapsed: it renders a row per
 * registered tool and would otherwise bury everything above it.
 */
export default function PreferencesSection({
  hideAdminBanner = false,
  accountSlot,
  editorDefaultsSlot,
  downloadsSlot,
  diagnosticsSlot,
}: PreferencesSectionProps) {
  const { t } = useTranslation();
  const startHotkeysOpen = focusIsHotkeys();

  return (
    <div className="settings-section-container">
      <div className="preferences-section">
        {!hideAdminBanner && <AdminSetupBanner />}

        {accountSlot}

        <SettingsCard
          id="appearance"
          title={t("settings.preferences.appearance", "Appearance")}
        >
          <AppearanceCard />
        </SettingsCard>

        <SettingsCard
          id="editorDefaults"
          title={t("settings.preferences.editorDefaults", "Editor defaults")}
        >
          <EditorDefaultsCard />
          {editorDefaultsSlot}
        </SettingsCard>

        <SettingsCard
          id="downloads"
          title={t("settings.preferences.downloads", "Downloads")}
        >
          <DownloadsCard />
          {downloadsSlot}
        </SettingsCard>

        <SettingsCard
          id="hotkeys"
          title={t("settings.hotkeys.title", "Keyboard Shortcuts")}
          description={t(
            "settings.hotkeys.description",
            'Customize keyboard shortcuts for quick tool access. Click "Change shortcut" and press a new key combination. Press Esc to cancel.',
          )}
          // A row per registered tool, so it stays shut and unmounted until asked for.
          defaultCollapsed={!startHotkeysOpen}
          lazy
        >
          <HotkeysCard />
        </SettingsCard>

        {diagnosticsSlot && (
          <SettingsCard
            id="diagnostics"
            title={t("settings.diagnostics.title", "Diagnostics")}
          >
            {diagnosticsSlot}
          </SettingsCard>
        )}
      </div>
    </div>
  );
}
