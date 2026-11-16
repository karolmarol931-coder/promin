import { useConfigNavSections } from "@editor/components/shared/config/configNavSections";
import type { SettingsNav } from "@editor/components/settings/settingsNavTypes";

export type { SettingsNav };

const LOCAL_SECTION_ALIASES: NonNullable<SettingsNav["aliases"]> = {
  help: "about",
  legal: "about",
  backendThirdPartyLicenses: "about",
  frontendThirdPartyLicenses: "about",
  hotkeys: "general",
  account: "general",
};

export function useSettingsNav(onLeave: () => void): SettingsNav {
  return {
    sections: useConfigNavSections(false, false, false, onLeave, false),
    aliases: LOCAL_SECTION_ALIASES,
    pending: false,
  };
}
