import PreferencesSection, {
  type PreferencesSectionProps,
} from "@editor-core/components/shared/config/configSections/preferences/PreferencesSection";
import { DefaultAppSettings } from "@editor/components/shared/config/configSections/DefaultAppSettings";

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
    hideAdminBanner
  />
);

export default GeneralSection;
