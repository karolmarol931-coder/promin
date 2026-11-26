import PreferencesSection, {
  type PreferencesSectionProps,
} from "@editor-core/components/shared/config/configSections/preferences/PreferencesSection";
import { DefaultAppSettings } from "@editor/components/shared/config/configSections/DefaultAppSettings";
import { DefaultSaveLocationSettings } from "@editor/components/shared/config/configSections/DefaultSaveLocationSettings";
import { DiagnosticsCard } from "@editor/components/shared/config/configSections/DiagnosticsCard";

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
    diagnosticsSlot={<DiagnosticsCard />}
    hideAdminBanner
  />
);

export default GeneralSection;
