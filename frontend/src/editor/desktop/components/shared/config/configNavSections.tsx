import {
  extendPreferences,
  useConfigNavSections as useCoreConfigNavSections,
} from "@editor-core/components/shared/config/configNavSections";
import type { ConfigNavSection } from "@editor-core/components/shared/config/configNavSections";
import DesktopGeneralSection from "@editor/components/shared/config/configSections/GeneralSection";

export type {
  ConfigNavSection,
  ConfigNavItem,
} from "@editor-core/components/shared/config/configNavSections";

export const useConfigNavSections = (
  _isAdmin: boolean = false,
  _runningEE: boolean = false,
  _loginEnabled: boolean = false,
  onRequestClose: () => void = () => {},
  _showSettingsWhenNoLogin: boolean = false,
): ConfigNavSection[] => {
  const sections = useCoreConfigNavSections(
    false,
    false,
    false,
    onRequestClose,
    false,
  );
  return extendPreferences(
    sections.filter(
      (section) => section.id === "preferences" || section.id === "about",
    ),
    {},
    DesktopGeneralSection,
  );
};
