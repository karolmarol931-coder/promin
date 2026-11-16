import PreferencesSection, {
  type PreferencesSectionProps,
} from "@editor-core/components/shared/config/configSections/preferences/PreferencesSection";
import { DefaultAppSettings } from "@editor/components/shared/config/configSections/DefaultAppSettings";
import { DefaultSaveLocationSettings } from "@editor/components/shared/config/configSections/DefaultSaveLocationSettings";

const GeneralSection = ({
  editorDefaultsSlot,
  ...props
}: PreferencesSectionProps) => (
  <PreferencesSection
    {...props}
    editorDefaultsSlot={
      <>
        {editorDefaultsSlot}
        <DefaultAppSettings />
      </>
    }
    downloadsSlot={<DefaultSaveLocationSettings />}
    hideAdminBanner
  />
);

export default GeneralSection;
